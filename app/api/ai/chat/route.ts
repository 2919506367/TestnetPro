import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";

const MAX_HISTORY_MESSAGES = 20;
const SUMMARIZE_THRESHOLD = 30;

function estimateTokens(text: string): number {
  const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const other = text.length - chinese;
  return Math.ceil(chinese * 1.2 + other * 0.25);
}

async function generateSummary(
  messages: { role: string; content: string }[],
  apiUrl: string,
  apiKey: string,
  modelT: string
): Promise<string | null> {
  if (messages.length === 0) return null;
  const convoText = messages
    .map((m) => `${m.role === "user" ? "用户" : "AI"}: ${m.content.substring(0, 200)}`)
    .join("\n");

  try {
    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: modelT,
        messages: [
          { role: "system", content: "你是一个摘要助手。请把以下对话压缩成一段 200 字以内的中文摘要，保留关键话题、重要信息和用户的核心需求。" },
          { role: "user", content: convoText },
        ],
        max_tokens: 400,
        temperature: 0.3,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.substring(0, 500) || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const userData = await prisma.user.findUnique({
    where: { id: userId },
    select: { banned: true, tokenQuota: true },
  });
  if (userData?.banned) return NextResponse.json({ error: "账号已被封禁" }, { status: 403 });
  if ((userData?.tokenQuota ?? 0) <= 0)
    return NextResponse.json({ error: "AI Token额度已用完，请使用CDK充值" }, { status: 429 });

  const { conversationId, message, providerId, context } = await request.json();
  const originalContent = String(message || "").trim();
  if (!originalContent) return NextResponse.json({ error: "请输入消息" }, { status: 400 });

  let apiUrl = "";
  let apiKey = "";
  let modelT = "";

  if (providerId) {
    const provider = await prisma.aiProvider.findFirst({
      where: { id: parseInt(providerId, 10), isActive: true },
    });
    if (provider) {
      apiUrl = provider.apiUrl;
      apiKey = provider.apiKey;
      modelT = provider.model;
    }
  }
  if (!apiKey) {
    const activeProvider = await prisma.aiProvider.findFirst({ where: { isActive: true } });
    if (activeProvider) {
      apiUrl = activeProvider.apiUrl;
      apiKey = activeProvider.apiKey;
      modelT = activeProvider.model;
    }
  }

  const hasApiKey = apiKey && apiKey.length > 3;

  let convId = conversationId ? parseInt(String(conversationId), 10) : null;
  if (convId) {
    const conv = await prisma.aIConversation.findUnique({ where: { id: convId } });
    if (!conv || conv.userId !== userId)
      return NextResponse.json({ error: "对话不存在" }, { status: 404 });
  }
  if (!convId) {
    const conv = await prisma.aIConversation.create({
      data: { userId, title: originalContent.substring(0, 30) },
    });
    convId = conv.id;
  }

  const searchContext = typeof context === "string" && context.length > 0 ? context : "";

  const historyMessages = await prisma.aIMessage.findMany({
    where: { conversationId: convId },
    orderBy: { createdAt: "asc" },
    take: MAX_HISTORY_MESSAGES,
  });

  const convData = await prisma.aIConversation.findUnique({
    where: { id: convId },
    select: { summary: true, lastSummarizedId: true },
  });

  const memories = await prisma.aIMemory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const chatMessages: { role: string; content: string }[] = [];

  if (searchContext) {
    chatMessages.push({
      role: "system",
      content: `【联网搜索结果】（仅用于本轮回答，不会保存到聊天记录）\n\n${searchContext}\n\n请基于以上搜索结果回答用户问题。优先使用搜索结果中的事实信息，在关键信息后标注来源编号如[来源1]。若搜索结果信息不足，可以结合你的知识进行补充。`,
    });
  }

  if (convData?.summary && !searchContext) {
    chatMessages.push({
      role: "system",
      content: `【历史对话摘要】\n${convData.summary}\n\n请记住以上是你们之前的对话概要，用户可能会引用之前讨论过的内容。`,
    });
  } else {
    chatMessages.push({
      role: "system",
      content: searchContext
        ? "你是一个联网搜索助手。"
        : "你是 Cloud Drive 的 AI 助手。请记住对话上下文，理解用户的追问、代词指代和省略表达。如果用户说\'刚才说的\'、\'那个\'、\'它\'等，请根据之前的对话来理解指代内容。用中文回答。",
    });
  }

  if (memories.length > 0 && !searchContext) {
    chatMessages.push({
      role: "system",
      content: `【用户要求你记住的信息（长期记忆）】\n${memories.map((m) => `- ${m.content}`).join("\n")}\n\n请在回答中适时参考以上信息。`,
    });
  }

  for (const msg of historyMessages) {
    if (msg.role === "user" || msg.role === "assistant") {
      chatMessages.push({ role: msg.role, content: msg.content });
    }
  }

  chatMessages.push({ role: "user", content: originalContent });

  const userInputTokens = estimateTokens(originalContent) + estimateTokens(searchContext);
  await prisma.aIMessage.create({
    data: { conversationId: convId, role: "user", content: originalContent },
  });

  const rememberMatch = originalContent.match(/(?:记住|记下|备忘)[：:]\s*(.+)/);
  if (rememberMatch) {
    const memContent = rememberMatch[1].trim().substring(0, 500);
    if (memContent) {
      await prisma.aIMemory.create({ data: { userId, content: memContent } });
    }
  }

  if (!hasApiKey) {
    const reply = simulateReply(originalContent);
    const replyTokens = estimateTokens(reply);
    const totalTokens = userInputTokens + replyTokens;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(JSON.stringify({ status: "thinking" }) + "\n"));
        const chars = reply.split("");
        let i = 0;
        function push() {
          if (i < chars.length) {
            controller.enqueue(encoder.encode(JSON.stringify({ content: chars[i] }) + "\n"));
            i++;
            setTimeout(push, i === 1 ? 500 : 15);
          } else {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  tokens: totalTokens,
                  remaining: Math.max(0, (userData?.tokenQuota ?? 10000) - totalTokens),
                }) + "\n"
              )
            );
            controller.enqueue(encoder.encode("[DONE]\n"));
            controller.close();
          }
        }
        push();
      },
    });

    prisma.aIMessage.create({
      data: { conversationId: convId, role: "assistant", content: reply },
    });
    prisma.aIConversation.update({
      where: { id: convId },
      data: { updatedAt: new Date() },
    });
    prisma.user.update({
      where: { id: userId },
      data: { tokenQuota: { decrement: totalTokens } },
    });
    prisma.aIUsageLog.create({ data: { userId, tokens: totalTokens } });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  try {
    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: modelT, messages: chatMessages, stream: true }),
    });

    if (!response.ok) throw new Error(`AI API error: ${response.status}`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    let fullReply = "";

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        controller.enqueue(encoder.encode(JSON.stringify({ status: "thinking" }) + "\n"));

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split("\n").filter((line) => line.startsWith("data: "));
            for (const line of lines) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                const replyTokens = estimateTokens(fullReply);
                const totalTokens = userInputTokens + replyTokens;
                const newQuota = Math.max(0, (userData?.tokenQuota ?? 10000) - totalTokens);

                controller.enqueue(
                  encoder.encode(
                    JSON.stringify({ tokens: totalTokens, remaining: newQuota }) + "\n"
                  )
                );
                controller.enqueue(encoder.encode("[DONE]\n"));

                if (fullReply) {
                  await prisma.aIMessage.create({
                    data: { conversationId: convId, role: "assistant", content: fullReply },
                  });
                }
                await prisma.aIConversation.update({
                  where: { id: convId },
                  data: { updatedAt: new Date() },
                });
                await prisma.user.update({
                  where: { id: userId },
                  data: { tokenQuota: newQuota },
                });
                await prisma.aIUsageLog.create({
                  data: { userId, model: modelT, tokens: totalTokens },
                });

                const totalMsgCount = await prisma.aIMessage.count({
                  where: { conversationId: convId },
                });
                if (
                  totalMsgCount > SUMMARIZE_THRESHOLD &&
                  !convData?.summary &&
                  hasApiKey
                ) {
                  generateAndSaveSummary(convId, apiUrl, apiKey, modelT);
                }

                controller.close();
                return;
              }
              try {
                const json = JSON.parse(data);
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) {
                  fullReply += delta;
                  controller.enqueue(
                    encoder.encode(JSON.stringify({ content: delta }) + "\n")
                  );
                }
              } catch {}
            }
          }
        } finally {
          if (fullReply) {
            const replyTokens = estimateTokens(fullReply);
            const totalTokens = userInputTokens + replyTokens;
            const newQuota = Math.max(0, (userData?.tokenQuota ?? 10000) - totalTokens);

            controller.enqueue(
              encoder.encode(
                JSON.stringify({ tokens: totalTokens, remaining: newQuota }) + "\n"
              )
            );
            controller.enqueue(encoder.encode("[DONE]\n"));

            await prisma.aIMessage.create({
              data: { conversationId: convId, role: "assistant", content: fullReply },
            });
            await prisma.aIConversation.update({
              where: { id: convId },
              data: { updatedAt: new Date() },
            });
            await prisma.user.update({
              where: { id: userId },
              data: { tokenQuota: newQuota },
            });
            await prisma.aIUsageLog.create({
              data: { userId, model: modelT, tokens: totalTokens },
            });
          }
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    const fallback = searchContext
      ? "当前无法获取实时联网结果，以下回答基于已有知识。\n\n" + simulateReply(originalContent)
      : simulateReply(originalContent);

    const fallbackTokens = estimateTokens(fallback);
    const totalTokens = userInputTokens + fallbackTokens;
    const newQuota = Math.max(0, (userData?.tokenQuota ?? 10000) - totalTokens);

    await prisma.aIMessage.create({
      data: { conversationId: convId, role: "assistant", content: fallback },
    });
    await prisma.aIConversation.update({
      where: { id: convId },
      data: { updatedAt: new Date() },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { tokenQuota: newQuota },
    });
    await prisma.aIUsageLog.create({ data: { userId, tokens: totalTokens } });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(JSON.stringify({ status: "thinking" }) + "\n"));
        setTimeout(() => {
          controller.enqueue(
            encoder.encode(JSON.stringify({ content: fallback }) + "\n")
          );
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ tokens: totalTokens, remaining: newQuota }) + "\n"
            )
          );
          controller.enqueue(encoder.encode("[DONE]\n"));
          controller.close();
        }, 800);
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }
}

async function generateAndSaveSummary(
  convId: number,
  apiUrl: string,
  apiKey: string,
  modelT: string
) {
  try {
    const allMessages = await prisma.aIMessage.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    if (allMessages.length < 10) return;

    const mid = Math.floor(allMessages.length / 2);
    const earlyMessages = allMessages.slice(0, mid);
    const lastEarlyMsg = earlyMessages[earlyMessages.length - 1];

    const summary = await generateSummary(
      earlyMessages.map((m) => ({ role: m.role, content: m.content })),
      apiUrl,
      apiKey,
      modelT
    );

    if (summary) {
      await prisma.aIConversation.update({
        where: { id: convId },
        data: {
          summary,
          summaryTokens: estimateTokens(summary),
          lastSummarizedId: lastEarlyMsg.id,
        },
      });
      console.log(`[Chat Memory] Summary generated for conversation ${convId}, ${summary.length} chars`);
    }
  } catch (err) {
    console.error("[Chat Memory] Summary generation failed:", err);
  }
}

function simulateReply(input: string): string {
  const replies = [
    "这是一个很好的问题！让我来帮你分析一下。基于你提供的信息，我建议你可以从以下几个方面考虑。",
    "感谢你的提问！根据当前的情况，这里有一些建议供你参考。",
    "我理解你的疑问。让我为你详细解答这个问题。",
    "好的，我明白了你的需求。让我为你提供一些有用的信息。",
  ];
  const base = replies[Math.floor(Math.random() * replies.length)];
  return base + "\n\n如果你还有其他问题，随时可以问我。";
}

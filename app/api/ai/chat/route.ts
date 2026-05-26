import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";

const CONTEXT_BUDGET = 8000;
const SUMMARIZE_INTERVAL = 12;
const SUMMARIZE_TRIGGER = 20;

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
    .map((m) => `${m.role === "user" ? "用户" : "AI"}: ${m.content.substring(0, 300)}`)
    .join("\n");

  try {
    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: modelT,
        messages: [
          { role: "system", content: "你是一个对话摘要助手。请将以下对话压缩成一段300字以内的中文摘要，保留：1)关键话题和结论 2)用户的偏好和需求 3)未解决的问题。不要遗漏重要细节。" },
          { role: "user", content: convoText },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });
    if (!response.ok) {
      console.error("[Summary] API failed:", response.status);
      return null;
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.substring(0, 600) || null;
  } catch (err) {
    console.error("[Summary] Exception:", err);
    return null;
  }
}

function assembleMessagesWithBudget(
  history: { role: string; content: string }[],
  summary: string | null,
  memories: string[],
  currentMessage: string,
  searchContext: string,
  budget: number
): { role: string; content: string }[] {
  const result: { role: string; content: string }[] = [];

  if (searchContext) {
    const sc = `【联网搜索结果】（仅用于本轮回答，不会保存到聊天记录）\n\n${searchContext}\n\n请基于以上搜索结果回答用户问题。优先使用搜索结果中的事实信息，在关键信息后标注来源编号如[来源1]。`;
    result.push({ role: "system", content: sc });
    budget -= estimateTokens(sc);
  }

  const systemPrompt = searchContext
    ? "你是一个联网搜索助手。"
    : "你是 Cloud Drive 的 AI 助手。请牢记对话上下文，理解用户的追问、代词指代（'刚才说的'、'那个'、'它'）和省略表达。用中文作答。";
  result.push({ role: "system", content: systemPrompt });
  budget -= estimateTokens(systemPrompt);

  if (summary && !searchContext) {
    const sumText = `【历史对话摘要】\n${summary}\n\n（以上是你们之前的对话概要，用户可能会引用之前讨论过的内容。）`;
    result.push({ role: "system", content: sumText });
    budget -= estimateTokens(sumText);
  }

  if (memories.length > 0 && !searchContext) {
    const memText = `【用户要求你记住的信息】\n${memories.map((m) => `- ${m}`).join("\n")}\n\n（请在回答中适时参考以上信息。）`;
    result.push({ role: "system", content: memText });
    budget -= estimateTokens(memText);
  }

  const curTokens = estimateTokens(currentMessage);
  const budgetForHistory = budget - curTokens;

  let historyTokens = 0;
  const selectedHistory: typeof history = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    const tok = estimateTokens(msg.content);
    if (historyTokens + tok <= budgetForHistory) {
      historyTokens += tok;
      selectedHistory.unshift(msg);
    } else {
      break;
    }
  }

  for (const msg of selectedHistory) {
    result.push({ role: msg.role, content: msg.content });
  }

  result.push({ role: "user", content: currentMessage });

  return result;
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

  const convData = await prisma.aIConversation.findUnique({
    where: { id: convId },
    select: { summary: true, lastSummarizedId: true },
  });

  const allRecentMessages = await prisma.aIMessage.findMany({
    where: { conversationId: convId },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  const recentMessages = allRecentMessages.reverse();

  const memories = await prisma.aIMemory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const memoryContents = memories.map((m) => m.content);

  const chatMessages = assembleMessagesWithBudget(
    recentMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    convData?.summary || null,
    memoryContents,
    originalContent,
    searchContext,
    CONTEXT_BUDGET
  );

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
    return errorStream("AI 配置错误：未找到可用的 AI 模型，请联系管理员配置 API Key。", 502);
  }

  try {
    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: modelT, messages: chatMessages, stream: true, thinking: { type: "enabled" } }),
    });

    if (!response.ok) {
      let errorDetail = "";
      try {
        const errBody = await response.text();
        const parsed = JSON.parse(errBody);
        errorDetail = parsed?.error?.message || parsed?.error?.code || parsed?.msg || "";
      } catch {}
      throw new Error(`AI API error: ${response.status}${errorDetail ? ": " + errorDetail : ""}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    let fullReply = "";
    let fullReasoning = "";
    let startedAnswer = false;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder("utf-8", { stream: true } as any);
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
                  const saved = await prisma.aIMessage.create({
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

                  const totalMsgCount = await prisma.aIMessage.count({
                    where: { conversationId: convId },
                  });

                  if (hasApiKey && saved) {
                    handleRollingSummary(
                      convId,
                      apiUrl,
                      apiKey,
                      modelT,
                      convData?.summary || null,
                      convData?.lastSummarizedId || null,
                      saved.id,
                      totalMsgCount
                    );
                  }
                }

                controller.close();
                return;
              }
              try {
                const json = JSON.parse(data);
                const delta = json.choices?.[0]?.delta;
                if (!delta) continue;
                const reasoningChunk = delta.reasoning_content;
                const contentChunk = delta.content;
                if (reasoningChunk && !startedAnswer) {
                  fullReasoning += reasoningChunk;
                  controller.enqueue(
                    encoder.encode(JSON.stringify({ reasoning: reasoningChunk }) + "\n")
                  );
                }
                if (contentChunk) {
                  if (!startedAnswer) {
                    startedAnswer = true;
                    controller.enqueue(
                      encoder.encode(JSON.stringify({ reasoning_end: true }) + "\n")
                    );
                  }
                  fullReply += contentChunk;
                  controller.enqueue(
                    encoder.encode(JSON.stringify({ content: contentChunk }) + "\n")
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
  } catch (e: any) {
    const errMsg = e?.message || String(e);
    const codeMatch = errMsg.match(/(\d{3})/);
    const statusCode = codeMatch ? parseInt(codeMatch[1]) : 502;
    const displayMsg = statusCode === 401 || statusCode === 403
      ? `AI API 认证失败 (${statusCode})：请检查 API Key 是否有效`
      : statusCode === 429
      ? `AI API 限流 (429)：请求过于频繁，请稍后重试`
      : statusCode >= 500
      ? `AI API 服务器错误 (${statusCode})：上游服务暂不可用，请稍后重试`
      : statusCode >= 400
      ? `AI API 请求错误 (${statusCode})`
      : `AI API 调用失败：${errMsg.substring(0, 100)}`;

    return errorStream(displayMsg, statusCode);
  }
}

async function handleRollingSummary(
  convId: number,
  apiUrl: string,
  apiKey: string,
  modelT: string,
  existingSummary: string | null,
  lastSummarizedId: number | null,
  latestMsgId: number,
  totalMsgCount: number
) {
  try {
    const msgsSinceLastSummary = lastSummarizedId
      ? await prisma.aIMessage.findMany({
          where: { conversationId: convId, id: { gt: lastSummarizedId } },
          orderBy: { createdAt: "asc" },
        })
      : [];

    const newMsgCount = msgsSinceLastSummary.length;

    if (!existingSummary && totalMsgCount >= SUMMARIZE_TRIGGER) {
      const earlyMsgs = await prisma.aIMessage.findMany({
        where: { conversationId: convId },
        orderBy: { createdAt: "asc" },
        take: Math.floor(totalMsgCount * 0.6),
      });

      if (earlyMsgs.length < 10) return;

      const summary = await generateSummary(
        earlyMsgs.map((m) => ({ role: m.role, content: m.content })),
        apiUrl,
        apiKey,
        modelT
      );

      if (summary) {
        const lastEarlyId = earlyMsgs[earlyMsgs.length - 1].id;
        await prisma.aIConversation.update({
          where: { id: convId },
          data: {
            summary,
            summaryTokens: estimateTokens(summary),
            lastSummarizedId: lastEarlyId,
          },
        });
      }
      return;
    }

    if (existingSummary && newMsgCount >= SUMMARIZE_INTERVAL) {
      const summaryInput = existingSummary
        ? [
            { role: "system", content: "以下是之前的对话摘要。请将新增内容融入其中，生成一个更新后的完整摘要。" },
            { role: "assistant", content: existingSummary },
          ]
        : [];
      summaryInput.push(...msgsSinceLastSummary.map((m) => ({ role: m.role, content: m.content })));

      const updatedSummary = await generateSummary(summaryInput, apiUrl, apiKey, modelT);

      if (updatedSummary) {
        await prisma.aIConversation.update({
          where: { id: convId },
          data: {
            summary: updatedSummary,
            summaryTokens: estimateTokens(updatedSummary),
            lastSummarizedId: latestMsgId,
          },
        });
      }
    }
  } catch (err) {
    console.error("[Chat Memory] Rolling summary failed:", err);
  }
}

function errorStream(errorMsg: string, statusCode?: number): NextResponse {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(JSON.stringify({ status: "error", error: errorMsg, code: statusCode || 502 }) + "\n"));
      controller.enqueue(encoder.encode("[DONE]\n"));
      controller.close();
    },
  });
  return new NextResponse(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}



const MAX_CONTEXT_CHARS = 3000;

export function compressContext(articles: { title: string; text: string; url: string }[]): string {
  if (articles.length === 0) return "";

  const parts: string[] = [];
  let totalChars = 0;

  for (let i = 0; i < articles.length; i++) {
    const a = articles[i];
    const remaining = MAX_CONTEXT_CHARS - totalChars;
    if (remaining <= 0) break;

    const allocated = Math.floor(remaining / (articles.length - i));
    const title = `[来源${i + 1}] ${a.title}\n链接: ${a.url}\n`;
    const bodyLimit = Math.max(100, allocated - title.length);
    const body = a.text.substring(0, bodyLimit);

    parts.push(title + body);
    totalChars += title.length + body.length;
  }

  return parts.join("\n\n");
}

export function buildAIPrompt(userQuestion: string, compressed: string): string {
  if (!compressed) return userQuestion;

  return (
    `以下是用户提问的实时联网搜索结果，已提取网页正文供你参考。\n` +
    `请基于以下搜索结果回答用户问题，优先使用搜索结果中的事实信息。\n` +
    `如果搜索结果信息不足，可以结合你的知识补充。\n\n` +
    `=== 搜索结果（网页正文） ===\n` +
    compressed +
    `\n=== 搜索结果结束 ===\n\n` +
    `用户问题：${userQuestion}\n\n` +
    `请用中文回答，在关键信息后标注来源编号如[来源1]。`
  );
}

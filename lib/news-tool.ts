import { getCache, setCache } from "./search-cache";
import { buildAIPrompt } from "./text-compressor";

interface HotItem {
  title: string;
  url: string;
  snippet: string;
}

export async function handleNewsQuery(query: string): Promise<string | null> {
  const cached = getCache<string>("news:toutiao");
  if (cached) return cached;

  // Try top-level dynamic import for toutiao
  let items: HotItem[] = [];

  try {
    const { fetchToutiaoHot } = await import("./search-engine");
    items = await fetchToutiaoHot();
  } catch {
    return null;
  }

  if (items.length === 0) return null;

  const articles = items.slice(0, 10).map((item, i) => ({
    title: `${i + 1}. ${item.title}`,
    url: item.url,
    text: item.snippet || "",
  }));

  const result = `以下是今日头条热点新闻（共${articles.length}条），请根据这些信息为用户进行汇总：\n\n` +
    articles.map(a => `${a.title}\n链接: ${a.url}\n${a.text}`).join("\n\n");

  setCache("news:toutiao", result, 10);
  return result;
}

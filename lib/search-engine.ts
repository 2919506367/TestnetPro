import axios from "axios";
import * as cheerio from "cheerio";
import { getCache, setCache } from "./search-cache";

export interface SearchLink {
  title: string;
  url: string;
  snippet: string;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  const t = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), ms)
  );
  return Promise.race([p, t]);
}

export async function multiSourceSearch(query: string): Promise<SearchLink[]> {
  const sources = [
    { name: "sogou", fn: searchSogou },
    { name: "baidu", fn: searchBaidu },
  ];

  const results = await Promise.allSettled(
    sources.map((s) => {
      if (getCache<SearchLink[]>(`search:${s.name}:${query}`)) {
        return Promise.resolve(getCache<SearchLink[]>(`search:${s.name}:${query}`)!);
      }
      return withTimeout(s.fn(query), 8000).then((r) => {
        setCache(`search:${s.name}:${query}`, r, 5);
        return r;
      });
    })
  );

  const raw: SearchLink[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const item of r.value) {
      const key = item.url || item.title;
      if (!seen.has(key)) { seen.add(key); raw.push(item); }
    }
  }

  return normalizeSearchResults(raw).slice(0, 5);
}

export function normalizeSearchResults(results: SearchLink[]): SearchLink[] {
  const BLOCK_DOMAINS = [
    "sogou.com/link", "baidu.com/link", "baidu.com/s?",
    "zhihu.com/signin", "login", "signin", "accounts.google",
  ];

  const PREFERRED_DOMAINS = [
    "wikipedia.org", "zhihu.com", "csdn.net", "cnblogs.com",
    "jianshu.com", "infoq.cn", "36kr.com", "ithome.com",
    "thepaper.cn", "sina.com.cn", "qq.com", "163.com",
    "sohu.com", "people.com.cn", "china.com.cn",
  ];

  return results
    .map((r) => {
      let url = r.url;
      // Clean Baidu redirect URLs
      const baiduMu = url.match(/mu=([^&]+)/);
      if (baiduMu) url = decodeURIComponent(baiduMu[1]);

      // Clean Sogou redirect
      const sogouUrl = url.match(/url=([^&]+)/);
      if (sogouUrl && url.includes("sogou.com")) url = decodeURIComponent(sogouUrl[1]);

      return { ...r, url };
    })
    .filter((r) => {
      if (!r.url.startsWith("http")) return false;
      for (const b of BLOCK_DOMAINS) {
        if (r.url.includes(b)) return false;
      }
      if (r.title.length < 2) return false;
      return true;
    })
    .sort((a, b) => {
      const prefA = PREFERRED_DOMAINS.some((d) => a.url.includes(d)) ? 0 : 1;
      const prefB = PREFERRED_DOMAINS.some((d) => b.url.includes(d)) ? 0 : 1;
      return prefA - prefB;
    });
}

// =========== 搜狗搜索 ===========
async function searchSogou(query: string): Promise<SearchLink[]> {
  const url = `https://www.sogou.com/web?query=${encodeURIComponent(query)}`;
  const { data } = await axios.get(url, {
    headers: { "User-Agent": UA, "Accept-Language": "zh-CN,zh;q=0.9" },
    timeout: 8000,
  });
  const $ = cheerio.load(data);
  const results: SearchLink[] = [];

  $(".results .rb, .vrwrap, .result").each((_, el) => {
    const $el = $(el);
    const $a = $el.find("h3 a, .pt a, a").first();
    const title = $a.text().trim();
    const href = $a.attr("href") || "";
    const snippet = $el.find(".str-text, .space-txt, .star-wiki, p").first().text().trim();
    if (title && href) {
      results.push({ title: title.substring(0, 100), url: href, snippet: snippet.substring(0, 200) });
    }
    if (results.length >= 5) return false;
  });
  return results;
}

// =========== 百度搜索 ===========
async function searchBaidu(query: string): Promise<SearchLink[]> {
  const url = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}&ie=utf-8`;
  const { data } = await axios.get(url, {
    headers: { "User-Agent": UA, "Accept-Language": "zh-CN,zh;q=0.9" },
    timeout: 8000,
  });
  const $ = cheerio.load(data);
  const results: SearchLink[] = [];

  $(".result, .c-container").each((_, el) => {
    const $el = $(el);
    const $a = $el.find("h3 a, .t a").first();
    const title = $a.text().trim();
    let href = $a.attr("href") || "";
    const snippet = $el.find(".c-abstract, .c-span-last p, .content-right_8Zs40").first().text().trim();
    if (title && href) {
      results.push({ title: title.substring(0, 100), url: href, snippet: snippet.substring(0, 200) });
    }
    if (results.length >= 5) return false;
  });
  return results;
}

// =========== 今日头条热点 ===========
export async function fetchToutiaoHot(): Promise<SearchLink[]> {
  const cached = getCache<SearchLink[]>("toutiao:hot");
  if (cached) return cached;

  try {
    const { data } = await axios.get(
      "https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc",
      { headers: { "User-Agent": UA }, timeout: 8000 }
    );
    const json = typeof data === "string" ? JSON.parse(data) : data;
    const items: SearchLink[] = [];
    for (const item of (json.data || []).slice(0, 10)) {
      const title = item.Title || item.title || "";
      const url = item.Url || item.url || "";
      if (title) {
        items.push({ title: String(title).substring(0, 100), url: String(url), snippet: `热度: ${item.HotValue || ""}` });
      }
    }
    setCache("toutiao:hot", items, 10);
    return items;
  } catch {
    return [];
  }
}

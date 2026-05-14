import axios from "axios";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { getCache, setCache } from "./search-cache";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export interface FetchedArticle {
  title: string;
  text: string;
  url: string;
  score: number;
}

export async function fetchAndExtractArticles(
  urls: string[],
  maxArticles: number = 3
): Promise<FetchedArticle[]> {
  const toFetch = urls.slice(0, Math.min(urls.length, 5));

  const results = await Promise.allSettled(
    toFetch.map((url) => {
      const cached = getCache<FetchedArticle>(`fetch:${url}`);
      if (cached) return Promise.resolve(cached);
      return fetchAndExtract(url);
    })
  );

  const articles: FetchedArticle[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      const a = r.value;
      if (a.score >= 2 && a.text.length >= 200) {
        articles.push(a);
        setCache(`fetch:${a.url}`, a, 15);
      }
    }
  }

  return articles.sort((a, b) => b.score - a.score).slice(0, maxArticles);
}

async function fetchAndExtract(url: string): Promise<FetchedArticle | null> {
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": UA, "Accept-Language": "zh-CN,zh;q=0.9" },
      timeout: 8000,
      maxRedirects: 3,
      responseType: "text",
    });

    const html = typeof data === "string" ? data : String(data);
    if (html.length < 200) return null;

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document, { charThreshold: 50 });
    const article = reader.parse();

    if (!article || !article.textContent) return null;

    const text = cleanText(article.textContent);
    if (text.length < 200) return null;

    const score = qualityScore({ title: article.title || url, text, url });

    return { title: article.title || url, text, url, score };
  } catch {
    return null;
  }
}

function qualityScore(article: { title: string; text: string; url: string }): number {
  let score = 0;

  const len = article.text.length;
  if (len >= 2000) score += 4;
  else if (len >= 1000) score += 3;
  else if (len >= 500) score += 2;
  else if (len >= 200) score += 1;

  const chineseChars = (article.text.match(/[\u4e00-\u9fff]/g) || []).length;
  const chineseRatio = chineseChars / Math.max(1, len);
  if (chineseRatio > 0.3) score += 3;
  else if (chineseRatio > 0.1) score += 1;

  if (article.title && article.title.length > 3) score += 1;

  // Penalty for garbage signs
  const garbageSigns = [/广告/, /推广/, /扫码/, /关注.*公众号/, /点击.*下载/];
  for (const g of garbageSigns) {
    if (g.test(article.text)) score -= 1;
  }

  const noiseRatio = (article.text.match(/[\x00-\x08\x0b\x0c\x0e-\x1f\uFFFD]/g) || []).length / Math.max(1, len);
  if (noiseRatio > 0.05) score -= 2;

  return Math.max(0, score);
}

function cleanText(text: string): string {
  return text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\u200B/g, "")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
    .trim();
}

import { NextRequest, NextResponse } from "next/server";
import { detectQueryType } from "@/lib/search-router";
import { handleTimeQuery } from "@/lib/time-tool";
import { handleNewsQuery } from "@/lib/news-tool";
import { multiSourceSearch } from "@/lib/search-engine";
import { fetchAndExtractArticles } from "@/lib/web-fetcher";
import { compressContext, buildAIPrompt } from "@/lib/text-compressor";

export async function POST(request: NextRequest) {
  const t0 = Date.now();
  const q = ((await request.json()).q || "").trim();
  if (!q) return NextResponse.json({ context: "", articles: [], links: [], queryType: "normal" });

  const queryType = detectQueryType(q);
  let context = "";
  let articles: Record<string, unknown>[] = [];
  let links: { title: string; url: string; snippet: string }[] = [];
  let fetchTime = 0;

  try {
    if (queryType === "time") {
      const answer = handleTimeQuery(q);
      context = answer;
      fetchTime = Date.now() - t0;
    } else if (queryType === "news") {
      const newsCtx = await handleNewsQuery(q);
      context = newsCtx || "";
      fetchTime = Date.now() - t0;
    } else if (queryType === "web") {
      const searchLinks = await multiSourceSearch(q);
      links = searchLinks;
      if (searchLinks.length > 0) {
        const fetched = await fetchAndExtractArticles(searchLinks.map((l) => l.url), 3);
        articles = fetched.map((a) => ({ title: a.title, text: a.text.substring(0, 500), url: a.url }));
        if (fetched.length > 0) {
          context = buildAIPrompt(q, compressContext(fetched));
        }
      }
      fetchTime = Date.now() - t0;
    }
    // "normal" → context stays empty, no web search needed
  } catch {
    context = "";
    fetchTime = Date.now() - t0;
  }

  // Log for debugging
  console.log(
    `[AI Search] q="${q.substring(0, 40)}" type=${queryType} links=${links.length} articles=${articles.length} chars=${context.length} time=${fetchTime}ms`
  );

  return NextResponse.json({ context, articles, links, queryType, fetchTime });
}

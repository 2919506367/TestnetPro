import { NextRequest, NextResponse } from "next/server";
import { biliFetch, mapVideo, shuffleArray } from "@/lib/bilibili";

const SOURCES = [
  { path: "/x/web-interface/popular", name: "hot", maxPages: 10 },
  { path: "/x/web-interface/ranking/v2", name: "rank", maxPages: 1 },
];

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const seed = parseInt(url.searchParams.get("seed") || String(Date.now()), 10);
  const exclude = (url.searchParams.get("exclude") || "").split(",").filter(Boolean);
  const size = Math.min(8, Math.max(3, parseInt(url.searchParams.get("size") || "5", 10)));

  try {
    const src = SOURCES[seed % SOURCES.length];
    const page = (seed * 7 + 1) % src.maxPages + 1;
    const ps = src.name === "rank" ? 10 : 50;

    const data = await biliFetch(
      `${src.path}?pn=${page}&ps=${ps}`,
      "https://www.bilibili.com"
    );

    if (!data || data.code !== 0) {
      return NextResponse.json({ videos: [], source: "error", nextSeed: seed + 1 });
    }

    const rawList: Record<string, unknown>[] =
      data.data?.list || data.data?.archives || data.data || [];

    const videos = rawList
      .filter((v) => !exclude.includes(String(v.bvid || "")))
      .map(mapVideo);

    const shuffled = shuffleArray(videos, seed);
    const result = shuffled.slice(0, size);

    return NextResponse.json({
      videos: result,
      source: `bilibili_${src.name}_p${page}`,
      seed,
      nextSeed: seed + 1,
      hasMore: result.length >= size,
    });
  } catch {
    return NextResponse.json({ videos: [], source: "error", nextSeed: seed + 1 });
  }
}

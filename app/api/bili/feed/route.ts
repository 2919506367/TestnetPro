import { NextRequest, NextResponse } from "next/server";
import { biliFetch, mapVideo, shuffleArray } from "@/lib/bilibili";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const seed = parseInt(url.searchParams.get("seed") || String(Date.now()), 10);
  const exclude = (url.searchParams.get("exclude") || "").split(",").filter(Boolean);
  const size = Math.min(8, Math.max(3, parseInt(url.searchParams.get("size") || "5", 10)));

  try {
    const popularData = await biliFetch(
      `/x/web-interface/popular?pn=1&ps=50`,
      "https://www.bilibili.com"
    );

    if (!popularData || popularData.code !== 0) {
      return NextResponse.json({ videos: [], source: "error", nextSeed: seed + 1 });
    }

    const rawList: Record<string, unknown>[] = popularData.data?.list || [];
    const videos = rawList
      .filter((v) => !exclude.includes(String(v.bvid || "")))
      .map(mapVideo);

    const shuffled = shuffleArray(videos, seed);
    const result = shuffled.slice(0, size);

    return NextResponse.json({
      videos: result,
      source: "bilibili_hot",
      seed,
      nextSeed: seed + 1,
      hasMore: result.length >= size,
    });
  } catch {
    return NextResponse.json({ videos: [], source: "error", nextSeed: seed + 1 });
  }
}

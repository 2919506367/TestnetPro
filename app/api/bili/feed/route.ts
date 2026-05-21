import { NextRequest, NextResponse } from "next/server";
import { biliFetch, mapVideo, shuffleArray } from "@/lib/bilibili";

const REGION_IDS = [1, 3, 4, 5, 36, 119, 129, 155, 160, 165, 181, 188];

function pickSource(seed: number) {
  const pool = [
    // Random hot videos: rotate pages 1-10 of popular
    () => ({
      path: `/x/web-interface/popular?pn=${(seed * 3 + 1) % 10 + 1}&ps=50`,
      name: "hot",
    }),
    // Random v2 hot videos
    () => ({
      path: `/x/web-interface/popular?pn=${(seed * 5 + 7) % 10 + 1}&ps=50`,
      name: "hot_v2",
    }),
    // Random category videos: rotate region IDs for variety
    () => {
      const rid = REGION_IDS[seed % REGION_IDS.length];
      return {
        path: `/x/web-interface/dynamic/region?rid=${rid}&pn=1&ps=50`,
        name: `region_${rid}`,
      };
    },
  ];
  const fn = pool[seed % pool.length];
  return fn();
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const seed = parseInt(url.searchParams.get("seed") || String(Date.now()), 10);
  const exclude = (url.searchParams.get("exclude") || "").split(",").filter(Boolean);
  const size = Math.min(24, Math.max(3, parseInt(url.searchParams.get("size") || "8", 10)));

  try {
    const src = pickSource(seed);

    const data = await biliFetch(src.path, "https://www.bilibili.com");

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
      source: `bili_${src.name}`,
      seed,
      nextSeed: seed + 1,
      hasMore: result.length >= size,
    });
  } catch {
    return NextResponse.json({ videos: [], source: "error", nextSeed: seed + 1 });
  }
}

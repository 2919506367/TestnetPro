import { NextRequest, NextResponse } from "next/server";
import { biliFetch, formatCount, formatDuration, mapVideo } from "@/lib/bilibili";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const bvid = url.searchParams.get("bvid");
  if (!bvid) return NextResponse.json({ error: "缺少bvid" }, { status: 400 });

  try {
    const data = await biliFetch(`/x/web-interface/archive/related?bvid=${bvid}`);
    if (!data || data.code !== 0) {
      return NextResponse.json({ videos: [] });
    }

    const list: any[] = data.data || [];
    const videos = list.map((raw) => {
      const stat = raw.stat || {};
      const owner = raw.owner || {};
      return {
        id: raw.bvid || "",
        bvid: raw.bvid || "",
        aid: raw.aid || 0,
        cid: raw.cid || 0,
        title: raw.title || "",
        author: owner.name || "",
        cover: raw.pic || "",
        playCount: formatCount(stat.view || 0),
        duration: formatDuration(raw.duration || 0),
        durationSec: raw.duration || 0,
      };
    });

    return NextResponse.json({ videos });
  } catch {
    return NextResponse.json({ videos: [] });
  }
}

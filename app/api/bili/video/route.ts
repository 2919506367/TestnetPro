import { NextRequest, NextResponse } from "next/server";
import { biliFetch, formatCount, formatDuration } from "@/lib/bilibili";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const bvid = url.searchParams.get("bvid");
  if (!bvid) return NextResponse.json({ error: "缺少bvid" }, { status: 400 });

  try {
    const data = await biliFetch(`/x/web-interface/view?bvid=${bvid}`);
    if (!data || data.code !== 0) {
      return NextResponse.json({ error: data?.message || "获取失败" }, { status: 404 });
    }

    const d = data.data as Record<string, unknown>;
    const stat = (d.stat as Record<string, number>) || {};
    const owner = (d.owner as Record<string, unknown>) || {};

    return NextResponse.json({
      bvid: String(d.bvid || bvid),
      aid: Number(d.aid || 0),
      cid: Number(d.cid || 0),
      title: String(d.title || ""),
      cover: String(d.pic || ""),
      description: String(d.desc || ""),
      duration: formatDuration(Number(d.duration || 0)),
      durationSec: Number(d.duration || 0),
      author: String(owner.name || ""),
      authorMid: Number(owner.mid || 0),
      authorFace: String(owner.face || ""),
      playCount: formatCount(stat.view || 0),
      likeCount: formatCount(stat.like || 0),
      coinCount: formatCount(stat.coin || 0),
      favoriteCount: formatCount(stat.favorite || 0),
      shareCount: formatCount(stat.share || 0),
      danmakuCount: formatCount(stat.danmaku || 0),
      replyCount: formatCount(stat.reply || 0),
      pubdate: Number(d.pubdate || 0),
      pages: Number((d.videos || 1)),
    });
  } catch {
    return NextResponse.json({ error: "获取视频详情失败" }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { biliFetch, formatCount, formatDuration } from "@/lib/bilibili";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mid: string }> }
) {
  const { mid } = await params;
  const url = new URL(_request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const size = Math.min(12, Math.max(3, parseInt(url.searchParams.get("size") || "6", 10)));

  try {
    const data = await biliFetch(
      `/x/v2/medialist/resource/list?type=1&biz_id=${mid}&ps=${size}&pn=${page}&order=pubtime`,
      `https://space.bilibili.com/${mid}`
    );

    if (!data || data.code !== 0) {
      return NextResponse.json({ videos: [], page, hasMore: false });
    }

    const rawList: Record<string, unknown>[] = data.data?.media_list || [];
    const total = Number(data.data?.total || 0);

    const videos = rawList.map((v: Record<string, unknown>) => {
      const upper = (v.upper || {}) as Record<string, unknown>;
      const cnt = (v.cnt_info || {}) as Record<string, unknown>;
      const pages = (v.pages || []) as Record<string, unknown>[];
      const bvid = extractBvid(String(v.bv_id || v.short_link || ""));
      const aid = Number(v.id || 0);
      const cid = pages.length > 0 ? Number(pages[0].id || 0) : 0;
      const cover = fixUrl(String(v.cover || ""));
      const durationSec = Number(v.duration || 0);

      return {
        id: bvid || String(aid),
        bvid: bvid || "",
        aid,
        cid,
        title: String(v.title || ""),
        author: String(upper.name || "未知UP主"),
        authorMid: Number(upper.mid || mid || 0),
        authorFace: fixUrl(String(upper.face || "")),
        cover,
        playCount: formatCount(Number(cnt.play || 0)),
        likeCount: formatCount(Number(cnt.thumb_up || 0)),
        danmakuCount: formatCount(Number(cnt.danmaku || 0)),
        duration: formatDuration(durationSec),
        durationSec,
        description: String(v.intro || "").substring(0, 120),
        pubdate: Number(v.pubtime || v.ctime || 0),
      };
    });

    return NextResponse.json({
      videos,
      page,
      hasMore: page * size < total,
      total,
    });
  } catch {
    return NextResponse.json({ videos: [], page, hasMore: false });
  }
}

function extractBvid(s: string): string {
  const m = s.match(/BV[a-zA-Z0-9]+/);
  return m ? m[0] : "";
}

function fixUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("http")) return url;
  return "https://" + url;
}

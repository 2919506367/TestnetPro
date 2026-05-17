import { NextRequest, NextResponse } from "next/server";
import { biliFetch, formatCount, formatDuration } from "@/lib/bilibili";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const keyword = (url.searchParams.get("q") || "").trim();
  const type = url.searchParams.get("type") || "video";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));

  if (!keyword) {
    return NextResponse.json({ results: [], source: "empty" });
  }

  const searchType = type === "user" ? "bili_user" : "video";

  try {
    const data = await biliFetch(
      `/x/web-interface/wbi/search/type?search_type=${searchType}&keyword=${encodeURIComponent(keyword)}&page=${page}`,
      "https://www.bilibili.com"
    );

    if (!data || data.code !== 0) {
      return NextResponse.json({ results: [], source: "error", message: data?.message || "搜索失败" });
    }

    const rawResults: Record<string, unknown>[] = data.data?.result || [];

    if (type === "user") {
      const users = rawResults.map((u: Record<string, unknown>) => ({
        mid: Number(u.mid || 0),
        name: String(u.uname || u.author || ""),
        face: fixUrl(String(u.upic || u.face || "")),
        sign: String(u.usign || "").substring(0, 80),
        followerCount: formatNum(Number(u.fans || 0)),
        videoCount: Number(u.videos || 0),
        level: Number(u.level || 0),
        official: u.official_verify ? (u.official_verify as Record<string, unknown>).desc : null,
      }));
      return NextResponse.json({
        results: users,
        source: "bilibili",
        type: "user",
        page,
        hasMore: page < (Number(data.data?.numPages) || 1),
      });
    }

    const videos = rawResults.map((v: Record<string, unknown>) => {
      const durationRaw = String(v.duration || "0");
      const durationSec = parseDuration(durationRaw);
      return {
        id: String(v.bvid || ""),
        bvid: String(v.bvid || ""),
        aid: Number(v.aid || 0),
        cid: 0,
        title: String(v.title || ""),
        author: String(v.author || ""),
        authorMid: Number(v.mid || 0),
        authorFace: fixUrl(String(v.upic || "")),
        cover: fixUrl(String(v.pic || "")),
        playCount: formatCount(Number(v.play || 0)),
        likeCount: formatCount(Number(v.like || 0)),
        danmakuCount: formatCount(Number(v.danmaku || v.video_review || 0)),
        duration: formatDuration(durationSec),
        durationSec,
        description: String(v.description || "").substring(0, 120),
        pubdate: Number(v.pubdate || 0),
      };
    });
    return NextResponse.json({
      results: videos,
      source: "bilibili",
      type: "video",
      page,
      hasMore: page < (Number(data.data?.numPages) || 1),
    });
  } catch {
    return NextResponse.json({ results: [], source: "error", message: "搜索服务暂不可用" });
  }
}

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  return String(n);
}

function parseDuration(s: string): number {
  const parts = s.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Math.floor(Number(s) || 0);
}

function fixUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("http")) return url;
  return "https://" + url;
}

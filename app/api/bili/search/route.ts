import { NextRequest, NextResponse } from "next/server";
import { biliFetch, mapVideo } from "@/lib/bilibili";

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
      `/x/web-interface/search/type?search_type=${searchType}&keyword=${encodeURIComponent(keyword)}&page=${page}&order=totalrank`,
      "https://www.bilibili.com"
    );

    if (!data || data.code !== 0) {
      return NextResponse.json({ results: [], source: "error", message: data?.message || "搜索失败" });
    }

    const rawResults: Record<string, unknown>[] = data.data?.result || [];

    if (type === "user") {
      const users = rawResults.map((u: Record<string, unknown>) => ({
        mid: Number(u.mid || 0),
        name: String(u.uname || ""),
        face: String(u.upic || u.face || ""),
        sign: String(u.usign || "").substring(0, 80),
        followerCount: formatNum(Number(u.fans || 0)),
        videoCount: Number(u.videos || 0),
        level: Number(u.level || 0),
        official: u.official_verify ? (u.official_verify as Record<string, unknown>).desc : null,
      }));
      return NextResponse.json({ results: users, source: "bilibili", type: "user", page });
    }

    const videos = rawResults.map(mapVideo);
    return NextResponse.json({ results: videos, source: "bilibili", type: "video", page });
  } catch {
    return NextResponse.json({ results: [], source: "error", message: "搜索服务暂不可用" });
  }
}

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  return String(n);
}

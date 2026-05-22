import { NextRequest, NextResponse } from "next/server";

const RELAY = "http://106.14.126.214:3001";
const KEY = "bili-relay-internal-2026";
const CK = "buvid3=BE2E84CE-C7F2-D9FA-4F28-BFDBE6640BD840825infoc; rpdid=0zbfAHGP7z|NgZFZmUv|hsh|3w1UalVU; DedeUserID=161049576; bili_jct=7dd310d004fd4acf890332d3491ed35b; SESSDATA=e4f3891d%2C1794756738%2C41aea%2A52CjDEIZD6cFAGD8NGlL-PyRhAaxeekepj4P-q38-SOpkAKxpjpBZr00xi7uAQAVizn1cSVnRhYTA5ZnRBeDhhbkRHTUNoRHZKT2RZdm5nYUFQSEVuMm9xdWlCWkRnRjdVdS03SnFfYmRvQ2dYU2xzcVAyeW85M08wY1QtMVBFaTQ2UnJfLXdOV2N3IIEC";

async function doSearch(keyword: string, searchType: string, page: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(`${RELAY}/api`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-relay-key": KEY },
      body: JSON.stringify({
        path: `/x/web-interface/wbi/search/type?search_type=${searchType}&keyword=${encodeURIComponent(keyword)}&page=${page}`,
        cookies: CK,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const wrapped = await res.json();
    if (wrapped.status === 200 && wrapped.body?.code === 0) return wrapped.body;
    return null;
  } catch { return null; } finally { clearTimeout(t); }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const keyword = (url.searchParams.get("q") || "").trim();
  const type = url.searchParams.get("type") || "video";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));

  if (!keyword) return NextResponse.json({ results: [], source: "empty" });

  const searchType = type === "user" ? "bili_user" : "video";

  try {
    const data = await doSearch(keyword, searchType, page);
    if (!data || data.code !== 0) {
      return NextResponse.json({ results: [], source: "error", message: "搜索失败" });
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
      }));
      return NextResponse.json({
        results: users, source: "bilibili", type: "user", page,
        hasMore: page < (Number(data.data?.numPages) || 1),
      });
    }

    const videos = rawResults.map((v: Record<string, unknown>) => {
      const d = String(v.duration || "0");
      const ds = parseDuration(d);
      return {
        id: String(v.bvid || ""), bvid: String(v.bvid || ""), aid: Number(v.aid || 0), cid: 0,
        title: stripHtml(String(v.title || "")), author: String(v.author || ""),
        authorMid: Number(v.mid || 0), authorFace: fixUrl(String(v.upic || "")),
        cover: fixUrl(String(v.pic || "")), playCount: formatCount(Number(v.play || 0)),
        likeCount: formatCount(Number(v.like || 0)),
        danmakuCount: formatCount(Number(v.danmaku || v.video_review || 0)),
        duration: formatDuration(ds), durationSec: ds,
        description: String(v.description || "").substring(0, 120), pubdate: Number(v.pubdate || 0),
      };
    });
    return NextResponse.json({
      results: videos, source: "bilibili", type: "video", page,
      hasMore: page < (Number(data.data?.numPages) || 1),
    });
  } catch {
    return NextResponse.json({ results: [], source: "error", message: "搜索服务暂不可用" });
  }
}

function formatNum(n: number): string { return n >= 10000 ? (n / 10000).toFixed(1) + "万" : String(n); }
function parseDuration(s: string): number {
  const parts = s.split(":").map(Number);
  if (parts.length === 3) return parts[0]*3600+parts[1]*60+parts[2];
  if (parts.length === 2) return parts[0]*60+parts[1];
  return Math.floor(Number(s)||0);
}
function fixUrl(url: string): string {
  if (!url) return ""; if (url.startsWith("//")) return "https:"+url;
  if (url.startsWith("http")) return url; return "https://"+url;
}
function stripHtml(s: string): string { return s.replace(/<[^>]*>/g, ""); }
function formatDuration(sec: number): string { const m=Math.floor(sec/60); return m+":"+String(sec%60).padStart(2,"0"); }
function formatCount(num: number): string { return num>=10000?(num/10000).toFixed(1)+"万":num>=1000?(num/1000).toFixed(1)+"k":String(num); }

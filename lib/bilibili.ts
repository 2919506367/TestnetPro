export const BILI_API = "https://api.bilibili.com";
export const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export function biliHeaders(referer = "https://www.bilibili.com") {
  const headers: Record<string, string> = {
    "User-Agent": UA,
    Referer: referer,
    Origin: "https://www.bilibili.com",
  };
  const cookie = process.env.BILI_COOKIE;
  if (cookie) headers["Cookie"] = cookie;
  return headers;
}

export async function biliFetch(path: string, referer?: string) {
  const res = await fetch(`${BILI_API}${path}`, {
    headers: biliHeaders(referer),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export function formatCount(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + "万";
  if (num >= 1000) return (num / 1000).toFixed(1) + "k";
  return String(num);
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatPubdate(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "刚刚";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}分钟前`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}小时前`;
  if (diffSec < 2592000) return `${Math.floor(diffSec / 86400)}天前`;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function proxyUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  return `/api/bili-proxy?url=${encodeURIComponent(rawUrl)}`;
}

export function shuffleArray<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) | 0;
    const j = ((s >>> 0) % (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function mapVideo(raw: Record<string, unknown>) {
  const stat = (raw.stat as Record<string, number>) || {};
  const owner = (raw.owner as Record<string, unknown>) || {};
  const bvid = String(raw.bvid || "");
  return {
    id: bvid,
    bvid,
    aid: Number(raw.aid || 0),
    cid: Number(raw.cid || 0),
    title: String(raw.title || ""),
    author: String(owner.name || "未知UP主"),
    authorMid: Number(owner.mid || 0),
    authorFace: String(owner.face || ""),
    cover: String(raw.pic || ""),
    playCount: formatCount(stat.view || 0),
    likeCount: formatCount(stat.like || 0),
    danmakuCount: formatCount(stat.danmaku || 0),
    duration: formatDuration(Number(raw.duration || 0)),
    durationSec: Number(raw.duration || 0),
    description: String(raw.desc || "").substring(0, 120),
    pubdate: Number(raw.pubdate || 0),
  };
}

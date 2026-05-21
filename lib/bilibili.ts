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

const RELAY_URL = process.env.RELAY_URL || "";
const RELAY_KEY = process.env.RELAY_KEY || "bili-relay-internal-2026";

export async function biliFetch(path: string, referer?: string) {
  if (RELAY_URL) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`${RELAY_URL}/api`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-relay-key": RELAY_KEY },
        body: JSON.stringify({ path, cookies: process.env.BILI_COOKIE || "" }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) throw new Error("relay non-200");
      const wrapped = await res.json();
      if (wrapped.status === 200 && wrapped.body?.code === 0) return wrapped.body;
      throw new Error("relay upstream error");
    } catch {
      console.warn("biliFetch: relay failed, falling back to direct");
    }
  }

  const res = await fetch(`${BILI_API}${path}`, {
    headers: biliHeaders(referer),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export { RELAY_URL, RELAY_KEY };

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

function ensureHttps(url: string): string {
  if (!url) return "";
  if (url.startsWith("https://")) return url;
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("http://")) return url.replace("http://", "https://");
  return url;
}

export function directUrl(rawUrl: string): string {
  return ensureHttps(rawUrl);
}

export function proxyUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  return `/api/bili-proxy?url=${encodeURIComponent(rawUrl)}`;
}

const IMG_MODE_KEY = "bili_img_mode";
const IMG_FAIL_COUNT_KEY = "bili_img_fail_count";
const FAIL_THRESHOLD = 3;

export function getImageMode(): "direct" | "proxy" {
  if (typeof window === "undefined") return "direct";
  return (localStorage.getItem(IMG_MODE_KEY) as "direct" | "proxy") || "direct";
}

function recordImageFailure() {
  if (typeof window === "undefined") return;
  const count = (parseInt(localStorage.getItem(IMG_FAIL_COUNT_KEY) || "0", 10) || 0) + 1;
  localStorage.setItem(IMG_FAIL_COUNT_KEY, String(count));
  if (count >= FAIL_THRESHOLD) {
    localStorage.setItem(IMG_MODE_KEY, "proxy");
  }
}

function recordImageSuccess() {
  if (typeof window === "undefined") return;
  const count = parseInt(localStorage.getItem(IMG_FAIL_COUNT_KEY) || "0", 10) || 0;
  if (count > 0) {
    localStorage.setItem(IMG_FAIL_COUNT_KEY, String(Math.max(0, count - 1)));
  }
}

function clearImageFailures() {
  if (typeof window === "undefined") return;
  localStorage.setItem(IMG_FAIL_COUNT_KEY, "0");
  localStorage.setItem(IMG_MODE_KEY, "direct");
}

export function resolveImageUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  if (getImageMode() === "proxy") return proxyUrl(rawUrl);
  return directUrl(rawUrl);
}

export const IMG_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='90' viewBox='0 0 160 90'%3E%3Crect width='160' height='90' fill='%23333'/%3E%3Ctext x='80' y='50' text-anchor='middle' fill='%23666' font-size='12'%3E加载失败%3C/text%3E%3C/svg%3E";

export function imgOnError(e: React.SyntheticEvent<HTMLImageElement>) {
  const el = e.currentTarget;
  const currentSrc = el.src;
  const rawUrl = el.getAttribute("data-raw");
  if (!rawUrl) { el.onerror = null; el.src = IMG_PLACEHOLDER; return; }

  if (currentSrc.includes("/api/bili-proxy")) {
    el.onerror = null;
    el.src = IMG_PLACEHOLDER;
  } else {
    recordImageFailure();
    el.src = proxyUrl(rawUrl);
  }
}

export function imgOnLoad(e: React.SyntheticEvent<HTMLImageElement>) {
  if (e.currentTarget.src.includes("/api/bili-proxy")) return;
  recordImageSuccess();
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
    cover: String(raw.pic || raw.cover || ""),
    playCount: formatCount(stat.view || 0),
    likeCount: formatCount(stat.like || 0),
    danmakuCount: formatCount(stat.danmaku || 0),
    duration: formatDuration(Number(raw.duration || 0)),
    durationSec: Number(raw.duration || 0),
    description: String(raw.desc || "").substring(0, 120),
    pubdate: Number(raw.pubdate || 0),
  };
}

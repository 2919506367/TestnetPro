import { NextRequest, NextResponse } from "next/server";

const BILI_API = "https://api.bilibili.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const RELAY_URL = process.env.RELAY_URL || "";
const RELAY_KEY = process.env.RELAY_KEY || "bili-relay-internal-2026";

async function relayFetch(path: string, cookies?: string): Promise<{ status: number; body: any } | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${RELAY_URL}/api`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-relay-key": RELAY_KEY },
      body: JSON.stringify({ path, cookies: cookies || process.env.BILI_COOKIE || "" }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

const QN_MAP: Record<number, string> = {
  6: "240P 极速",
  16: "360P 流畅",
  32: "480P 清晰",
  64: "720P 高清",
  80: "1080P 高清",
  112: "1080P+",
  116: "1080P60",
  120: "4K",
};

const ALLOWED_QNS = [6, 16, 32, 64, 80, 112, 116, 120];
const DEFAULT_QN = 32;

function biliHeaders(referer = "https://www.bilibili.com") {
  const headers: Record<string, string> = {
    "User-Agent": UA,
    Referer: referer,
    Origin: "https://www.bilibili.com",
  };
  const cookie = process.env.BILI_COOKIE;
  if (cookie) {
    headers["Cookie"] = cookie;
  }
  return headers;
}

async function tryPlayUrl(bvid: string, cid: string, fnval: number, qn: number) {
  const path = `/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=${qn}&platform=web&fnval=${fnval}&fourk=1`;

  if (RELAY_URL) {
    const r = await relayFetch(path);
    if (r && r.status === 200 && r.body?.code === 0) return r.body;
  }

  const playRes = await fetch(
    `${BILI_API}${path}`,
    { headers: biliHeaders(`https://www.bilibili.com/video/${bvid}`) }
  );
  if (!playRes.ok) return null;
  return playRes.json();
}

function proxyUrl(rawUrl: string): string {
  return `/api/bili-proxy?url=${encodeURIComponent(rawUrl)}`;
}

function parseQn(input: string | null): number {
  if (!input) return DEFAULT_QN;
  const n = parseInt(input, 10);
  if (ALLOWED_QNS.includes(n)) return n;
  const closest = ALLOWED_QNS.reduce((prev, curr) =>
    Math.abs(curr - n) < Math.abs(prev - n) ? curr : prev
  );
  return closest;
}

const CACHE_TTL = 5 * 60 * 1000;

interface CacheEntry {
  body: any;
  expires: number;
}

const cache = new Map<string, CacheEntry>();

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const bvid = url.searchParams.get("bvid");
  if (!bvid) return NextResponse.json({ error: "缺少bvid参数" }, { status: 400 });

  const qn = parseQn(url.searchParams.get("qn"));
  const cacheKey = `${bvid}:${qn}`;

  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.body);
  }

  try {
    let cid: any;
    if (RELAY_URL) {
      const r = await relayFetch(`/x/player/pagelist?bvid=${bvid}`);
      if (r && r.status === 200 && r.body?.code === 0) {
        cid = r.body.data?.[0]?.cid;
      }
    }
    if (!cid) {
      const pageRes = await fetch(`${BILI_API}/x/player/pagelist?bvid=${bvid}`, {
        headers: biliHeaders(),
      });
      if (!pageRes.ok) throw new Error("pagelist failed");
      const pageData = await pageRes.json();
      cid = pageData.data?.[0]?.cid;
    }
    if (!cid) throw new Error("no cid");

    let resultBody: any;

    let playData = await tryPlayUrl(bvid, cid, 0, qn);
    if (playData?.data?.durl?.length > 0) {
      resultBody = buildDurlBody(playData, bvid, cid, qn);
    } else {
      playData = await tryPlayUrl(bvid, cid, 1, qn);
      if (playData?.data?.durl?.length > 0) {
        resultBody = buildDurlBody(playData, bvid, cid, qn);
      } else {
        playData = await tryPlayUrl(bvid, cid, 16, qn);
        if (playData?.data?.dash?.video?.length > 0) {
          resultBody = buildDashBody(playData, bvid, cid, qn);
        } else {
          resultBody = {
            embedUrl: `https://www.bilibili.com/video/${bvid}`,
            bvid, cid, fallback: true,
          };
        }
      }
    }

    cache.set(cacheKey, { body: resultBody, expires: Date.now() + CACHE_TTL });
    return NextResponse.json(resultBody);
  } catch {
    return NextResponse.json({
      embedUrl: `https://www.bilibili.com/video/${bvid}`,
      bvid,
      fallback: true,
    });
  }
}

function buildDurlBody(playData: any, bvid: string, cid: string, qn: number) {
  const durl = playData.data.durl;
  const best = durl[durl.length - 1];
  const backupRaw = best.backup_url?.[0] || null;
  const qualities = buildQualityList(playData.data.accept_quality, playData.data.accept_description, qn);

  return {
    videoUrl: best.url,
    proxyVideoUrl: proxyUrl(best.url),
    audioUrl: null,
    proxyAudioUrl: null,
    backupUrl: backupRaw,
    proxyBackupUrl: backupRaw ? proxyUrl(backupRaw) : null,
    format: "durl",
    qn,
    qnLabel: QN_MAP[qn] || `${qn}P`,
    qualities,
    bvid,
    cid,
  };
}

function buildDashBody(playData: any, bvid: string, cid: string, qn: number) {
  const dash = playData.data.dash;
  const videos = dash.video as Array<Record<string, unknown>>;
  const audios = dash.audio as Array<Record<string, unknown>> | undefined;
  const bestVideo = videos[videos.length - 1];
  const bestAudio = audios?.[audios.length - 1];
  const qualities = buildQualityList(playData.data.accept_quality, playData.data.accept_description, qn);
  const videoRaw = String(bestVideo.baseUrl || bestVideo.base_url);
  const audioRaw = bestAudio ? String(bestAudio.baseUrl || bestAudio.base_url) : null;

  return {
    videoUrl: videoRaw,
    proxyVideoUrl: proxyUrl(videoRaw),
    audioUrl: audioRaw,
    proxyAudioUrl: audioRaw ? proxyUrl(audioRaw) : null,
    backupUrl: null,
    proxyBackupUrl: null,
    bvid,
    cid,
    format: "dash",
    dashFormat: true,
    qn,
    qnLabel: QN_MAP[qn] || `${qn}P`,
    qualities,
  };
}

function buildQualityList(acceptQuality: unknown, acceptDesc: unknown, currentQn: number) {
  const qns = (acceptQuality as number[]) || [];
  const descs = (acceptDesc as string[]) || [];
  return qns.map((q, i) => ({
    qn: q,
    label: QN_MAP[q] || descs[i] || `${q}P`,
    active: q === currentQn,
  }));
}

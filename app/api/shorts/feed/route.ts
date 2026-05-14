import { NextRequest, NextResponse } from "next/server";

const BILI_API = "https://api.bilibili.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function biliFetch(path: string) {
  const res = await fetch(`${BILI_API}${path}`, {
    headers: { "User-Agent": UA, Referer: "https://www.bilibili.com" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(30, Math.max(5, parseInt(url.searchParams.get("size") || "15", 10)));

  const popularData = await biliFetch(`/x/web-interface/popular?pn=${page}&ps=${pageSize}`);
  if (!popularData || popularData.code !== 0) {
    return NextResponse.json({
      videos: getFallbackVideos(page, pageSize),
      source: "fallback",
    });
  }

  const rawVideos = popularData.data?.list || [];
  if (rawVideos.length === 0) {
    return NextResponse.json({ videos: getFallbackVideos(page, pageSize), source: "fallback" });
  }

  const videos = rawVideos.map((v: Record<string, unknown>) => {
    const stat = (v.stat as Record<string, number>) || {};
    const owner = (v.owner as Record<string, unknown>) || {};
    const bvid = String(v.bvid || "");
    const pic = String(v.pic || "");

    return {
      id: bvid,
      bvid,
      title: String(v.title || ""),
      author: String(owner.name || "未知UP主"),
      authorFace: String(owner.face || ""),
      cover: pic,
      playCount: formatCount(stat.view || 0),
      likeCount: formatCount(stat.like || 0),
      duration: formatDuration(Number(v.duration || 0)),
      durationSec: Number(v.duration || 0),
      description: String(v.desc || "").substring(0, 120),
      pubdate: Number(v.pubdate || 0),
      shortLink: String(v.short_link_v2 || v.short_link || ""),
      source: "bilibili",
    };
  });

  return NextResponse.json({ videos, source: "bilibili_hot" });
}

function formatCount(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + "万";
  if (num >= 1000) return (num / 1000).toFixed(1) + "k";
  return String(num);
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getFallbackVideos(page: number, size: number) {
  const total = contentPool.length;
  const start = ((page - 1) * size) % total;
  const slice = contentPool.slice(start, start + size);
  if (slice.length < size) {
    slice.push(...contentPool.slice(0, size - slice.length));
  }
  return slice;
}

const contentPool = [
  {
    id: "bv_fallback_1",
    bvid: "BV1GJ411x7h7",
    title: "【4K】绝美延时摄影 — 城市的呼吸",
    author: "影视飓风",
    authorFace: "",
    cover: "https://i0.hdslb.com/bfs/archive/9c8fb1a8e7f1a0c5d6e3b2a1f4e5d6c7b8a9f0e1.jpg",
    playCount: "256.3万",
    likeCount: "12.5万",
    duration: "3:24",
    durationSec: 204,
    description: "用延时摄影记录城市的一天，从日出到夜幕降临。",
    pubdate: 1700000000,
    shortLink: "",
    source: "fallback",
  },
  {
    id: "bv_fallback_2",
    bvid: "BV17x411w7KC",
    title: "【纪录片】深海奇观 — 从未见过的海底世界",
    author: "央视纪录",
    authorFace: "",
    cover: "https://i1.hdslb.com/bfs/archive/3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e.jpg",
    playCount: "189.7万",
    likeCount: "8.9万",
    duration: "5:12",
    durationSec: 312,
    description: "跟随深海探测器，探索地球上最神秘的海底世界。",
    pubdate: 1699000000,
    shortLink: "",
    source: "fallback",
  },
  {
    id: "bv_fallback_3",
    bvid: "BV1G4411H7PE",
    title: "如何用AI生成唯美短片 — 零基础入门教程",
    author: "李自然说",
    authorFace: "",
    cover: "https://i2.hdslb.com/bfs/archive/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0.jpg",
    playCount: "78.4万",
    likeCount: "5.2万",
    duration: "4:08",
    durationSec: 248,
    description: "手把手教你使用AI工具生成高质量短视频，无需任何编程基础。",
    pubdate: 1705000000,
    shortLink: "",
    source: "fallback",
  },
  {
    id: "bv_fallback_4",
    bvid: "BV1sp4y1w7uF",
    title: "顶级混剪：2025年度视觉盛宴",
    author: "木鱼水心",
    authorFace: "",
    cover: "https://i0.hdslb.com/bfs/archive/c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9.jpg",
    playCount: "342.1万",
    likeCount: "28.7万",
    duration: "6:45",
    durationSec: 405,
    description: "汇集全年最震撼的影视画面，带来一场视听盛宴。",
    pubdate: 1708000000,
    shortLink: "",
    source: "fallback",
  },
  {
    id: "bv_fallback_5",
    bvid: "BV1cJ4m1M7Mh",
    title: "前端开发者的2025技术栈选择",
    author: "技术蛋老师",
    authorFace: "",
    cover: "https://i1.hdslb.com/bfs/archive/f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7.jpg",
    playCount: "45.2万",
    likeCount: "3.8万",
    duration: "8:30",
    durationSec: 510,
    description: "2025年最新前端技术栈分析与推荐，帮你做出正确的技术选择。",
    pubdate: 1710000000,
    shortLink: "",
    source: "fallback",
  },
  {
    id: "bv_fallback_6",
    bvid: "BV1FW421R73k",
    title: "在纸上画一个能跑的游戏引擎",
    author: "Alg0rie",
    authorFace: "",
    cover: "https://i2.hdslb.com/bfs/archive/d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e.jpg",
    playCount: "92.6万",
    likeCount: "15.3万",
    duration: "12:18",
    durationSec: 738,
    description: "从零开始构建一个迷你游戏引擎，全部在纸上推导。",
    pubdate: 1712000000,
    shortLink: "",
    source: "fallback",
  },
  {
    id: "bv_fallback_7",
    bvid: "BV1Vx4y1t7Mg",
    title: "一个人开发的AI助手，打败了GPT4？",
    author: "差评",
    authorFace: "",
    cover: "https://i0.hdslb.com/bfs/archive/b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8.jpg",
    playCount: "167.8万",
    likeCount: "11.2万",
    duration: "9:54",
    durationSec: 594,
    description: "独立开发者如何在一年内打造超越GPT4的AI产品。",
    pubdate: 1714000000,
    shortLink: "",
    source: "fallback",
  },
  {
    id: "bv_fallback_8",
    bvid: "BV1hu4m1w74Y",
    title: "【4K HDR】挪威极光 — 地球上最美的夜空",
    author: "8KRAW",
    authorFace: "",
    cover: "https://i1.hdslb.com/bfs/archive/e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3.jpg",
    playCount: "423.5万",
    likeCount: "35.6万",
    duration: "2:56",
    durationSec: 176,
    description: "在挪威零下30度拍摄的极光，每一帧都是壁纸级别的画面。",
    pubdate: 1716000000,
    shortLink: "",
    source: "fallback",
  },
];

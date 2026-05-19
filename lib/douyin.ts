export const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export function douyinHeaders() {
  const headers: Record<string, string> = {
    "User-Agent": UA,
    Referer: "https://www.douyin.com/",
  };
  const cookie = process.env.DOUYIN_COOKIE;
  if (cookie) headers["Cookie"] = cookie;
  return headers;
}

export async function douyinFetch(path: string, extraHeaders?: Record<string, string>) {
  const headers = { ...douyinHeaders(), ...extraHeaders };
  const res = await fetch(`https://www.douyin.com${path}`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export interface DouyinVideo {
  aweme_id: string;
  desc: string;
  create_time: number;
  duration: number;
  video: {
    play_addr: { url_list: string[] };
    cover: { url_list: string[] };
    duration: number;
  };
  author: {
    uid: string;
    short_id: string;
    nickname: string;
    avatar_thumb: { url_list: string[] };
  };
  statistics: {
    digg_count: number;
    comment_count: number;
    share_count: number;
  };
  music?: { title: string; author: string };
}

export function mapDouyinVideo(raw: DouyinVideo) {
  const cover = raw.video?.cover?.url_list?.[0] || "";
  const playUrl = raw.video?.play_addr?.url_list?.[0] || "";
  const author = raw.author || {};
  const stats = raw.statistics || {};
  return {
    id: raw.aweme_id,
    desc: raw.desc || "",
    cover,
    playUrl,
    duration: raw.duration || raw.video?.duration || 0,
    authorId: author.uid || "",
    authorName: author.nickname || "抖音用户",
    authorAvatar: author.avatar_thumb?.url_list?.[0] || "",
    likeCount: stats.digg_count || 0,
    commentCount: stats.comment_count || 0,
    shareCount: stats.share_count || 0,
    music: raw.music?.title || "",
    createTime: raw.create_time || 0,
  };
}

export type MappedDouyinVideo = ReturnType<typeof mapDouyinVideo>;

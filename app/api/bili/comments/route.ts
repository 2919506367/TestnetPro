import { NextRequest, NextResponse } from "next/server";
import { biliFetch } from "@/lib/bilibili";

const PS = 20;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const aid = url.searchParams.get("aid");
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));

  if (!aid) return NextResponse.json({ comments: [], source: "empty" });

  try {
    const data = await biliFetch(
      `/x/v2/reply/main?oid=${aid}&type=1&mode=3&ps=${PS}&pn=${page}`,
      `https://www.bilibili.com/video/av${aid}`
    );

    if (!data || data.code !== 0) {
      return NextResponse.json({ comments: [], source: "unavailable" });
    }

    const emotes: Record<string, string> = {};
    const rawEmotes = (data.data?.emote || {}) as Record<string, unknown>;
    for (const key of Object.keys(rawEmotes)) {
      const e = rawEmotes[key] as Record<string, unknown>;
      if (e?.url) emotes[key] = fixUrl(String(e.url));
    }

    const replies: Record<string, unknown>[] = data.data?.replies || [];
    const comments = replies.map((r: Record<string, unknown>) => ({
      rpid: Number(r.rpid || 0),
      content: String((r.content as Record<string, unknown>)?.message || r.content || ""),
      author: String((r.member as Record<string, unknown>)?.uname || ""),
      authorMid: Number((r.member as Record<string, unknown>)?.mid || 0),
      authorFace: String((r.member as Record<string, unknown>)?.avatar || ""),
      likeCount: Number(r.like || 0),
      replyCount: Number(r.rcount || 0),
      createdAt: Number(r.ctime || 0),
    }));

    const pageInfo = (data.data?.page || {}) as Record<string, unknown>;
    const totalCount = Number(pageInfo.count || 0);

    return NextResponse.json({
      comments,
      emotes,
      page,
      hasMore: totalCount > 0 ? page * PS < totalCount : comments.length >= PS,
      total: totalCount || comments.length,
    });
  } catch {
    return NextResponse.json({ comments: [], source: "unavailable" });
  }
}

function fixUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("http")) return url;
  return "https://" + url;
}

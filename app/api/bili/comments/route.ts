import { NextRequest, NextResponse } from "next/server";
import { biliFetch } from "@/lib/bilibili";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const aid = url.searchParams.get("aid");
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));

  if (!aid) return NextResponse.json({ comments: [], source: "empty" });

  try {
    const data = await biliFetch(
      `/x/v2/reply/main?oid=${aid}&type=1&mode=3&ps=15&pn=${page}`,
      `https://www.bilibili.com/video/av${aid}`
    );

    if (!data || data.code !== 0) {
      return NextResponse.json({ comments: [], source: "unavailable" });
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

    return NextResponse.json({
      comments,
      page,
      hasMore: (data.data?.page as Record<string, unknown>)?.count !== undefined
        ? page * 15 < Number((data.data?.page as Record<string, unknown>)?.count)
        : comments.length >= 15,
    });
  } catch {
    return NextResponse.json({ comments: [], source: "unavailable" });
  }
}

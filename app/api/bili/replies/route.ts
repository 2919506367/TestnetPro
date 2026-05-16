import { NextRequest, NextResponse } from "next/server";
import { biliFetch } from "@/lib/bilibili";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const aid = url.searchParams.get("aid");
  const root = url.searchParams.get("root");
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));

  if (!aid || !root) {
    return NextResponse.json({ replies: [], source: "empty" });
  }

  try {
    const data = await biliFetch(
      `/x/v2/reply/reply?oid=${aid}&type=1&root=${root}&ps=20&pn=${page}`,
      `https://www.bilibili.com/video/av${aid}`
    );

    if (!data || data.code !== 0) {
      return NextResponse.json({ replies: [], source: "unavailable" });
    }

    const rawReplies: Record<string, unknown>[] = data.data?.replies || [];
    const replies = rawReplies.map((r: Record<string, unknown>) => {
      const member = (r.member || {}) as Record<string, unknown>;
      const content = (r.content || {}) as Record<string, unknown>;
      return {
        rpid: Number(r.rpid || 0),
        content: String(content.message || r.content || ""),
        author: String(member.uname || ""),
        authorMid: Number(member.mid || 0),
        authorFace: String(member.avatar || ""),
        likeCount: Number(r.like || 0),
        replyCount: Number(r.rcount || 0),
        createdAt: Number(r.ctime || 0),
        parentAuthor: String(r.parent_str || ""),
      };
    });

    const pageInfo = (data.data?.page || {}) as Record<string, unknown>;
    const totalCount = Number(pageInfo.count || 0);

    return NextResponse.json({
      replies,
      page,
      hasMore: page * 20 < totalCount,
      total: totalCount,
    });
  } catch {
    return NextResponse.json({ replies: [], source: "unavailable" });
  }
}

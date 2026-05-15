import { NextRequest, NextResponse } from "next/server";
import { biliFetch, mapVideo } from "@/lib/bilibili";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mid: string }> }
) {
  const { mid } = await params;
  const url = new URL(_request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const size = Math.min(12, Math.max(3, parseInt(url.searchParams.get("size") || "6", 10)));

  try {
    const data = await biliFetch(
      `/x/space/arc/search?mid=${mid}&pn=${page}&ps=${size}&order=pubdate`,
      `https://space.bilibili.com/${mid}`
    );

    if (!data || data.code !== 0) {
      return NextResponse.json({ videos: [], page, hasMore: false });
    }

    const list = (data.data?.list?.vlist || data.data?.list || []) as Record<string, unknown>[];
    const videos = list.map(mapVideo);

    return NextResponse.json({
      videos,
      page,
      hasMore: videos.length >= size,
      total: Number(data.data?.page?.count || 0),
    });
  } catch {
    return NextResponse.json({ videos: [], page, hasMore: false });
  }
}

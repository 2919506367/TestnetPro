import { NextRequest, NextResponse } from "next/server";
import { douyinFetch, douyinHeaders } from "@/lib/douyin";

export async function GET(request: NextRequest) {
  const awemeId = request.nextUrl.searchParams.get("id");
  if (!awemeId) return NextResponse.json({ error: "缺少视频ID" }, { status: 400 });

  try {
    const data = await douyinFetch(
      `/aweme/v1/web/aweme/detail/?aweme_id=${awemeId}&device_platform=webapp&aid=6383&channel=channel_pc_web&version_code=170400&version_name=17.4.0`
    );

    const aweme = data?.aweme_detail;
    if (!aweme) return NextResponse.json({ error: "视频不存在或已下架" }, { status: 404 });

    const video = aweme.video;
    const playAddr = video?.play_addr || video?.bit_rate?.find((b: { play_addr: unknown }) => b.play_addr)?.play_addr;

    return NextResponse.json({
      id: aweme_id(aweme),
      desc: aweme.desc || "",
      duration: video?.duration || 0,
      cover: video?.cover?.url_list?.[0] || video?.origin_cover?.url_list?.[0] || "",
      videoUrl: playAddr?.url_list?.[0] || "",
      proxyVideoUrl: `/api/douyin-proxy?url=${encodeURIComponent(playAddr?.url_list?.[0] || "")}`,
      author: {
        uid: aweme.author?.uid || "",
        name: aweme.author?.nickname || "",
        avatar: aweme.author?.avatar_thumb?.url_list?.[0] || "",
      },
      stats: {
        likes: aweme.statistics?.digg_count || 0,
        comments: aweme.statistics?.comment_count || 0,
        shares: aweme.statistics?.share_count || 0,
      },
      music: aweme.music?.title || "",
    });
  } catch {
    return NextResponse.json({ error: "获取视频失败" }, { status: 502 });
  }
}

function aweme_id(a: { aweme_id?: string; awemeId?: string }): string {
  return a.aweme_id || a.awemeId || "";
}

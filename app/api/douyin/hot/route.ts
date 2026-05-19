import { NextRequest, NextResponse } from "next/server";
import { douyinFetch, mapDouyinVideo, type DouyinVideo } from "@/lib/douyin";

export async function GET(request: NextRequest) {
  try {
    const params: Record<string, string> = {};
    for (const [k, v] of request.nextUrl.searchParams) {
      params[k] = v;
    }

    const keyword = params.keyword;
    if (keyword) {
      return searchVideos(keyword, params);
    }

    const hotData = await douyinFetch("/aweme/v1/web/hot/search/list/");
    if (!hotData?.data?.word_list) {
      return NextResponse.json({ videos: [], error: "获取热门列表失败" });
    }

    const wordList: { word: string }[] = hotData.data.word_list.slice(0, 8);
    const allVideos: ReturnType<typeof mapDouyinVideo>[] = [];
    const seen = new Set<string>();

    for (const item of wordList) {
      try {
        const result = await searchVideosRaw(item.word, 0, 6);
        if (result?.data) {
          for (const aw of result.data) {
            if (aw.aweme_info && !seen.has(aw.aweme_info.aweme_id)) {
              seen.add(aw.aweme_info.aweme_id);
              allVideos.push(mapDouyinVideo(aw.aweme_info));
            }
          }
        }
      } catch { /* skip failed keyword */ }
    }

    return NextResponse.json({ videos: allVideos.slice(0, 30), source: "douyin_hot" });
  } catch {
    return NextResponse.json({ videos: [], error: "服务器内部错误" }, { status: 500 });
  }
}

async function searchVideos(keyword: string, params: Record<string, string>) {
  const offset = parseInt(params.offset || "0");
  const result = await searchVideosRaw(keyword, offset, 18);
  const videos: ReturnType<typeof mapDouyinVideo>[] = [];
  if (result?.data) {
    for (const aw of result.data) {
      if (aw.aweme_info) videos.push(mapDouyinVideo(aw.aweme_info));
    }
  }
  return NextResponse.json({ videos, source: "douyin_search", keyword, hasMore: videos.length === 18 });
}

async function searchVideosRaw(keyword: string, offset: number, count: number) {
  return douyinFetch(
    `/aweme/v1/web/search/item/?device_platform=webapp&aid=6383&channel=channel_pc_web&search_channel=aweme_video_web&sort_type=2&publish_time=0&keyword=${encodeURIComponent(keyword)}&search_source=normal_search&offset=${offset}&count=${count}&version_code=170400&version_name=17.4.0`
  );
}

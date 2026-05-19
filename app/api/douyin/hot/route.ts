import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

function getCookie(): string {
  try {
    return readFileSync(join(process.cwd(), ".douyin_cookie"), "utf8").trim();
  } catch {
    return "";
  }
}

async function douyinFetch(path: string) {
  const cookie = getCookie();
  const res = await fetch(`https://www.douyin.com${path}`, {
    headers: { "User-Agent": UA, Referer: "https://www.douyin.com/", Cookie: cookie },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function GET(request: NextRequest) {
  try {
    const keyword = request.nextUrl.searchParams.get("keyword");
    
    if (keyword) {
      const data = await douyinFetch(
        `/aweme/v1/web/search/item/?device_platform=webapp&aid=6383&channel=channel_pc_web&search_channel=aweme_video_web&sort_type=2&publish_time=0&keyword=${encodeURIComponent(keyword)}&search_source=normal_search&offset=0&count=20&version_code=170400&version_name=17.4.0`
      );
      
      if (!data?.data) return NextResponse.json({ topics: [], error: "搜索接口需要登录" });
      
      const topics = data.data.map((item: { aweme_info?: { aweme_id?: string; desc?: string; video?: { cover?: { url_list?: string[] } } } }) => ({
        id: item.aweme_info?.aweme_id || "",
        word: item.aweme_info?.desc || "",
        cover: item.aweme_info?.video?.cover?.url_list?.[0] || "",
        hotValue: 0,
        videoCount: 0,
        type: "video" as const,
      })).filter((t: { id: string }) => t.id);
      
      return NextResponse.json({ topics, source: "douyin_search", keyword });
    }

    const hotData = await douyinFetch("/aweme/v1/web/hot/search/list/");
    if (!hotData?.data?.word_list) {
      return NextResponse.json({ topics: [], source: "douyin", error: "获取热榜失败" });
    }

    const topics: {
      id: string; word: string; cover: string; hotValue: number;
      videoCount: number; type: "hot" | "trending";
    }[] = [];

    for (const item of hotData.data.word_list) {
      topics.push({
        id: item.group_id || item.sentence_id || "",
        word: item.word || "",
        cover: item.word_cover?.url_list?.[0] || "",
        hotValue: item.hot_value || 0,
        videoCount: item.video_count || 0,
        type: "hot" as const,
      });
    }

    if (hotData.data.trending_list) {
      for (const item of hotData.data.trending_list) {
        if (!topics.some(t => t.word === item.word)) {
          topics.push({
            id: item.group_id || item.sentence_id || "",
            word: item.word || "",
            cover: item.word_cover?.url_list?.[0] || "",
            hotValue: item.hot_value || 0,
            videoCount: item.video_count || 0,
            type: "trending" as const,
          });
        }
      }
    }

    return NextResponse.json({
      topics: topics.slice(0, 40),
      source: "douyin",
      activeTime: hotData.data.active_time || "",
      trendingDesc: hotData.data.trending_desc || "",
    });
  } catch {
    return NextResponse.json({ topics: [], error: "服务器内部错误" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

const BILI_API = "https://api.bilibili.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function tryPlayUrl(bvid: string, cid: string, fnval: number) {
  const playRes = await fetch(
    `${BILI_API}/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=64&platform=web&fnval=${fnval}`,
    { headers: { "User-Agent": UA, Referer: `https://www.bilibili.com/video/${bvid}` } }
  );
  if (!playRes.ok) return null;
  return playRes.json();
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const bvid = url.searchParams.get("bvid");
  if (!bvid) return NextResponse.json({ error: "缺少bvid参数" }, { status: 400 });

  try {
    const pageRes = await fetch(`${BILI_API}/x/player/pagelist?bvid=${bvid}`, {
      headers: { "User-Agent": UA, Referer: "https://www.bilibili.com" },
    });
    if (!pageRes.ok) throw new Error("pagelist failed");
    const pageData = await pageRes.json();
    const cid = pageData.data?.[0]?.cid;
    if (!cid) throw new Error("no cid");

    let playData = await tryPlayUrl(bvid, cid, 0);
    if (playData?.data?.durl?.length > 0) {
      const durl = playData.data.durl;
      return NextResponse.json({
        videoUrl: durl[0].url,
        audioUrl: null,
        backupUrl: durl[0].backup_url?.[0] || null,
        acceptDescription: playData.data.accept_description,
        bvid,
        cid,
      });
    }

    playData = await tryPlayUrl(bvid, cid, 1);
    if (playData?.data?.durl?.length > 0) {
      const durl = playData.data.durl;
      return NextResponse.json({
        videoUrl: durl[0].url,
        audioUrl: null,
        backupUrl: durl[0].backup_url?.[0] || null,
        bvid,
        cid,
      });
    }

    playData = await tryPlayUrl(bvid, cid, 16);
    if (playData?.data?.dash?.video?.length > 0) {
      const dash = playData.data.dash;
      return NextResponse.json({
        videoUrl: dash.video[0].baseUrl || dash.video[0].base_url,
        audioUrl: dash.audio?.[0]?.baseUrl || dash.audio?.[0]?.base_url || null,
        bvid,
        cid,
        dashFormat: true,
      });
    }

    return NextResponse.json({
      embedUrl: `https://www.bilibili.com/video/${bvid}`,
      bvid,
      cid,
      fallback: true,
    });
  } catch {
    return NextResponse.json({
      embedUrl: `https://www.bilibili.com/video/${bvid}`,
      bvid,
      fallback: true,
    });
  }
}

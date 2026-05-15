import { NextRequest, NextResponse } from "next/server";
import { biliHeaders } from "@/lib/bilibili";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const cid = url.searchParams.get("cid");

  if (!cid) return NextResponse.json({ danmakus: [], source: "empty" });

  try {
    const res = await fetch(
      `https://api.bilibili.com/x/v1/dm/list.so?oid=${cid}`,
      { headers: biliHeaders() }
    );

    if (!res.ok) {
      return NextResponse.json({ danmakus: [], source: "unavailable" });
    }

    const xml = await res.text();

    const danmakus: { text: string; time: number; mode: number; color: string; size: number }[] = [];
    const regex = /<d p="([^"]+)">([^<]+)<\/d>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      const attrs = match[1].split(",");
      danmakus.push({
        time: parseFloat(attrs[0]) || 0,
        mode: parseInt(attrs[1], 10) || 1,
        size: parseInt(attrs[2], 10) || 25,
        color: "#" + (parseInt(attrs[3], 10) || 16777215).toString(16).padStart(6, "0"),
        text: match[2],
      });
    }

    return NextResponse.json({ danmakus, source: "bilibili", count: danmakus.length });
  } catch {
    return NextResponse.json({ danmakus: [], source: "unavailable" });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { UA } from "@/lib/douyin";

export async function GET(request: NextRequest) {
  const targetUrl = request.nextUrl.searchParams.get("url");
  if (!targetUrl) return new NextResponse("缺少url参数", { status: 400 });

  try {
    const decoded = decodeURIComponent(targetUrl);
    const upstreamRes = await fetch(decoded, {
      headers: {
        "User-Agent": UA,
        Referer: "https://www.douyin.com/",
      },
      signal: AbortSignal.timeout(30000),
    });

    const headers = new Headers();
    const ct = upstreamRes.headers.get("content-type") || "application/octet-stream";
    headers.set("Content-Type", ct);
    headers.set("Cache-Control", "public, max-age=86400");
    headers.set("Access-Control-Allow-Origin", "*");

    const cl = upstreamRes.headers.get("content-length");
    if (cl) headers.set("Content-Length", cl);

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers,
    });
  } catch {
    return new NextResponse("代理请求失败", { status: 502 });
  }
}

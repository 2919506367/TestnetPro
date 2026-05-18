import { NextRequest } from "next/server";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const BILI_REFERER = "https://www.bilibili.com";

function buildHeaders(clientRange: string | null) {
  const headers: Record<string, string> = {
    "User-Agent": UA,
    Referer: BILI_REFERER,
    Origin: BILI_REFERER,
  };

  const cookie = process.env.BILI_COOKIE;
  if (cookie) {
    headers["Cookie"] = cookie;
  }

  if (clientRange) {
    headers["Range"] = clientRange;
  }

  return headers;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(targetUrl);
  } catch {
    return new Response("Invalid url encoding", { status: 400 });
  }

  if (
    (!decodedUrl.startsWith("https://") && !decodedUrl.startsWith("http://")) ||
    (!decodedUrl.includes("bilibili.com") &&
      !decodedUrl.includes("bilivideo.com") &&
      !decodedUrl.includes("hdslb.com"))
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  const clientRange = request.headers.get("range");

  try {
    const upstreamRes = await fetch(decodedUrl, {
      headers: buildHeaders(clientRange),
      redirect: "follow",
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return new Response("Upstream fetch failed", { status: upstreamRes.status });
    }

    const responseHeaders = new Headers();

    const forwardHeaders = [
      "content-range", "accept-ranges", "content-length", "content-type",
      "etag", "last-modified", "cache-control", "expires",
    ];
    for (const h of forwardHeaders) {
      const v = upstreamRes.headers.get(h);
      if (v) {
        if (h === "content-range") responseHeaders.set("Content-Range", v);
        else if (h === "accept-ranges") responseHeaders.set("Accept-Ranges", v);
        else if (h === "content-length") responseHeaders.set("Content-Length", v);
        else if (h === "content-type") responseHeaders.set("Content-Type", v);
        else if (h === "etag") responseHeaders.set("ETag", v);
        else if (h === "last-modified") responseHeaders.set("Last-Modified", v);
        else if (h === "cache-control") responseHeaders.set("X-Upstream-Cache-Control", v);
        else if (h === "expires") responseHeaders.set("Expires", v);
      }
    }

    const contentType = upstreamRes.headers.get("content-type") || "";
    if (!contentType) responseHeaders.set("Content-Type", "video/mp4");

    if (contentType.startsWith("image/")) {
      responseHeaders.set("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800");
    } else if (contentType.startsWith("video/") || contentType.startsWith("audio/")) {
      responseHeaders.set("Cache-Control", "public, max-age=60, s-maxage=60");
    } else {
      responseHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
    }
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Headers", "Range, Content-Range, Content-Type");
    responseHeaders.set("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length, ETag, Last-Modified");

    const status = clientRange && upstreamRes.status === 206 ? 206 : upstreamRes.status;

    return new Response(upstreamRes.body, {
      status,
      headers: responseHeaders,
    });
  } catch {
    return new Response("Proxy error", { status: 502 });
  }
}

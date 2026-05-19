import { NextRequest, NextResponse } from "next/server";

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 30;
const rateMap = new Map<string, { count: number; reset: number }>();

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./,
  /^fc00:/i,
  /^fe80:/i,
  /^::1$/,
  /^localhost$/i,
];

function isPrivateHost(host: string): boolean {
  return PRIVATE_RANGES.some((r) => r.test(host));
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.reset) {
    rateMap.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

const BASE_PATH = "/api/proxy";
const EXCLUDED_TAGS = /<(script|noscript|iframe|embed|object|applet|meta|link|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const EXCLUDED_SELF_TAGS = /<(script|noscript|iframe|embed|object|applet|meta|link|style)\b[^>]*\/?\s*>/gi;

function rewriteUrls(html: string, proxyOrigin: string): string {
  const attrPattern = /\b(src|href|action|srcset|data-src|data-href|poster|background|cite|longdesc|profile|usemap|formaction|manifest|ping)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>"'=]+))/gi;

  return html.replace(attrPattern, (full, attr, quoted, dq, sq, unq) => {
    const raw = dq || sq || unq;
    if (!raw) return full;
    if (raw.startsWith("data:") || raw.startsWith("javascript:") || raw.startsWith("mailto:") || raw.startsWith("#") || raw.startsWith("blob:") || raw.startsWith("ws")) return full;
    if (raw.includes(BASE_PATH)) return full;
    const q = dq ? '"' : sq ? "'" : "";
    return `${attr}=${q}${proxyOrigin}?url=${encodeURIComponent(raw)}${q}`;
  });
}

function rewriteCssUrls(css: string, proxyOrigin: string): string {
  return css.replace(/url\(\s*(['"]?)([^'"()]+)\1\s*\)/gi, (_full, _q, raw) => {
    if (raw.startsWith("data:") || raw.includes(BASE_PATH)) return _full;
    return `url('${proxyOrigin}?url=${encodeURIComponent(raw.trim())}')`;
  });
}

export async function GET(request: NextRequest) {
  const reqUrl = new URL(request.url);
  const myOrigin = reqUrl.origin;
  const proxyOrigin = `${myOrigin}${BASE_PATH}`;

  if (reqUrl.pathname !== BASE_PATH) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const realIp = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(realIp)) {
    return new NextResponse("请求太频繁，请稍后再试", { status: 429 });
  }

  const targetUrl = reqUrl.searchParams.get("url");
  if (!targetUrl) {
    return new NextResponse("缺少 url 参数", { status: 400 });
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(targetUrl);
  } catch {
    return new NextResponse("url 参数编码错误", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(decoded);
  } catch {
    return new NextResponse("无效 URL", { status: 400 });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return new NextResponse("只允许 http 和 https 协议", { status: 400 });
  }

  if (parsed.hostname.includes("cloud-drive") || parsed.hostname.includes("localhost") || parsed.hostname.includes("127.0.0.1")) {
    return new NextResponse("不允许代理本站地址", { status: 400 });
  }

  if (isPrivateHost(parsed.hostname)) {
    return new NextResponse("不允许访问内网地址", { status: 400 });
  }

  try {
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    };

    const upstreamRes = await fetch(decoded, { headers, redirect: "follow" });

    const ct = upstreamRes.headers.get("content-type") || "";

    if (ct.startsWith("text/html") || ct.includes("application/xhtml")) {
      let html = await upstreamRes.text();
      html = html.replace(EXCLUDED_SELF_TAGS, "");
      html = html.replace(EXCLUDED_TAGS, "");
      html = html.replace(/<head\b[^>]*>/i, (match) => {
        return `${match}\n<base href="${decoded}" target="_self">`;
      });
      html = rewriteUrls(html, proxyOrigin);
      const responseHeaders = new Headers();
      responseHeaders.set("Content-Type", "text/html; charset=utf-8");
      responseHeaders.set("X-Frame-Options", "SAMEORIGIN");
      responseHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
      return new NextResponse(html, { status: 200, headers: responseHeaders });
    }

    if (ct.startsWith("text/css")) {
      let css = await upstreamRes.text();
      css = rewriteCssUrls(css, proxyOrigin);
      const responseHeaders = new Headers();
      responseHeaders.set("Content-Type", "text/css; charset=utf-8");
      responseHeaders.set("Cache-Control", "public, max-age=3600");
      return new NextResponse(css, { status: 200, headers: responseHeaders });
    }

    const responseHeaders = new Headers();
    const passHeaders = ["content-type", "content-length", "content-disposition", "cache-control", "etag", "last-modified", "expires"];
    for (const h of passHeaders) {
      const v = upstreamRes.headers.get(h);
      if (v) responseHeaders.set(h, v);
    }
    if (!responseHeaders.has("content-type")) responseHeaders.set("Content-Type", "application/octet-stream");
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Cache-Control", "public, max-age=3600");

    return new NextResponse(upstreamRes.body, { status: upstreamRes.status, headers: responseHeaders });
  } catch {
    return new NextResponse("代理请求失败，目标网站无法访问", { status: 502 });
  }
}

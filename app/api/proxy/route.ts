import { NextRequest, NextResponse } from "next/server";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function rewriteUrls(html: string, proxyBase: string): string {
  const attrs = [
    "src", "href", "action", "srcset", "data-src", "data-href",
    "poster", "background", "formaction", "manifest", "ping",
  ];
  const re = new RegExp(
    `\\b(${attrs.join("|")})\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>"'=]+))`,
    "gi"
  );

  return html.replace(re, (_full, attr, _quoted, dq, sq, unq) => {
    const raw = (dq || sq || unq || "").trim();
    if (!raw) return _full;
    if (/^(data:|javascript:|mailto:|#|blob:|ws:|about:|chrome-extension:|moz-extension:)/i.test(raw)) return _full;
    if (raw.includes("/api/proxy")) return _full;
    const q = dq !== undefined ? '"' : sq !== undefined ? "'" : "";
    return `${attr}=${q}${proxyBase}?url=${encodeURIComponent(raw)}${q}`;
  });
}

function rewriteCssUrls(css: string, proxyBase: string): string {
  return css.replace(
    /url\(\s*(["']?)([^"')]+)\1\s*\)/gi,
    (_full, _q, raw) => {
      if (/^(data:|#|blob:)/i.test(raw.trim())) return _full;
      if (raw.includes("/api/proxy")) return _full;
      return `url('${proxyBase}?url=${encodeURIComponent(raw.trim())}')`;
    }
  );
}

export async function GET(request: NextRequest) {
  const reqUrl = new URL(request.url);
  const proxyBase = `${reqUrl.origin}/api/proxy`;
  const targetUrl = reqUrl.searchParams.get("url");

  if (!targetUrl) return new NextResponse("缺少 url 参数", { status: 400 });

  let decoded: string;
  try {
    decoded = decodeURIComponent(targetUrl);
  } catch {
    return new NextResponse("url 编码错误", { status: 400 });
  }

  try {
    const upstreamRes = await fetch(decoded, {
      headers: {
        "User-Agent": UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
      redirect: "manual",
    });

    const status = upstreamRes.status;
    const ct = upstreamRes.headers.get("content-type") || "";

    if (status >= 300 && status < 400) {
      let loc = upstreamRes.headers.get("location") || "";
      if (loc) {
        try {
          loc = new URL(loc, decoded).href;
        } catch {}
        return NextResponse.redirect(
          `${proxyBase}?url=${encodeURIComponent(loc)}`,
          status === 301 ? 301 : 302
        );
      }
    }

    const isHTML = ct.includes("text/html") || ct.includes("application/xhtml");
    const isCSS = ct.includes("text/css");

    const responseHeaders = new Headers();

    for (const h of ["content-type", "content-disposition", "cache-control", "etag", "last-modified", "expires", "set-cookie", "vary"]) {
      const v = upstreamRes.headers.get(h);
      if (v) {
        if (h === "set-cookie") {
          responseHeaders.append("Set-Cookie", v);
        } else {
          responseHeaders.set(h, v);
        }
      }
    }

    if (isHTML) {
      let html = await upstreamRes.text();
      html = rewriteUrls(html, proxyBase);
      responseHeaders.set("Content-Type", "text/html; charset=utf-8");
      responseHeaders.delete("content-encoding");
      responseHeaders.set("Cache-Control", "no-cache");
      return new NextResponse(html, { status: 200, headers: responseHeaders });
    }

    if (isCSS) {
      let css = await upstreamRes.text();
      css = rewriteCssUrls(css, proxyBase);
      responseHeaders.set("Content-Type", "text/css; charset=utf-8");
      responseHeaders.delete("content-encoding");
      responseHeaders.set("Cache-Control", "public, max-age=300");
      return new NextResponse(css, { status: 200, headers: responseHeaders });
    }

    ["content-length", "content-encoding"].forEach((h) => {
      const v = upstreamRes.headers.get(h);
      if (v) responseHeaders.set(h, v);
    });
    if (!responseHeaders.has("content-type"))
      responseHeaders.set("Content-Type", "application/octet-stream");

    return new NextResponse(upstreamRes.body, {
      status,
      headers: responseHeaders,
    });
  } catch {
    return new NextResponse("目标网站无法访问", { status: 502 });
  }
}

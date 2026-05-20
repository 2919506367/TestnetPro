import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const runtime = "nodejs";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const CLIENT_JS = `
(function(){
var P="/api/proxy";
var U=new URL(window.location.href).searchParams.get("url")||"";
if(U&&!U.startsWith("http"))U="https://"+U;
var R=U?new URL(U).origin:"";

function $(p){
  if(!p)return p;
  try{if(typeof p==="string"&&/^(data:|javascript:|mailto:|#|blob:|ws:|about:|chrome|edge)/i.test(p))return p}catch(e){}
  if(typeof p==="string"&&p.indexOf(P)!==-1)return p;
  try{return P+"?url="+encodeURIComponent(new URL(p,U).href)+"&ref="+encodeURIComponent(R)}catch(e){return p}
}

/* --- network --- */
var _o=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(m,a,b,u,p){arguments[1]=$(a);return _o.apply(this,arguments)};
var _f=window.fetch;
window.fetch=function(i,o){var u=typeof i==="string"?i:(i instanceof Request?i.url:i);var n=$(u);if(typeof i==="string")return _f(n,o);else{var r=new Request(n,i);return _f(r,o)}};

var _open=window.open.bind(window);
window.open=function(u,n,f){return _open($(u),n,f)};
var _assign=location.assign.bind(location);
location.assign=function(u){_assign($(u))};
var _replace=location.replace.bind(location);
location.replace=function(u){_replace($(u))};

/* --- setAttribute --- */
var _sa=Element.prototype.setAttribute;
Element.prototype.setAttribute=function(n,v){
  if(n==="src"||n==="href"||n==="srcset"||n==="poster"||n==="data"||n==="action"||n==="data-src"||n==="data-original"||n==="data-srcset"||n==="data-thumb"||n==="data-cover")v=$(v);
  return _sa.call(this,n,v);
};

/* --- history --- */
var _ps=History.prototype.pushState;
History.prototype.pushState=function(s,t,u){return _ps.apply(this,[s,t,$(u)])};
var _rs=History.prototype.replaceState;
History.prototype.replaceState=function(s,t,u){return _rs.apply(this,[s,t,$(u)])};

/* --- property setters --- */
function hp(proto,prop){
  try{var d=Object.getOwnPropertyDescriptor(proto,prop);if(d&&d.set){var o=d.set;Object.defineProperty(proto,prop,{get:d.get,set:function(v){return o.call(this,$(v))},configurable:true})}}catch(e){}
}
hp(HTMLAnchorElement.prototype,'href');
hp(HTMLImageElement.prototype,'src');
hp(HTMLImageElement.prototype,'srcset');
hp(HTMLScriptElement.prototype,'src');
hp(HTMLIFrameElement.prototype,'src');
hp(HTMLVideoElement.prototype,'src');
hp(HTMLVideoElement.prototype,'poster');
hp(HTMLAudioElement.prototype,'src');
hp(HTMLSourceElement.prototype,'src');
hp(HTMLEmbedElement.prototype,'src');
hp(HTMLInputElement.prototype,'src');
hp(HTMLLinkElement.prototype,'href');
hp(HTMLFormElement.prototype,'action');
hp(HTMLObjectElement.prototype,'data');

/* --- form submit: save native, guard double-proxy --- */
var _sub=HTMLFormElement.prototype.submit.bind(HTMLFormElement.prototype);
HTMLFormElement.prototype.submit=function(){
  var f=this,a=f.getAttribute("action")||U;
  if(!a||a.indexOf(P)!==-1)return _sub.call(f);
  try{f.setAttribute("action",P+"?url="+encodeURIComponent(new URL(a,U).href)+"&ref="+encodeURIComponent(R))}catch(e){}
  return _sub.call(f)
};
document.addEventListener("submit",function(e){
  var f=e.target;if(!f||f.tagName!=="FORM")return;
  var a=f.getAttribute("action");
  if(a&&a.indexOf(P)!==-1)return;
  e.preventDefault();
  var fd=new FormData(f);var q=new URLSearchParams(fd).toString();var aa=f.getAttribute("action")||U;
  try{var b=new URL(aa,U);if((f.method||"get").toUpperCase()==="GET"||!f.method){b.search=q?(b.search?b.search+"&"+q:q):b.search;location.href=$(b.href)}else{f.setAttribute("action",$(b.href));_sub.call(f)}}catch(e2){}
},true);

/* --- click capture fallback for dynamic navigation --- */
document.addEventListener("click",function(e){
  if(e.defaultPrevented)return;
  var el=e.target;
  while(el&&el.nodeType===1){
    var tag=el.tagName.toLowerCase();
    if(tag==="a"||tag==="area"||(tag==="button"&&el.getAttribute("data-href"))){
      var href=el.getAttribute("href")||el.getAttribute("data-href");
      if(href&&href.indexOf(P)===-1&&!/^(javascript:|#)/i.test(href)){
        e.preventDefault();
        location.href=$(href);
        return;
      }
      return;
    }
    el=el.parentElement;
  }
},true);

/* --- DOM patching (lightweight, childList only, shallow) --- */
function fixOne(el){
  if(!el||el.nodeType!==1||!el.hasAttribute)return;
  if(el.tagName==="SCRIPT"&&el.src&&el.src.indexOf(P)===-1)el.src=$(el.src);
  if(el.hasAttribute("integrity"))el.removeAttribute("integrity");
  var attrs=["src","href","srcset","poster","data","action","data-src","data-original","data-srcset","data-thumb","data-cover"];
  for(var i=0;i<attrs.length;i++){var a=attrs[i];if(el.hasAttribute(a))el.setAttribute(a,$(el.getAttribute(a)))}
}

var pending=[];
var flushing=false;
function flush(){
  flushing=false;
  var batch=pending.splice(0,pending.length);
  for(var i=0;i<batch.length;i++){
    try{
      var n=batch[i];
      if(!n)continue;
      fixOne(n);
      if(n.children)for(var j=0;j<Math.min(n.children.length,50);j++)fixOne(n.children[j]);
    }catch(e){}
  }
}

function schedule(n){
  pending.push(n);
  if(!flushing){flushing=true;queueMicrotask(flush)}
}

new MutationObserver(function(ms){
  for(var i=0;i<ms.length;i++){
    var m=ms[i];
    for(var j=0;j<m.addedNodes.length;j++){
      if(m.addedNodes[j].nodeType===1)schedule(m.addedNodes[j]);
    }
  }
}).observe(document.documentElement,{childList:true,subtree:true});

if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",function(){fixOne(document.documentElement)})}else{fixOne(document.documentElement)}

window.addEventListener("error",function(e){
  var t=e.target;
  if(t&&t.tagName==="SCRIPT"&&t.src&&!t.__p){t.__p=true;t.src=$(t.src)}
},true);

})();
`;

const FORWARD_HEADERS = [
  "content-type", "content-length", "content-encoding", "content-language",
  "content-disposition", "content-range", "accept-ranges",
  "cache-control", "age", "expires", "last-modified", "etag", "vary", "date", "pragma",
];

// --- URL rewriting helpers ---

function rewriteCssText(css: string): string {
  return css.replace(
    /url\(\s*(["']?)([^"')]+)\1\s*\)/gi,
    (full, q, raw) => {
      const r = raw.trim();
      if (/^(data:|#|blob:)/i.test(r)) return full;
      if (r.includes("/api/proxy")) return full;
      return `url(${q}/api/proxy?url=${encodeURIComponent(r)}${q})`;
    }
  );
}

function rewriteUrl(val: string | null | undefined, baseUrl: string): string | null | undefined {
  if (!val) return val;
  if (/^(data:|javascript:|mailto:|#|blob:|about:)/i.test(val)) return val;
  if (val.includes("/api/proxy")) return val;
  try {
    return `/api/proxy?url=${encodeURIComponent(new URL(val, baseUrl).href)}`;
  } catch {
    return val;
  }
}

function rewriteSrcset(val: string | null | undefined, baseUrl: string): string | null | undefined {
  if (!val) return val;
  if (val.includes("/api/proxy")) return val;
  const candidates = val.split(",").map((c) => c.trim());
  const rewritten = candidates.map((c) => {
    const m = /^\s*(\S+)\s*(.*)/.exec(c);
    if (!m) return c;
    const url = m[1];
    const desc = m[2] || "";
    if (/^(data:|#|blob:)/i.test(url) || url.includes("/api/proxy")) return c;
    try {
      return `/api/proxy?url=${encodeURIComponent(new URL(url, baseUrl).href)} ${desc}`.trim();
    } catch {
      return c;
    }
  });
  return rewritten.join(", ");
}

// --- HTML parsing (server-side rewrite, one pass) ---

function parseAndRewriteHtml(html: string, baseUrl: string): string {
  const $ = cheerio.load(html, {}, false);

  // Rewrite src/srcset/poster/lazy on media elements
  const MEDIA_TAGS = ["img", "video", "audio", "source", "script", "iframe", "embed"];
  const LAZY_ATTRS = ["data-src", "data-original", "data-srcset", "data-thumb", "data-cover"];

  for (const tag of MEDIA_TAGS) {
    $(tag).each((_, el) => {
      const $el = $(el);
      const src = $el.attr("src");
      if (src) $el.attr("src", rewriteUrl(src, baseUrl));
      const ss = $el.attr("srcset");
      if (ss) $el.attr("srcset", rewriteSrcset(ss, baseUrl));
      const poster = $el.attr("poster");
      if (poster) $el.attr("poster", rewriteUrl(poster, baseUrl));
      for (const a of LAZY_ATTRS) {
        const v = $el.attr(a);
        if (v) {
          const rewritten = a.endsWith("srcset") ? rewriteSrcset(v, baseUrl) : rewriteUrl(v, baseUrl);
          if (rewritten) $el.attr(a, rewritten);
        }
      }
    });
  }

  // href on <a>, <area>, <link>
  for (const tag of ["a", "area", "link"]) {
    $(tag).each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href");
      if (href) $el.attr("href", rewriteUrl(href, baseUrl));
    });
  }

  // form action
  $("form").each((_, el) => {
    const $el = $(el);
    const action = $el.attr("action");
    if (action) $el.attr("action", rewriteUrl(action, baseUrl));
  });

  // object data
  $("object").each((_, el) => {
    const $el = $(el);
    const d = $el.attr("data");
    if (d) $el.attr("data", rewriteUrl(d, baseUrl));
  });

  // meta refresh
  $('meta[http-equiv="refresh"]').each((_, el) => {
    const $el = $(el);
    const content = $el.attr("content");
    if (content) {
      const rewritten = content.replace(/url=([^;]+)/i, (_, u) => {
        return `url=${rewriteUrl(u.trim(), baseUrl)}`;
      });
      $el.attr("content", rewritten);
    }
  });

  // style tags
  $("style").each((_, el) => {
    const css = $(el).html();
    if (css) $(el).html(rewriteCssText(css));
  });

  // inline style
  $("[style]").each((_, el) => {
    const s = $(el).attr("style");
    if (s) $(el).attr("style", rewriteCssText(s));
  });

  // Delete <base> entirely — don't rewrite, just remove
  $("base").remove();

  // Remove integrity/crossorigin
  $("[integrity]").removeAttr("integrity");
  $("[crossorigin]").removeAttr("crossorigin");

  // Inject client JS
  $("head").prepend(`<script>${CLIENT_JS}</script>`);

  return $.html();
}

// --- Main Proxy Handler ---

async function handleProxy(request: NextRequest) {
  const targetUrl = request.nextUrl.searchParams.get("url");
  if (!targetUrl) return homepage();

  let decoded: string;
  try { decoded = decodeURIComponent(targetUrl); } catch { return homepage(); }

  const refParam = request.nextUrl.searchParams.get("ref") || "";
  const clientRange = request.headers.get("range");
  const method = request.method;

  let refDomain = refParam;
  try { if (!refDomain) refDomain = new URL(decoded).origin; } catch {}

  try {
    const upstreamHeaders: Record<string, string> = {
      "User-Agent": UA,
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    };
    if (refDomain) {
      upstreamHeaders["Referer"] = refDomain;
      upstreamHeaders["Origin"] = refDomain;
    }
    if (clientRange) upstreamHeaders["Range"] = clientRange;

    const proxyCookie = request.headers.get("cookie");
    if (proxyCookie) upstreamHeaders["Cookie"] = proxyCookie;

    const clientCT = request.headers.get("content-type");
    if (clientCT) upstreamHeaders["Content-Type"] = clientCT;
    const clientAccept = request.headers.get("accept");
    if (clientAccept) upstreamHeaders["Accept"] = clientAccept;

    let upstreamBody: BodyInit | null = null;
    if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
      upstreamBody = request.body;
    }

    const upstreamRes = await fetch(decoded, {
      method,
      headers: upstreamHeaders,
      body: upstreamBody,
      redirect: "follow",
      signal: AbortSignal.timeout(60000),
    });

    const status = upstreamRes.status;
    const ct = upstreamRes.headers.get("content-type") || "";

    // Redirect
    if (status >= 300 && status < 400) {
      let loc = upstreamRes.headers.get("location") || "";
      if (loc) {
        try { loc = new URL(loc, decoded).href; } catch {}
        const refQ = refDomain ? `&ref=${encodeURIComponent(refDomain)}` : "";
        return new Response(null, {
          status,
          headers: { Location: `/api/proxy?url=${encodeURIComponent(loc)}${refQ}` },
        });
      }
    }

    const isHTML = ct.includes("text/html") || ct.includes("application/xhtml");
    const isCSS = ct.includes("text/css");
    const isMedia = ct.includes("video/") || ct.includes("audio/");
    const isImage = ct.includes("image/");

    const responseHeaders = new Headers();

    // Forward ALL Set-Cookie values (use getSetCookie if available)
    if ("getSetCookie" in upstreamRes.headers && typeof (upstreamRes.headers as { getSetCookie: () => string[] }).getSetCookie === "function") {
      const cookies = (upstreamRes.headers as unknown as { getSetCookie(): string[] }).getSetCookie();
      for (const c of cookies) responseHeaders.append("Set-Cookie", c);
    } else {
      const raw = upstreamRes.headers.get("set-cookie");
      if (raw) {
        const parts = raw.split(/,(?=\s*\S+\s*=)/);
        for (const p of parts) responseHeaders.append("Set-Cookie", p.trim());
      }
    }

    if (isHTML) {
      let html = await upstreamRes.text();
      html = parseAndRewriteHtml(html, decoded);
      responseHeaders.set("Content-Type", "text/html; charset=utf-8");
      responseHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
      return new NextResponse(html, { status: 200, headers: responseHeaders });
    }

    if (isCSS) {
      let css = await upstreamRes.text();
      css = rewriteCssText(css);
      responseHeaders.set("Content-Type", "text/css; charset=utf-8");
      responseHeaders.set("Cache-Control", "public, max-age=86400");
      return new NextResponse(css, { status: 200, headers: responseHeaders });
    }

    if (isMedia) {
      responseHeaders.set("Content-Type", ct);
      responseHeaders.set("Accept-Ranges", "bytes");
      responseHeaders.set("Cache-Control", "public, max-age=60");
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Access-Control-Allow-Headers", "Range, Content-Range");
      responseHeaders.set("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length, ETag");
      const cr = upstreamRes.headers.get("content-range");
      if (cr) responseHeaders.set("Content-Range", cr);
      const cl = upstreamRes.headers.get("content-length");
      if (cl) responseHeaders.set("Content-Length", cl);
      const st = clientRange && status === 206 ? 206 : status;
      return new Response(upstreamRes.body, { status: st, headers: responseHeaders });
    }

    if (isImage) {
      responseHeaders.set("Content-Type", ct);
      responseHeaders.set("Cache-Control", "public, max-age=604800, immutable");
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      const cl = upstreamRes.headers.get("content-length");
      if (cl) responseHeaders.set("Content-Length", cl);
      return new Response(upstreamRes.body, { status, headers: responseHeaders });
    }

    // Generic passthrough
    for (const h of FORWARD_HEADERS) {
      const v = upstreamRes.headers.get(h);
      if (v) responseHeaders.set(h, v);
    }
    if (!responseHeaders.has("content-type")) responseHeaders.set("Content-Type", "application/octet-stream");
    if (!responseHeaders.has("cache-control")) responseHeaders.set("Cache-Control", "public, max-age=3600");

    return new Response(upstreamRes.body, { status, headers: responseHeaders });
  } catch {
    return new NextResponse("目标网站无法访问", { status: 502 });
  }
}

function homepage() {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>超级浏览器</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:linear-gradient(135deg,#0a0a0a 0%,#1a1a2e 50%,#16213e 100%);min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff}
.container{text-align:center;max-width:640px;padding:2rem}
h1{font-size:2.5rem;margin-bottom:.5rem;background:linear-gradient(90deg,#60a5fa,#a78bfa,#f472b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
p{color:#94a3b8;margin-bottom:2rem;font-size:1.05rem}
.form{display:flex;gap:.5rem;background:rgba(255,255,255,.06);border-radius:1rem;padding:.4rem;border:1px solid rgba(255,255,255,.1)}
.form:focus-within{border-color:rgba(96,165,250,.5);box-shadow:0 0 20px rgba(96,165,250,.15)}
.form input{flex:1;padding:.9rem 1rem;background:transparent;border:none;outline:none;color:#fff;font-size:1rem}
.form input::placeholder{color:#64748b}
.form button{background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;border:none;padding:.9rem 1.8rem;border-radius:.7rem;font-size:1rem;font-weight:600;cursor:pointer;transition:opacity .2s;white-space:nowrap}
.form button:hover{opacity:.9}
.quick{display:flex;gap:.75rem;flex-wrap:wrap;justify-content:center;margin-top:2rem}
.quick a{display:flex;align-items:center;gap:.5rem;padding:.6rem 1.2rem;border-radius:2rem;font-size:.9rem;text-decoration:none;background:rgba(255,255,255,.06);color:#cbd5e1;border:1px solid rgba(255,255,255,.08);transition:all .2s}
.quick a:hover{background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.2)}
.note{margin-top:3rem;color:#475569;font-size:.8rem}
</style>
</head>
<body>
<div class="container">
<h1>超级浏览器</h1>
<p>通过 VPS 代理访问任意网站，绕过网络限制</p>
<div class="form">
<input type="text" id="url" placeholder="输入网址，如 bilibili.com ..." autofocus>
<button onclick="go()">前往</button>
</div>
<div class="quick">
<a href="#" onclick="qn('bing.com')">🔍 必应</a>
<a href="#" onclick="qn('bilibili.com')">📺 哔哩哔哩</a>
<a href="#" onclick="qn('baidu.com')">🔎 百度</a>
<a href="#" onclick="qn('github.com')">💻 GitHub</a>
<a href="#" onclick="qn('zhihu.com')">💬 知乎</a>
</div>
<p class="note">所有流量通过服务器中转，保护本机隐私</p>
</div>
<script>
function go(){var u=document.getElementById('url').value.trim();if(!u)return;if(!/^https?:\\/\\//i.test(u))u='https://'+u;location.href='/api/proxy?url='+encodeURIComponent(u)+'&ref='+encodeURIComponent(new URL(u).origin)}
function qn(u){location.href='/api/proxy?url='+encodeURIComponent('https://'+u)+'&ref='+encodeURIComponent('https://'+u)}
</script>
</body>
</html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(request: NextRequest) { return handleProxy(request); }
export async function POST(request: NextRequest) { return handleProxy(request); }
export async function PUT(request: NextRequest) { return handleProxy(request); }
export async function PATCH(request: NextRequest) { return handleProxy(request); }
export async function DELETE(request: NextRequest) { return handleProxy(request); }
export async function HEAD(request: NextRequest) { return handleProxy(request); }
export async function OPTIONS(request: NextRequest) { return handleProxy(request); }

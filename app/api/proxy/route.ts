import { NextRequest, NextResponse } from "next/server";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const CLIENT_JS = `
(function(){
var P="/api/proxy";
var U=new URL(window.location.href).searchParams.get("url")||"";
if(U&&!U.startsWith("http"))U="https://"+U;
var REF=U?new URL(U).origin:"";

function $(p){
  if(!p)return p;
  try{if(typeof p==="string"&&/^(data:|javascript:|mailto:|#|blob:|ws:|about:|chrome|edge)/i.test(p))return p}catch(e){}
  if(typeof p==="string"&&p.indexOf(P)!==-1)return p;
  try{
    var abs=new URL(p,U).href;
    return P+"?url="+encodeURIComponent(abs)+"&ref="+encodeURIComponent(REF);
  }catch(e){return p}
}

function cssUrlT(txt){
  if(!txt||typeof txt!=="string")return txt;
  return txt.replace(/url\\(\\s*(["']?)([^"')]+)\\1\\)/gi,function(m,q,rw){
    var rr=rw.trim();
    if(/^(data:|#|blob:)/i.test(rr))return m;
    if(rr.indexOf(P)!==-1)return m;
    try{return"url("+q+$(new URL(rr,U).href)+q+")"}catch(e2){return m}
  });
}

/* ---- network ---- */
var _o=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(m,a,b,u,p){arguments[1]=$(a);return _o.apply(this,arguments)};
var _f=window.fetch;
window.fetch=function(i,o){var u=typeof i==="string"?i:(i instanceof Request?i.url:i);var n=$(u);if(typeof i==="string")return _f(n,o);else{var r=new Request(n,i);return _f(r,o)}};
window.open=function(u,n,f){return Function.prototype.call.call(window.open,window,$(u),n,f)};
var _assign=window.location.assign.bind(window.location);
window.location.assign=function(u){_assign($(u))};
var _replace=window.location.replace.bind(window.location);
window.location.replace=function(u){_replace($(u))};

/* ---- setAttribute (covers all attribute-based URL setting) ---- */
var _sa=Element.prototype.setAttribute;
Element.prototype.setAttribute=function(n,v){
  if(n==="src"||n==="href"||n==="srcset"||n==="poster"||n==="data"||n==="action"||n==="data-src"||n==="data-original"||n==="data-srcset"||n==="data-thumb"||n==="data-cover")v=$(v);
  if(n==="style")v=cssUrlT(v);
  return _sa.call(this,n,v);
};

/* ---- history ---- */
var _push=History.prototype.pushState;
History.prototype.pushState=function(s,t,u){return _push.apply(this,[s,t,$(u)])};
var _rstate=History.prototype.replaceState;
History.prototype.replaceState=function(s,t,u){return _rstate.apply(this,[s,t,$(u)])};

/* ---- direct property setters ---- */
function hp(proto,prop){
  try{
    var d=Object.getOwnPropertyDescriptor(proto,prop);
    if(d&&d.set){
      var o=d.set;
      Object.defineProperty(proto,prop,{get:d.get,set:function(v){return o.call(this,$(v))},configurable:true,enumerable:true})
    }
  }catch(e){}
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

/* ---- CSSOM style interception ---- */
try{
  var _sp=CSSStyleDeclaration.prototype.setProperty;
  CSSStyleDeclaration.prototype.setProperty=function(p,v,prio){
    if(typeof v==="string"&&v.indexOf("url(")!==-1&&(p==="background-image"||p==="background"||p==="list-style-image"||p==="border-image"||p==="mask"||p==="mask-image"))v=cssUrlT(v);
    return _sp.call(this,p,v,prio);
  };
  var _bg=Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype,'backgroundImage');
  if(_bg&&_bg.set){var obs=_bg.set;Object.defineProperty(CSSStyleDeclaration.prototype,'backgroundImage',{get:_bg.get,set:function(v){return obs.call(this,typeof v==="string"&&v.indexOf("url(")!==-1?cssUrlT(v):v)},configurable:true})}
  var _bgs=Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype,'background');
  if(_bgs&&_bgs.set){var obs2=_bgs.set;Object.defineProperty(CSSStyleDeclaration.prototype,'background',{get:_bgs.get,set:function(v){return obs2.call(this,typeof v==="string"&&v.indexOf("url(")!==-1?cssUrlT(v):v)},configurable:true})}
}catch(e){}

/* ---- form submit ---- */
var _submit=HTMLFormElement.prototype.submit;
HTMLFormElement.prototype.submit=function(){
  var f=this,a=f.action||U;
  try{var b=new URL(a,U);f.action=P+"?url="+encodeURIComponent(b.href)+"&ref="+encodeURIComponent(REF)}catch(e){}
  return _submit.call(f)
};

document.addEventListener("submit",function(e){
  var f=e.target;
  if(!f||f.tagName!=="FORM")return;
  if(f.action&&f.action.indexOf(P)!==-1)return;
  e.preventDefault();
  var fd=new FormData(f);
  var q=new URLSearchParams(fd).toString();
  var a=f.action||U;
  try{
    var b=new URL(a,U);
    if((f.method||"get").toUpperCase()==="GET"||!f.method){
      b.search=q?(b.search?b.search+"&"+q:q):b.search;
      window.location.href=$(b.href);
    }else{
      f.action=$(b.href);
      f.submit()
    }
  }catch(e2){}
},true);

/* ---- DOM patching ---- */
function rewriteLazy(el){
  if(!el||el.nodeType!==1||!el.hasAttribute)return;
  var lazy=["data-src","data-original","data-srcset"];
  for(var i=0;i<lazy.length;i++){
    var a=lazy[i];
    if(el.hasAttribute(a))el.setAttribute(a,$(el.getAttribute(a)));
  }
}
function fix(e){
  if(e.nodeType!==1)return;
  if(e.hasAttribute&&e.hasAttribute("integrity"))e.removeAttribute("integrity");
  if(e.hasAttribute&&e.hasAttribute("src"))e.setAttribute("src",$(e.getAttribute("src")));
  if(e.hasAttribute&&e.hasAttribute("href"))e.setAttribute("href",$(e.getAttribute("href")));
  if(e.hasAttribute&&e.hasAttribute("srcset"))e.setAttribute("srcset",$(e.getAttribute("srcset")));
  if(e.hasAttribute&&e.hasAttribute("poster"))e.setAttribute("poster",$(e.getAttribute("poster")));
  if(e.hasAttribute&&e.hasAttribute("style"))e.setAttribute("style",cssUrlT(e.getAttribute("style")));
  rewriteLazy(e);
}
function fixAttr(t){
  if(t.nodeType!==1||!t.hasAttribute)return;
  if(t.hasAttribute("integrity"))t.removeAttribute("integrity");
  if(t.hasAttribute("src"))t.setAttribute("src",$(t.getAttribute("src")));
  if(t.hasAttribute("srcset"))t.setAttribute("srcset",$(t.getAttribute("srcset")));
  if(t.hasAttribute("poster"))t.setAttribute("poster",$(t.getAttribute("poster")));
  if(t.hasAttribute("href"))t.setAttribute("href",$(t.getAttribute("href")));
  if(t.hasAttribute("style"))t.setAttribute("style",cssUrlT(t.getAttribute("style")));
  rewriteLazy(t);
}
function fixAll(r){r.querySelectorAll("[src],[href],[srcset],[poster],[integrity],[style],[data-src],[data-original],[data-srcset]").forEach(function(n){if(n.nodeType===1)fix(n)});fix(r);}

window.addEventListener("load",function(){
  fixAll(document.documentElement);
  new MutationObserver(function(ms){
    ms.forEach(function(m){
      m.addedNodes.forEach(function(n){if(n.nodeType===1)fixAll(n)});
      if(m.type==="attributes")fixAttr(m.target);
    });
  }).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["src","href","srcset","poster","integrity","style","data-src","data-original","data-srcset"]})
});

window.addEventListener("error",function(e){
  var t=e.target;
  if(t&&t.tagName==="SCRIPT"&&t.src&&!t.__p){t.__p=true;t.src=$(t.src)}
},true);

})();
`;

function rewriteCssUrls(css: string): string {
  return css.replace(
    /url\(\s*(["']?)([^"')]+)\1\s*\)/gi,
    (_full, _q, raw) => {
      const r = raw.trim();
      if (/^(data:|#|blob:)/i.test(r)) return _full;
      if (r.includes("/api/proxy")) return _full;
      return `url('/api/proxy?url=${encodeURIComponent(r)}')`;
    }
  );
}

function rewriteHtmlInlineUrls(html: string, baseUrl: string): string {
  html = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi, (full) => {
    return rewriteCssUrls(full);
  });
  html = html.replace(/style\s*=\s*("([^"]*)"|'([^']*)')/gi, (full: string, _q: string, dq: string, sq: string) => {
    const raw = dq || sq || "";
    const rewritten = raw.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (_m: string, _qq: string, r: string) => {
      const rr = r.trim();
      if (/^(data:|#|blob:)/i.test(rr)) return _m;
      if (rr.includes("/api/proxy")) return _m;
      return `url('/api/proxy?url=${encodeURIComponent(new URL(rr, baseUrl).href)}')`;
    });
    const q = dq !== undefined ? '"' : "'";
    return `style=${q}${rewritten}${q}`;
  });
  return html;
}

const HOMEPAGE = `<!DOCTYPE html>
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
function go(){
  var u=document.getElementById('url').value.trim();
  if(!u) return;
  if(!/^https?:\\/\\//i.test(u)) u='https://'+u;
  location.href='/api/proxy?url='+encodeURIComponent(u)+'&ref='+encodeURIComponent(new URL(u).origin);
}
function qn(u){ location.href='/api/proxy?url='+encodeURIComponent('https://'+u)+'&ref='+encodeURIComponent('https://'+u); }
document.getElementById('url').addEventListener('keydown',function(e){ if(e.key==='Enter') go(); });
</script>
</body>
</html>`;

export async function GET(request: NextRequest) {
  const targetUrl = request.nextUrl.searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse(HOMEPAGE, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  let decoded: string;
  try { decoded = decodeURIComponent(targetUrl); } catch {
    return new NextResponse(HOMEPAGE, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  const refParam = request.nextUrl.searchParams.get("ref") || "";
  const clientRange = request.headers.get("range");

  let refDomain = refParam;
  try { if (!refDomain) refDomain = new URL(decoded).origin; } catch {}

  try {
    const reqHeaders: Record<string, string> = {
      "User-Agent": UA,
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    };
    if (refDomain) {
      reqHeaders["Referer"] = refDomain;
      reqHeaders["Origin"] = refDomain;
    }
    if (clientRange) reqHeaders["Range"] = clientRange;

    const upstreamRes = await fetch(decoded, {
      headers: reqHeaders,
      redirect: "follow",
      signal: AbortSignal.timeout(60000),
    });

    const status = upstreamRes.status;
    const ct = upstreamRes.headers.get("content-type") || "";

    if (status >= 300 && status < 400) {
      let loc = upstreamRes.headers.get("location") || "";
      if (loc) {
        try { loc = new URL(loc, decoded).href; } catch {}
        const refQuery = refDomain ? `&ref=${encodeURIComponent(refDomain)}` : "";
        return new Response(null, {
          status,
          headers: { Location: `/api/proxy?url=${encodeURIComponent(loc)}${refQuery}` },
        });
      }
    }

    const isHTML = ct.includes("text/html") || ct.includes("application/xhtml");
    const isCSS = ct.includes("text/css");
    const isMedia = ct.includes("video/") || ct.includes("audio/");
    const isImage = ct.includes("image/");

    const responseHeaders = new Headers();

    if (isHTML) {
      let html = await upstreamRes.text();
      html = html.replace(/integrity=(["'])[^"']*\1/gi, "");
      html = html.replace(/crossorigin\s*=\s*(["'])[^"']*\1/gi, "");
      html = rewriteHtmlInlineUrls(html, decoded);
      html = html.replace(/<head\b[^>]*>/i, () => `<head><base href="${decoded}"><script>${CLIENT_JS}</script>`);
      responseHeaders.set("Content-Type", "text/html; charset=utf-8");
      responseHeaders.delete("content-encoding");
      responseHeaders.delete("content-security-policy");
      responseHeaders.delete("x-frame-options");
      responseHeaders.delete("permissions-policy");
      responseHeaders.delete("referrer-policy");
      responseHeaders.set("Cache-Control", "no-cache");
      return new NextResponse(html, { status: 200, headers: responseHeaders });
    }

    if (isCSS) {
      let css = await upstreamRes.text();
      css = rewriteCssUrls(css);
      responseHeaders.set("Content-Type", "text/css; charset=utf-8");
      responseHeaders.delete("content-encoding");
      responseHeaders.set("Cache-Control", "public, max-age=86400");
      return new NextResponse(css, { status: 200, headers: responseHeaders });
    }

    if (isMedia || isImage) {
      responseHeaders.set("Content-Type", ct);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Access-Control-Allow-Headers", "Range, Content-Range");
      responseHeaders.set("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length, ETag");
      if (isMedia) {
        responseHeaders.set("Accept-Ranges", "bytes");
        responseHeaders.set("Cache-Control", "public, max-age=60");
        if (upstreamRes.headers.get("content-range"))
          responseHeaders.set("Content-Range", upstreamRes.headers.get("content-range")!);
        if (upstreamRes.headers.get("content-length"))
          responseHeaders.set("Content-Length", upstreamRes.headers.get("content-length")!);
        const st = clientRange && status === 206 ? 206 : status;
        return new Response(upstreamRes.body, { status: st, headers: responseHeaders });
      }
      responseHeaders.set("Cache-Control", "public, max-age=604800, immutable");
      ["content-length", "content-encoding"].forEach((h) => {
        const v = upstreamRes.headers.get(h);
        if (v) responseHeaders.set(h, v);
      });
      return new Response(upstreamRes.body, { status, headers: responseHeaders });
    }

    for (const h of ["content-type", "content-length", "content-encoding", "cache-control", "etag", "last-modified", "expires", "set-cookie"]) {
      const v = upstreamRes.headers.get(h);
      if (v) {
        if (h === "set-cookie") responseHeaders.append("Set-Cookie", v);
        else responseHeaders.set(h, v);
      }
    }
    if (!responseHeaders.has("content-type")) responseHeaders.set("Content-Type", "application/octet-stream");
    if (!responseHeaders.has("cache-control")) responseHeaders.set("Cache-Control", "public, max-age=3600");

    return new NextResponse(upstreamRes.body, { status, headers: responseHeaders });
  } catch {
    return new NextResponse("目标网站无法访问", { status: 502 });
  }
}

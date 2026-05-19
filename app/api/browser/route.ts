import { NextRequest, NextResponse } from "next/server";
import {
  createSession, navigate, clickAt, scrollBy, typeText, pressKey,
  goBack, goForward, refresh, closeSession,
} from "@/lib/browser-session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId, url, x, y, deltaY, text, key } = body as Record<string, unknown>;

    switch (action) {
      case "create": {
        const result = await createSession();
        return NextResponse.json(result);
      }
      case "navigate": {
        if (!sessionId || !url) return NextResponse.json({ error: "缺少参数" }, { status: 400 });
        const result = await navigate(String(sessionId), String(url));
        if ("error" in result) return NextResponse.json(result, { status: 404 });
        return NextResponse.json(result);
      }
      case "click": {
        if (!sessionId || typeof x !== "number" || typeof y !== "number")
          return NextResponse.json({ error: "缺少参数" }, { status: 400 });
        const result = await clickAt(String(sessionId), x, y);
        if ("error" in result) return NextResponse.json(result, { status: 404 });
        return NextResponse.json(result);
      }
      case "scroll": {
        if (!sessionId || typeof deltaY !== "number")
          return NextResponse.json({ error: "缺少参数" }, { status: 400 });
        const result = await scrollBy(String(sessionId), deltaY);
        if ("error" in result) return NextResponse.json(result, { status: 404 });
        return NextResponse.json(result);
      }
      case "type": {
        if (!sessionId || !text) return NextResponse.json({ error: "缺少参数" }, { status: 400 });
        const result = await typeText(String(sessionId), String(text));
        if ("error" in result) return NextResponse.json(result, { status: 404 });
        return NextResponse.json(result);
      }
      case "key": {
        if (!sessionId || !key) return NextResponse.json({ error: "缺少参数" }, { status: 400 });
        const result = await pressKey(String(sessionId), String(key));
        if ("error" in result) return NextResponse.json(result, { status: 404 });
        return NextResponse.json(result);
      }
      case "back": {
        if (!sessionId) return NextResponse.json({ error: "缺少参数" }, { status: 400 });
        const result = await goBack(String(sessionId));
        if ("error" in result) return NextResponse.json(result, { status: 404 });
        return NextResponse.json(result);
      }
      case "forward": {
        if (!sessionId) return NextResponse.json({ error: "缺少参数" }, { status: 400 });
        const result = await goForward(String(sessionId));
        if ("error" in result) return NextResponse.json(result, { status: 404 });
        return NextResponse.json(result);
      }
      case "refresh": {
        if (!sessionId) return NextResponse.json({ error: "缺少参数" }, { status: 400 });
        const result = await refresh(String(sessionId));
        if ("error" in result) return NextResponse.json(result, { status: 404 });
        return NextResponse.json(result);
      }
      case "close": {
        if (!sessionId) return NextResponse.json({ error: "缺少参数" }, { status: 400 });
        await closeSession(String(sessionId));
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "未知操作" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

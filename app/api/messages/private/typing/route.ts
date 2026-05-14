import { NextRequest, NextResponse } from "next/server";

const typingMap = new Map<string, number>();

export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/token=([^;]+)/);
  if (!match) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { targetUserId } = await request.json();
  const targetId = parseInt(String(targetUserId), 10);
  if (!targetId) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  const key = `${match[1]}:${targetId}`;
  typingMap.set(key, Date.now());

  setTimeout(() => {
    if (typingMap.get(key) === Date.now()) typingMap.delete(key);
  }, 5000);

  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const targetUserId = parseInt(url.searchParams.get("targetUserId") || "", 10);
  if (!targetUserId) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  const now = Date.now();
  let isTyping = false;
  for (const [key, time] of typingMap.entries()) {
    if (now - time < 5000 && key.endsWith(`:${targetUserId}`)) {
      isTyping = true; break;
    }
  }

  return NextResponse.json({ isTyping });
}

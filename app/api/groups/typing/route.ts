import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const groupTypingMap = new Map<string, { userId: number; time: number }[]>();

export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/token=([^;]+)/);
  if (!match) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { groupId } = await request.json();
  const gid = parseInt(String(groupId), 10);
  if (!gid) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  const key = `${match[1]}:${gid}`;
  const now = Date.now();

  let list = groupTypingMap.get(String(gid)) || [];
  list = list.filter((t) => now - t.time < 5000);
  const existing = list.find((t) => t.userId === parseInt(match[1], 10));
  if (!existing) {
    list.push({ userId: parseInt(match[1], 10), time: now });
  } else {
    existing.time = now;
  }
  groupTypingMap.set(String(gid), list);

  setTimeout(() => {
    const current = groupTypingMap.get(String(gid)) || [];
    const filtered = current.filter((t) => now - t.time < 5000);
    if (filtered.length > 0) groupTypingMap.set(String(gid), filtered);
    else groupTypingMap.delete(String(gid));
  }, 5000);

  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const groupId = parseInt(url.searchParams.get("groupId") || "", 10);
  if (!groupId) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  const now = Date.now();
  let list = groupTypingMap.get(String(groupId)) || [];
  list = list.filter((t) => now - t.time < 5000);

  const userIds = list.map((t) => t.userId);
  let nicknames: string[] = [];
  if (userIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { nickname: true },
    });
    nicknames = users.map((u) => u.nickname);
  }

  return NextResponse.json({ typing: nicknames });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";
import { getSocketServer } from "@/lib/socket/server";
import { buildUserRoom } from "@/lib/socket/rooms";

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { name, memberIds } = await request.json();
  const trimmed = String(name || "").trim();
  if (!trimmed || trimmed.length === 0 || trimmed.length > 50) {
    return NextResponse.json({ error: "群名称1-50字符" }, { status: 400 });
  }

  const ids: number[] = (memberIds || []).map((id: unknown) => parseInt(String(id), 10)).filter((n: number) => !isNaN(n));
  if (ids.length === 0) return NextResponse.json({ error: "至少选择一个好友" }, { status: 400 });

  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ userId, friendId: { in: ids } }, { userId: { in: ids }, friendId: userId }],
    },
  });
  const friendSet = new Set<number>();
  for (const f of friendships) {
    friendSet.add(f.userId === userId ? f.friendId : f.userId);
  }
  if (friendSet.size < ids.length) return NextResponse.json({ error: "包含非好友用户" }, { status: 400 });

  const group = await prisma.groupChat.create({
    data: {
      name: trimmed,
      createdById: userId,
      members: { create: [{ userId }, ...ids.map((id: number) => ({ userId: id }))] },
    },
    include: { members: { include: { user: { select: { id: true, nickname: true } } } } },
  });

  const io = getSocketServer();
  if (io) {
    for (const m of group.members) {
      io.to(buildUserRoom(m.userId)).emit("chat:summary-updated");
    }
  }

  return NextResponse.json({ group });
}

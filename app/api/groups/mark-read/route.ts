import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";
import { getSocketServer } from "@/lib/socket/server";
import { buildGroupRoom, buildUserRoom } from "@/lib/socket/rooms";

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { groupId } = await request.json();
  const gid = parseInt(String(groupId), 10);
  if (!gid) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  const membership = await prisma.groupChatMember.findUnique({
    where: { groupId_userId: { groupId: gid, userId } },
  });
  if (!membership) return NextResponse.json({ error: "不是群成员" }, { status: 403 });

  await prisma.groupMessage.updateMany({
    where: { groupId: gid, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });

  const io = getSocketServer();
  if (io) {
    io.to(buildGroupRoom(gid)).emit("group:read", { userId });
    io.to(buildUserRoom(userId)).emit("chat:summary-updated");
  }

  return NextResponse.json({ success: true });
}

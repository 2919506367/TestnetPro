import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";
import { getSocketServer } from "@/lib/socket/server";
import { buildPrivateRoom, buildUserRoom } from "@/lib/socket/rooms";

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { targetUserId } = await request.json();
  const targetId = parseInt(String(targetUserId), 10);
  if (!targetId) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  await prisma.privateMessage.updateMany({
    where: { fromUserId: targetId, toUserId: userId, readAt: null },
    data: { readAt: new Date() },
  });

  const io = getSocketServer();
  if (io) {
    io.to(buildPrivateRoom(userId, targetId)).emit("private:read", { userId });
    io.to(buildUserRoom(userId)).emit("chat:summary-updated");
  }

  return NextResponse.json({ success: true });
}

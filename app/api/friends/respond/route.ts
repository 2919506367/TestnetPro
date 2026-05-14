import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";
import { getSocketServer } from "@/lib/socket/server";
import { buildUserRoom } from "@/lib/socket/rooms";

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { requestId, action } = await request.json();
  const rid = parseInt(String(requestId), 10);
  if (!rid || !action || !["accept", "reject"].includes(action)) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const req = await prisma.friendRequest.findUnique({ where: { id: rid } });
  if (!req || req.toUserId !== userId || req.status !== "PENDING") {
    return NextResponse.json({ error: "请求不存在或已处理" }, { status: 404 });
  }

  if (action === "accept") {
    await prisma.$transaction([
      prisma.friendRequest.update({ where: { id: rid }, data: { status: "ACCEPTED" } }),
      prisma.friendship.create({ data: { userId: req.fromUserId, friendId: userId } }),
    ]);

    const io = getSocketServer();
    if (io) {
      io.to(buildUserRoom(req.fromUserId)).emit("chat:summary-updated");
      io.to(buildUserRoom(userId)).emit("chat:summary-updated");
    }
  } else {
    await prisma.friendRequest.update({ where: { id: rid }, data: { status: "REJECTED" } });
  }

  return NextResponse.json({ success: true });
}

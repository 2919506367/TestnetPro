import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { toUserId } = await request.json();
  const targetId = parseInt(String(toUserId), 10);
  if (!targetId || targetId === userId) return NextResponse.json({ error: "操作无效" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  const existingFriendship = await prisma.friendship.findFirst({
    where: { OR: [{ userId, friendId: targetId }, { userId: targetId, friendId: userId }] },
  });
  if (existingFriendship) return NextResponse.json({ error: "已经是好友" }, { status: 409 });

  const existingRequest = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { fromUserId: userId, toUserId: targetId },
        { fromUserId: targetId, toUserId: userId },
      ],
    },
  });
  if (existingRequest) {
    if (existingRequest.status === "PENDING") {
      if (existingRequest.fromUserId === userId) {
        return NextResponse.json({ error: "已发送过好友请求，等待对方同意" }, { status: 409 });
      } else {
        return NextResponse.json({ error: "对方已向你发送好友请求，请在请求列表中同意" }, { status: 409 });
      }
    }
  }

  await prisma.friendRequest.create({
    data: { fromUserId: userId, toUserId: targetId },
  });

  return NextResponse.json({ success: true });
}

export async function GET() {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const requests = await prisma.friendRequest.findMany({
    where: { toUserId: userId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: {
      fromUser: { select: { id: true, nickname: true, email: true, role: true } },
    },
  });

  return NextResponse.json({ requests });
}

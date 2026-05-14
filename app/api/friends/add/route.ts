import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { friendId } = await request.json();
  const targetId = parseInt(String(friendId), 10);
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
      return NextResponse.json({ error: "已有待处理的好友请求" }, { status: 409 });
    }
    if (existingRequest.status === "REJECTED") {
      await prisma.friendRequest.delete({ where: { id: existingRequest.id } });
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

  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userId }, { friendId: userId }] },
    include: {
      user: { select: { id: true, nickname: true, role: true } },
      friend: { select: { id: true, nickname: true, role: true } },
    },
  });

  const friends = friendships.map((f) => {
    const isSelfUser = f.userId === userId;
    return {
      id: isSelfUser ? f.friendId : f.userId,
      nickname: isSelfUser ? f.friend.nickname : f.user.nickname,
      role: isSelfUser ? f.friend.role : f.user.role,
    };
  });

  return NextResponse.json({ friends });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";
import { getSocketServer } from "@/lib/socket/server";
import { buildPrivateRoom, buildUserRoom } from "@/lib/socket/rooms";

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { targetUserId, content, emoticonId, replyToId } = await request.json();
  const targetId = parseInt(String(targetUserId), 10);
  if (!targetId || !content || String(content).trim().length === 0) {
    return NextResponse.json({ error: "参数不完整" }, { status: 400 });
  }
  if (String(content).length > 2000) {
    return NextResponse.json({ error: "消息不能超过2000字" }, { status: 400 });
  }

  if (targetId === userId) return NextResponse.json({ error: "不能给自己发消息" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { banned: true } });
  if (user?.banned) return NextResponse.json({ error: "账号已被封禁" }, { status: 403 });

  const friendship = await prisma.friendship.findFirst({
    where: { OR: [{ userId, friendId: targetId }, { userId: targetId, friendId: userId }] },
  });
  if (!friendship) return NextResponse.json({ error: "不是好友关系" }, { status: 403 });

  if (emoticonId) {
    const emoticon = await prisma.emoticon.findUnique({ where: { id: parseInt(emoticonId, 10) } });
    if (!emoticon || emoticon.ownerId !== userId) {
      return NextResponse.json({ error: "表情不存在" }, { status: 400 });
    }
  }

  if (replyToId) {
    const replyMsg = await prisma.privateMessage.findUnique({ where: { id: parseInt(replyToId, 10) } });
    if (!replyMsg || (replyMsg.fromUserId !== userId && replyMsg.toUserId !== userId)) {
      return NextResponse.json({ error: "回复消息不存在" }, { status: 400 });
    }
  }

  const message = await prisma.privateMessage.create({
    data: {
      fromUserId: userId, toUserId: targetId,
      content: String(content).trim(),
      emoticonId: emoticonId ? parseInt(String(emoticonId), 10) : null,
      replyToId: replyToId ? parseInt(String(replyToId), 10) : null,
    },
    include: {
      fromUser: { select: { id: true, nickname: true, role: true } },
      emoticon: { select: { id: true, label: true, imageUrl: true } },
      replyTo: {
        include: {
          fromUser: { select: { id: true, nickname: true } },
          emoticon: { select: { id: true, label: true, imageUrl: true } },
        },
      },
    },
  });

  const io = getSocketServer();
  if (io) {
    const room = buildPrivateRoom(userId, targetId);
    io.to(room).emit("private:message-created", message);
    io.to(buildUserRoom(userId)).emit("chat:summary-updated");
    io.to(buildUserRoom(targetId)).emit("chat:summary-updated");
  }

  return NextResponse.json({ message });
}

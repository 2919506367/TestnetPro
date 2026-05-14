import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";
import { getSocketServer } from "@/lib/socket/server";
import { buildGroupRoom, buildUserRoom } from "@/lib/socket/rooms";

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { groupId, content, emoticonId, replyToId } = await request.json();
  const gid = parseInt(String(groupId), 10);
  if (!gid || !content || String(content).trim().length === 0) return NextResponse.json({ error: "参数不完整" }, { status: 400 });
  if (String(content).length > 2000) return NextResponse.json({ error: "消息不能超过2000字" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { banned: true } });
  if (user?.banned) return NextResponse.json({ error: "账号已被封禁" }, { status: 403 });

  const membership = await prisma.groupChatMember.findUnique({
    where: { groupId_userId: { groupId: gid, userId } },
  });
  if (!membership) return NextResponse.json({ error: "不是群成员" }, { status: 403 });

  if (emoticonId) {
    const emoticon = await prisma.emoticon.findUnique({ where: { id: parseInt(emoticonId, 10) } });
    if (!emoticon || emoticon.ownerId !== userId) return NextResponse.json({ error: "表情不存在" }, { status: 400 });
  }

  const message = await prisma.groupMessage.create({
    data: {
      groupId: gid, senderId: userId,
      content: String(content).trim(),
      emoticonId: emoticonId ? parseInt(String(emoticonId), 10) : null,
      replyToId: replyToId ? parseInt(String(replyToId), 10) : null,
    },
    include: {
      sender: { select: { id: true, nickname: true, role: true } },
      emoticon: { select: { id: true, label: true, imageUrl: true } },
      replyTo: {
        include: {
          sender: { select: { id: true, nickname: true } },
          emoticon: { select: { id: true, label: true, imageUrl: true } },
        },
      },
    },
  });

  const io = getSocketServer();
  if (io) {
    io.to(buildGroupRoom(gid)).emit("group:message-created", message);
    const members = await prisma.groupChatMember.findMany({ where: { groupId: gid } });
    for (const m of members) {
      io.to(buildUserRoom(m.userId)).emit("chat:summary-updated");
    }
  }

  return NextResponse.json({ message });
}

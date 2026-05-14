import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";
import { getSocketServer } from "@/lib/socket/server";
import { buildPrivateRoom } from "@/lib/socket/rooms";

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { targetUserId, action, content } = await request.json();
  const targetId = parseInt(String(targetUserId), 10);
  if (!targetId || !action) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  if (action === "delete") {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const message = await prisma.privateMessage.findFirst({
      where: { fromUserId: userId, toUserId: targetId, isDeleted: false },
      orderBy: { createdAt: "desc" },
    });
    if (!message) return NextResponse.json({ error: "没有可撤回的消息" }, { status: 400 });
    if (message.createdAt < twoMinutesAgo) return NextResponse.json({ error: "超过2分钟无法撤回" }, { status: 400 });

    await prisma.privateMessage.update({
      where: { id: message.id },
      data: { isDeleted: true, content: "[该消息已被撤回]" },
    });

    const io = getSocketServer();
    if (io) {
      io.to(buildPrivateRoom(userId, targetId)).emit("private:message-updated", {
        messageId: message.id, isDeleted: true, content: "[该消息已被撤回]",
      });
    }

    return NextResponse.json({ success: true });
  }

  if (action === "edit") {
    const message = await prisma.privateMessage.findFirst({
      where: { fromUserId: userId, toUserId: targetId, isDeleted: false },
      orderBy: { createdAt: "desc" },
    });
    if (!message) return NextResponse.json({ error: "消息不存在" }, { status: 400 });
    if (!content || String(content).trim().length === 0) return NextResponse.json({ error: "内容不能为空" }, { status: 400 });
    if (String(content).length > 2000) return NextResponse.json({ error: "消息不能超过2000字" }, { status: 400 });

    await prisma.privateMessage.update({
      where: { id: message.id },
      data: { content: String(content).trim(), editedAt: new Date() },
    });

    const io = getSocketServer();
    if (io) {
      io.to(buildPrivateRoom(userId, targetId)).emit("private:message-updated", {
        messageId: message.id, isDeleted: false, content: String(content).trim(),
      });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "未知操作" }, { status: 400 });
}

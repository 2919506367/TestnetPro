import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";
import { getSocketServer } from "@/lib/socket/server";
import { buildGroupRoom } from "@/lib/socket/rooms";

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { messageId, groupId, action, content } = await request.json();
  const mid = parseInt(String(messageId), 10);
  if (!mid || !action) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  const msg = await prisma.groupMessage.findUnique({ where: { id: mid } });
  if (!msg || msg.senderId !== userId) return NextResponse.json({ error: "无权操作" }, { status: 403 });

  const io = getSocketServer();

  if (action === "delete") {
    await prisma.groupMessage.update({ where: { id: mid }, data: { isDeleted: true, content: "[该消息已被删除]" } });
    if (io) io.to(buildGroupRoom(msg.groupId)).emit("group:message-updated", { messageId: mid, isDeleted: true, content: "[该消息已被删除]" });
  } else if (action === "edit") {
    const trimmed = String(content || "").trim();
    if (!trimmed) return NextResponse.json({ error: "内容不能为空" }, { status: 400 });
    if (trimmed.length > 2000) return NextResponse.json({ error: "消息不能超过2000字" }, { status: 400 });
    await prisma.groupMessage.update({ where: { id: mid }, data: { content: trimmed, editedAt: new Date() } });
    if (io) io.to(buildGroupRoom(msg.groupId)).emit("group:message-updated", { messageId: mid, isDeleted: false, content: trimmed });
  }

  return NextResponse.json({ success: true });
}

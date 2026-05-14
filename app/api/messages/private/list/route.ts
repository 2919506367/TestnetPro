import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const url = new URL(request.url);
  const targetUserId = parseInt(url.searchParams.get("targetUserId") || "", 10);
  if (!targetUserId) return NextResponse.json({ error: "缺少targetUserId" }, { status: 400 });

  const messages = await prisma.privateMessage.findMany({
    where: {
      OR: [
        { fromUserId: userId, toUserId: targetUserId },
        { fromUserId: targetUserId, toUserId: userId },
      ],
    },
    orderBy: { createdAt: "asc" },
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

  return NextResponse.json({ messages });
}

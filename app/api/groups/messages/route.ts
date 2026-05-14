import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const url = new URL(request.url);
  const groupId = parseInt(url.searchParams.get("groupId") || "", 10);
  if (!groupId) return NextResponse.json({ error: "缺少groupId" }, { status: 400 });

  const membership = await prisma.groupChatMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) return NextResponse.json({ error: "不是群成员" }, { status: 403 });

  const messages = await prisma.groupMessage.findMany({
    where: { groupId },
    orderBy: { createdAt: "asc" },
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

  return NextResponse.json({ messages });
}

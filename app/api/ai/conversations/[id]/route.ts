import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const conversation = await prisma.aIConversation.findUnique({
    where: { id: parseInt(id, 10) },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation || conversation.userId !== userId) {
    return NextResponse.json({ error: "对话不存在" }, { status: 404 });
  }

  return NextResponse.json({ conversation });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { title } = await request.json();
  const conversation = await prisma.aIConversation.findUnique({ where: { id: parseInt(id, 10) } });
  if (!conversation || conversation.userId !== userId) {
    return NextResponse.json({ error: "对话不存在" }, { status: 404 });
  }

  await prisma.aIConversation.update({
    where: { id: parseInt(id, 10) },
    data: { title: String(title || "新对话").substring(0, 50) },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const conversation = await prisma.aIConversation.findUnique({ where: { id: parseInt(id, 10) } });
  if (!conversation || conversation.userId !== userId) {
    return NextResponse.json({ error: "对话不存在" }, { status: 404 });
  }

  await prisma.aIConversation.delete({ where: { id: parseInt(id, 10) } });

  return NextResponse.json({ success: true });
}

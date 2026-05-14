import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";

export async function GET() {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const conversations = await prisma.aIConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
    take: 50,
  });

  return NextResponse.json({ conversations });
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { title } = await request.json();
  const conversation = await prisma.aIConversation.create({
    data: { userId, title: String(title || "新对话").substring(0, 50) },
  });

  return NextResponse.json({ conversation });
}

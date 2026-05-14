import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";

export async function GET() {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const memories = await prisma.aIMemory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ memories });
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { content } = await request.json();
  const trimmed = String(content || "").trim();
  if (!trimmed || trimmed.length > 500)
    return NextResponse.json({ error: "内容不能为空且不能超过500字" }, { status: 400 });

  const memory = await prisma.aIMemory.create({
    data: { userId, content: trimmed },
  });

  return NextResponse.json({ memory });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { emoticonId } = await request.json();
  const sourceId = parseInt(String(emoticonId), 10);
  if (!sourceId) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  const source = await prisma.emoticon.findUnique({ where: { id: sourceId } });
  if (!source) return NextResponse.json({ error: "表情不存在" }, { status: 404 });
  if (source.ownerId === userId) return NextResponse.json({ error: "不能收藏自己的表情" }, { status: 400 });

  const existing = await prisma.emoticon.findFirst({
    where: { ownerId: userId, imageUrl: source.imageUrl },
  });
  if (existing) return NextResponse.json({ error: "已收藏过此表情" }, { status: 409 });

  await prisma.emoticon.create({
    data: { ownerId: userId, label: source.label, imageUrl: source.imageUrl },
  });

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { label, imageUrl } = await request.json();
  const trimmedLabel = String(label || "").trim();
  const trimmedUrl = String(imageUrl || "").trim();

  if (!trimmedLabel || trimmedLabel.length === 0 || trimmedLabel.length > 20) {
    return NextResponse.json({ error: "标签1-20字符" }, { status: 400 });
  }
  if (!trimmedUrl) return NextResponse.json({ error: "请上传图片" }, { status: 400 });

  const emoticon = await prisma.emoticon.create({
    data: { ownerId: userId, label: trimmedLabel, imageUrl: trimmedUrl },
  });

  return NextResponse.json({ emoticon });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";

export async function PUT(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  try {
    const { nickname } = await request.json();
    const trimmed = (nickname || "").trim();
    if (!trimmed || trimmed.length < 1 || trimmed.length > 20) {
      return NextResponse.json({ error: "昵称需要1-20个字符" }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: { nickname: trimmed, NOT: { id: userId } },
    });
    if (existing) return NextResponse.json({ error: "该昵称已被使用" }, { status: 409 });

    await prisma.user.update({ where: { id: userId }, data: { nickname: trimmed } });
    return NextResponse.json({ success: true, nickname: trimmed });
  } catch {
    return NextResponse.json({ error: "修改失败" }, { status: 500 });
  }
}

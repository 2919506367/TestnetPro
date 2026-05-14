import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";

export async function GET() {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const admin = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "无权操作" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, email: true, nickname: true, role: true,
      banned: true, goldExpiresAt: true, createdAt: true,
      _count: { select: { files: true } },
    },
  });

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const admin = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "无权操作" }, { status: 403 });

  try {
    const { targetUserId, banned } = await request.json();
    if (!targetUserId || targetUserId === userId) {
      return NextResponse.json({ error: "无效操作" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: { banned: !!banned },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";

export async function GET() {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const providers = await prisma.aiProvider.findMany({
    where: { isActive: true },
    select: { id: true, name: true, model: true, avatar: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ providers });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const memory = await prisma.aIMemory.findUnique({ where: { id: parseInt(id, 10) } });
  if (!memory || memory.userId !== userId)
    return NextResponse.json({ error: "记忆不存在" }, { status: 404 });

  await prisma.aIMemory.delete({ where: { id: parseInt(id, 10) } });
  return NextResponse.json({ success: true });
}

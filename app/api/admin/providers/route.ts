import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";

export async function GET() {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "无权操作" }, { status: 403 });

  const providers = await prisma.aiProvider.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ providers });
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "无权操作" }, { status: 403 });

  const { name, apiUrl, apiKey, model, avatar, isActive } = await request.json();
  if (!name || !apiUrl || !apiKey || !model) return NextResponse.json({ error: "请填写完整信息" }, { status: 400 });

  const provider = await prisma.aiProvider.create({
    data: { name, apiUrl, apiKey, model, avatar: avatar || "", isActive: isActive !== false },
  });

  return NextResponse.json({ provider });
}

export async function PUT(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "无权操作" }, { status: 403 });

  const { id, name, apiUrl, apiKey, model, avatar, isActive } = await request.json();
  if (!id) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (apiUrl !== undefined) data.apiUrl = apiUrl;
  if (apiKey !== undefined) data.apiKey = apiKey;
  if (model !== undefined) data.model = model;
  if (avatar !== undefined) data.avatar = avatar;
  if (isActive !== undefined) data.isActive = isActive;

  await prisma.aiProvider.update({ where: { id: parseInt(id, 10) }, data });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "无权操作" }, { status: 403 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "参数错误" }, { status: 400 });
  await prisma.aiProvider.delete({ where: { id: parseInt(id, 10) } });
  return NextResponse.json({ success: true });
}

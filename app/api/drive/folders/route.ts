import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";
import { sanitizeFolderName } from "@/lib/storage";

export async function GET() {
  const userId = await getUserIdFromCookies();
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let folders = await prisma.driveFolder.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { files: true } } },
  });

  if (folders.length === 0) {
    const defaultFolder = await prisma.driveFolder.create({
      data: { userId, name: "我的文件" },
      include: { _count: { select: { files: true } } },
    });
    folders = [defaultFolder];
  }

  return NextResponse.json({ folders });
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const name = sanitizeFolderName(body.name || "");
  if (!name || name.length === 0) {
    return NextResponse.json({ error: "文件夹名不能为空" }, { status: 400 });
  }
  if (name.length > 50) {
    return NextResponse.json({ error: "文件夹名不能超过50个字符" }, { status: 400 });
  }

  const folder = await prisma.driveFolder.create({
    data: { userId, name },
    include: { _count: { select: { files: true } } },
  });

  return NextResponse.json({ folder });
}

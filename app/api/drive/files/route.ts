import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const url = new URL(request.url);
  const folderIdParam = url.searchParams.get("folderId");

  const where: { userId: number; folderId?: number | null } = { userId };

  if (folderIdParam) {
    const folderId = parseInt(folderIdParam, 10);
    if (isNaN(folderId)) {
      return NextResponse.json({ error: "无效的文件夹ID" }, { status: 400 });
    }
    const folder = await prisma.driveFolder.findUnique({
      where: { id: folderId },
    });
    if (!folder || folder.userId !== userId) {
      return NextResponse.json({ error: "文件夹不存在或无权访问" }, { status: 403 });
    }
    where.folderId = folderId;
  }

  const files = await prisma.driveFile.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      size: true,
      createdAt: true,
      folderId: true,
    },
  });

  const result = files.map((f) => ({ ...f, size: Number(f.size) }));

  return NextResponse.json({ files: result });
}

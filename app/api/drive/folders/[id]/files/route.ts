import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: folderId } = await params;
  const folderIdNum = parseInt(folderId, 10);
  if (isNaN(folderIdNum)) {
    return NextResponse.json({ error: "无效的文件夹ID" }, { status: 400 });
  }

  const userId = await getUserIdFromCookies();
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const folder = await prisma.driveFolder.findUnique({
    where: { id: folderIdNum },
  });
  if (!folder || folder.userId !== userId) {
    return NextResponse.json({ error: "文件夹不存在或无权访问" }, { status: 403 });
  }

  const files = await prisma.driveFile.findMany({
    where: { userId, folderId: folderIdNum },
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

  return NextResponse.json({ folder, files: result });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";
import { deleteFile, fileExists } from "@/lib/storage";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: fileId } = await params;
  const fileIdNum = parseInt(fileId, 10);
  if (isNaN(fileIdNum)) {
    return NextResponse.json({ error: "无效的文件ID" }, { status: 400 });
  }

  const userId = await getUserIdFromCookies();
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const file = await prisma.driveFile.findUnique({
    where: { id: fileIdNum },
  });

  if (!file) {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }

  if (file.userId !== userId) {
    return NextResponse.json({ error: "无权操作此文件" }, { status: 403 });
  }

  if (fileExists(file.storedName)) {
    deleteFile(file.storedName);
  }

  await prisma.driveFile.delete({ where: { id: fileIdNum } });

  return NextResponse.json({ success: true });
}

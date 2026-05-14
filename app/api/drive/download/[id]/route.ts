import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";
import { getStoragePath, fileExists } from "@/lib/storage";
import fs from "fs";

export async function GET(
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
    return NextResponse.json({ error: "无权下载此文件" }, { status: 403 });
  }

  if (!fileExists(file.storedName)) {
    return NextResponse.json({ error: "文件数据丢失，请联系管理员" }, { status: 410 });
  }

  const filePath = getStoragePath(file.storedName);
  const stat = fs.statSync(filePath);

  const encodedFilename = encodeURIComponent(file.originalName);
  const asciiFallback = file.originalName.replace(/[^\x20-\x7E]/g, "_");

  const headers = new Headers();
  headers.set("Content-Type", file.mimeType || "application/octet-stream");
  headers.set("Content-Length", String(stat.size));
  headers.set(
    "Content-Disposition",
    `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFilename}`
  );

  const stream = fs.createReadStream(filePath);

  return new NextResponse(stream as unknown as BodyInit, {
    status: 200,
    headers,
  });
}

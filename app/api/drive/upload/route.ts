import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";
import { sanitizeFilename, decodeFilename, getUploadDir, getStoragePath } from "@/lib/storage";
import { getStorageLimit, formatLimit } from "@/lib/roles";
import { Readable } from "stream";
import Busboy from "busboy";
import fs from "fs";
import path from "path";

const MAX_SINGLE_FILE = 10 * 1024 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, banned: true, goldExpiresAt: true },
  });
  if (!user || user.banned) {
    return NextResponse.json({ error: "账号已被封禁" }, { status: 403 });
  }

  const effectiveRole = (user.role === "GOLD" && user.goldExpiresAt && new Date(user.goldExpiresAt) < new Date()) ? "USER" : user.role;
  const storageLimit = getStorageLimit(effectiveRole);
  const limitDisplay = formatLimit(effectiveRole);

  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (size > storageLimit) {
      return NextResponse.json(
        { error: `文件大小超过你的空间限制 (最大 ${limitDisplay})` },
        { status: 413 }
      );
    }
  }

  const totalUsed = await prisma.driveFile.aggregate({
    where: { userId },
    _sum: { size: true },
  });
  const usedBytes = Number(totalUsed._sum.size || 0);

  if (contentLength) {
    const newSize = parseInt(contentLength, 10);
    const estimatedNewTotal = usedBytes + newSize;
    if (estimatedNewTotal > storageLimit) {
      return NextResponse.json(
        { error: `剩余空间不足！已使用 ${formatBytes(usedBytes)}/${limitDisplay}，本次文件约 ${formatBytes(newSize)}，剩余仅 ${formatBytes(Math.max(0, storageLimit - usedBytes))}` },
        { status: 413 }
      );
    }
  }

  const uploadDir = getUploadDir();

  try {
    const result = await handleUpload(request, uploadDir);
    if (!result) {
      return NextResponse.json({ error: "未上传文件" }, { status: 400 });
    }

    const finalNewTotal = usedBytes + result.size;
    if (finalNewTotal > storageLimit) {
      const filePath = getStoragePath(result.storedName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return NextResponse.json(
        { error: `空间不足！已使用 ${formatBytes(usedBytes)}/${limitDisplay}，本次文件 ${formatBytes(result.size)}，总大小超过限制` },
        { status: 413 }
      );
    }

    if (result.folderId) {
      const folder = await prisma.driveFolder.findUnique({ where: { id: result.folderId } });
      if (!folder || folder.userId !== userId) {
        return NextResponse.json({ error: "文件夹不存在或无权访问" }, { status: 403 });
      }
    }

    const fileRecord = await prisma.driveFile.create({
      data: {
        userId, folderId: result.folderId || null,
        originalName: result.originalName, storedName: result.storedName,
        mimeType: result.mimeType || "application/octet-stream",
        size: BigInt(result.size), storagePath: getStoragePath(result.storedName),
      },
    });

    return NextResponse.json({
      id: fileRecord.id, originalName: fileRecord.originalName,
      size: Number(fileRecord.size), createdAt: fileRecord.createdAt, folderId: fileRecord.folderId,
    });
  } catch {
    return NextResponse.json({ error: "上传失败，请稍后重试" }, { status: 500 });
  }
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / 1024).toFixed(0) + " KB";
}

interface UploadResult {
  originalName: string; storedName: string; mimeType: string; size: number; folderId?: number;
}

async function handleUpload(request: NextRequest, uploadDir: string): Promise<UploadResult | null> {
  const body = request.body;
  if (!body) return null;
  const nodeStream = Readable.fromWeb(body as any);
  const contentType = request.headers.get("content-type") || "";

  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: { "content-type": contentType },
      limits: { fileSize: MAX_SINGLE_FILE },
      defCharset: "utf8",
    });

    let fileResult: UploadResult | null = null;
    let folderId: number | undefined;
    let aborted = false;
    let writeStream: fs.WriteStream | null = null;
    let currentFilePath: string | null = null;

    busboy.on("field", (fieldname: string, val: string) => {
      if (fieldname === "folderId" && val) {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed)) folderId = parsed;
      }
    });

    busboy.on("file", (fieldname: string, file: Readable, info: { filename: string; encoding: string; mimeType: string }) => {
      const { filename, mimeType } = info;
      if (!filename) { file.resume(); return; }
      const safeFileName = decodeFilename(filename);
      const storedName = sanitizeFilename(safeFileName);
      const filePath = path.resolve(uploadDir, storedName);
      if (!filePath.startsWith(uploadDir)) { file.resume(); return; }

      fileResult = { originalName: safeFileName, storedName, mimeType, size: 0, folderId };
      currentFilePath = filePath;
      writeStream = fs.createWriteStream(filePath);

      file.on("data", (chunk: Buffer) => {
        fileResult!.size += chunk.length;
        if (fileResult!.size > MAX_SINGLE_FILE) {
          aborted = true;
          file.destroy(new Error("File too large"));
          writeStream?.close();
          if (currentFilePath) fs.unlink(currentFilePath, () => {});
        }
      });
      file.on("error", () => { if (currentFilePath) fs.unlink(currentFilePath, () => {}); });
      file.pipe(writeStream);
    });

    busboy.on("error", () => {
      if (currentFilePath) fs.unlink(currentFilePath, () => {});
      if (writeStream) writeStream.close();
      reject(new Error("Upload parse error"));
    });

    busboy.on("finish", () => {
      if (aborted) reject(new Error("File too large"));
      else if (fileResult) {
        if (folderId) fileResult.folderId = folderId;
        resolve(fileResult);
      } else resolve(null);
    });

    nodeStream.pipe(busboy);
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";
import { sanitizeFilename, decodeFilename, getUploadDir, getStoragePath } from "@/lib/storage";
import { getStorageLimit, formatLimit } from "@/lib/roles";
import { Readable } from "stream";
import Busboy from "busboy";
import fs from "fs";
import path from "path";

// 禁用 Next.js 默认的 body 解析，使用 busboy 流式处理
export const runtime = "nodejs";
export const maxDuration = 3600; // 1小时超时

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
  } catch (err: any) {
    console.error("[Upload] Error:", err?.message || err);
    if (err?.code === "ECONNRESET") {
      return NextResponse.json({ error: "上传连接被重置，请重试" }, { status: 500 });
    }
    if (err?.code === "ETIMEDOUT" || err?.code === "ESOCKETTIMEDOUT") {
      return NextResponse.json({ error: "上传超时，请检查网络后重试" }, { status: 500 });
    }
    return NextResponse.json({ error: `上传失败: ${err?.message || err || "未知错误"}` }, { status: 500 });
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

async function* readAllChunks(reader: ReadableStreamDefaultReader<Uint8Array>) {
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield Buffer.from(value);
    }
  } finally {
    reader.releaseLock();
  }
}

async function handleUpload(request: NextRequest, uploadDir: string): Promise<UploadResult | null> {
  const body = request.body;
  if (!body) return null;
  const contentType = request.headers.get("content-type") || "";

  const reader = body.getReader();
  const nodeStream = Readable.from(readAllChunks(reader));

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
    let fileError = false;

    const cleanupFile = () => {
      if (writeStream) {
        try { writeStream.close(); } catch {}
        writeStream = null;
      }
      if (currentFilePath) {
        try { fs.unlinkSync(currentFilePath); } catch {}
        currentFilePath = null;
      }
    };

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

      writeStream.on("error", (err: Error) => {
        console.error("[Upload] WriteStream error:", err.message);
        fileError = true;
        cleanupFile();
        file.destroy();
      });

      file.on("data", (chunk: Buffer) => {
        if (fileResult) fileResult.size += chunk.length;
        if (fileResult && fileResult.size > MAX_SINGLE_FILE) {
          aborted = true;
          fileError = true;
          file.destroy(new Error("File too large"));
          cleanupFile();
        }
      });

      file.on("error", (err: Error) => {
        console.error("[Upload] File stream error:", err.message);
        fileError = true;
        cleanupFile();
      });

      file.on("end", () => {
        if (writeStream) writeStream.end();
      });

      file.pipe(writeStream, { end: false });
    });

    busboy.on("error", (err: any) => {
      console.error("[Upload] Busboy error:", err?.message || err);
      cleanupFile();
      nodeStream.destroy();
      reject(new Error(`上传解析错误: ${err?.message || err}`));
    });

    busboy.on("finish", () => {
      if (aborted) {
        reject(new Error("文件大小超过10GB限制"));
      } else if (fileError && fileResult) {
        reject(new Error("文件写入失败"));
      } else if (fileResult) {
        if (folderId) fileResult.folderId = folderId;
        resolve(fileResult);
      } else {
        resolve(null);
      }
    });

    busboy.on("partsLimit", () => {
      reject(new Error("上传文件太多"));
    });

    busboy.on("filesLimit", () => {
      reject(new Error("上传文件数超过限制"));
    });

    busboy.on("fieldsLimit", () => {
      reject(new Error("上传字段数超过限制"));
    });

    nodeStream.on("error", (err: Error) => {
      console.error("[Upload] Node stream error:", err.message);
      cleanupFile();
      nodeStream.destroy();
      reject(err);
    });

    nodeStream.pipe(busboy);
  });
}

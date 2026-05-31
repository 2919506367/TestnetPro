import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";
import { sanitizeFilename, decodeFilename, getUploadDir, getStoragePath } from "@/lib/storage";
import { getStorageLimit, formatLimit } from "@/lib/roles";
import { Readable } from "stream";
import Busboy from "busboy";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 3600;

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
  const contentLengthNum = contentLength ? parseInt(contentLength, 10) : 0;
  const contentType = request.headers.get("content-type") || "";

  console.log(`[Upload] Start | userId=${userId} | content-length=${contentLengthNum} | content-type=${contentType.substring(0, 80)}`);

  if (contentLengthNum > storageLimit) {
    return NextResponse.json({ error: `文件大小超过你的空间限制 (最大 ${limitDisplay})` }, { status: 413 });
  }

  const totalUsed = await prisma.driveFile.aggregate({
    where: { userId },
    _sum: { size: true },
  });
  const usedBytes = Number(totalUsed._sum.size || 0);

  if (contentLengthNum) {
    const estimatedNewTotal = usedBytes + contentLengthNum;
    if (estimatedNewTotal > storageLimit) {
      return NextResponse.json({
        error: `剩余空间不足！已使用 ${formatBytes(usedBytes)}/${limitDisplay}，本次文件约 ${formatBytes(contentLengthNum)}，剩余仅 ${formatBytes(Math.max(0, storageLimit - usedBytes))}`,
      }, { status: 413 });
    }
  }

  const uploadDir = getUploadDir();

  try {
    const result = await handleUpload(request, uploadDir);
    if (!result) {
      return NextResponse.json({ error: "未上传文件" }, { status: 400 });
    }

    console.log(`[Upload] File received | name=${result.originalName} | size=${result.size} | written=${result.size} bytes`);

    const finalNewTotal = usedBytes + result.size;
    if (finalNewTotal > storageLimit) {
      const filePath = getStoragePath(result.storedName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return NextResponse.json({
        error: `空间不足！已使用 ${formatBytes(usedBytes)}/${limitDisplay}，本次文件 ${formatBytes(result.size)}，总大小超过限制`,
      }, { status: 413 });
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

    console.log(`[Upload] Success | fileId=${fileRecord.id} | name=${fileRecord.originalName}`);

    return NextResponse.json({
      id: fileRecord.id, originalName: fileRecord.originalName,
      size: Number(fileRecord.size), createdAt: fileRecord.createdAt, folderId: fileRecord.folderId,
    });
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.error(`[Upload] Failed | userId=${userId} | content-length=${contentLengthNum} | error=${errMsg}`);

    if (err?.type === "CLIENT_ABORT") {
      return NextResponse.json({ error: "上传中断，请检查网络连接后重试" }, { status: 499 });
    }
    if (err?.code === "ECONNRESET") {
      return NextResponse.json({ error: "上传连接被重置，可能是代理超时，请重试" }, { status: 500 });
    }
    if (err?.code === "ETIMEDOUT" || err?.code === "ESOCKETTIMEDOUT") {
      return NextResponse.json({ error: "上传超时，请检查网络后重试" }, { status: 500 });
    }
    return NextResponse.json({ error: `上传失败: ${errMsg || "未知错误"}` }, { status: 500 });
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

function buildNodeStream(body: ReadableStream<Uint8Array>): Readable {
  if (typeof (Readable as any).fromWeb === "function") {
    try {
      return (Readable as any).fromWeb(body);
    } catch (e) {
      console.error("[Upload] Readable.fromWeb failed, falling back to manual reader:", (e as Error).message);
    }
  }
  const reader = body.getReader();
  return Readable.from(readAllChunks(reader));
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
  const contentLength = parseInt(request.headers.get("content-length") || "0", 10) || 0;

  const nodeStream = buildNodeStream(body as unknown as ReadableStream<Uint8Array>);

  return new Promise((resolve, reject) => {
    let settled = false;
    let timeoutId: NodeJS.Timeout | null = null;

    const settle = (error: any | null, result: UploadResult | null) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (error) reject(error);
      else resolve(result);
    };

    const busboy = Busboy({
      headers: { "content-type": contentType },
      limits: { fileSize: MAX_SINGLE_FILE },
      defCharset: "utf8",
    });

    let fileResult: UploadResult | null = null;
    let folderId: number | undefined;
    let writeStream: fs.WriteStream | null = null;
    let currentFilePath: string | null = null;
    let fileError = false;
    let fileTooLarge = false;
    let bytesWritten = 0;
    let writeStreamFinished = false;
    let requestAborted = false;

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

    const logStatus = (stage: string, extra?: string) => {
      console.log(`[Upload] ${stage} | content-length=${contentLength} | bytes=${bytesWritten} | fileError=${fileError} | aborted=${requestAborted}${extra ? " | " + extra : ""}`);
    };

    const abortHandler = () => {
      if (requestAborted) return;
      requestAborted = true;
      logStatus("REQUEST_ABORTED");
      cleanupFile();
      if (nodeStream) nodeStream.destroy();
      const err: any = new Error("客户端连接中断");
      err.type = "CLIENT_ABORT";
      settle(err, null);
    };

    request.signal.addEventListener("abort", abortHandler, { once: true });

    nodeStream.on("close", () => {
      if (!settled && !requestAborted && !fileTooLarge) {
        logStatus("STREAM_CLOSED_BEFORE_FINISH");
      }
    });

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

      logStatus("FILE_START", `name=${safeFileName} | mime=${mimeType}`);
      fileResult = { originalName: safeFileName, storedName, mimeType, size: 0, folderId };
      currentFilePath = filePath;
      bytesWritten = 0;
      writeStreamFinished = false;
      writeStream = fs.createWriteStream(filePath);

      writeStream.on("error", (err: Error) => {
        console.error(`[Upload] WRITE_ERROR | path=${filePath} | error=${err.message}`);
        fileError = true;
        cleanupFile();
        file.destroy();
      });

      writeStream.on("finish", () => {
        writeStreamFinished = true;
        logStatus("WRITE_FINISH");
      });

      file.on("data", (chunk: Buffer) => {
        if (fileResult) fileResult.size += chunk.length;
        bytesWritten += chunk.length;
        if (fileResult && fileResult.size > MAX_SINGLE_FILE) {
          fileTooLarge = true;
          fileError = true;
          logStatus("FILE_TOO_LARGE", `size=${fileResult.size}`);
          file.destroy(new Error("File too large"));
          cleanupFile();
        }
      });

      file.on("limit", () => {
        fileTooLarge = true;
        fileError = true;
        logStatus("FILE_LIMIT_HIT");
        cleanupFile();
      });

      file.on("error", (err: Error) => {
        console.error(`[Upload] FILE_STREAM_ERROR | name=${safeFileName} | error=${err.message}`);
        fileError = true;
        cleanupFile();
      });

      file.on("end", () => {
        if (writeStream) {
          writeStream.end();
        }
      });

      file.pipe(writeStream, { end: false });
    });

    busboy.on("error", (err: any) => {
      const errMsg = err?.message || String(err);
      console.error(`[Upload] BUSBOY_ERROR | content-length=${contentLength} | bytes=${bytesWritten} | error=${errMsg}`);
      cleanupFile();
      nodeStream.destroy();
      const error = new Error(requestAborted ? "客户端连接中断" : `上传解析错误: ${errMsg}`);
      (error as any).type = requestAborted ? "CLIENT_ABORT" : "PARSE_ERROR";
      settle(error, null);
    });

    busboy.on("finish", async () => {
      logStatus("BUSBOY_FINISH", `fileResult=${!!fileResult} | writeStreamFinished=${writeStreamFinished}`);

      if (fileTooLarge) {
        settle(new Error("文件大小超过10GB限制"), null);
        return;
      }

      if (fileError) {
        settle(new Error("文件写入失败"), null);
        return;
      }

      if (!fileResult) {
        settle(null, null);
        return;
      }

      if (writeStream && !writeStreamFinished) {
        try {
          await new Promise<void>((wsResolve) => {
            writeStream!.on("finish", wsResolve);
            writeStream!.on("error", () => wsResolve());
            if (writeStream!.writableFinished) wsResolve();
            setTimeout(wsResolve, 10000);
          });
          logStatus("WAITED_FOR_WRITE");
        } catch {}
      }

      if (folderId) fileResult.folderId = folderId;
      settle(null, fileResult);
    });

    busboy.on("partsLimit", () => {
      settle(new Error("上传文件太多"), null);
    });

    busboy.on("filesLimit", () => {
      settle(new Error("上传文件数超过限制"), null);
    });

    busboy.on("fieldsLimit", () => {
      settle(new Error("上传字段数超过限制"), null);
    });

    nodeStream.on("error", (err: Error) => {
      console.error(`[Upload] NODE_STREAM_ERROR | error=${err.message}`);
      cleanupFile();
      settle(err, null);
    });

    nodeStream.pipe(busboy);

    timeoutId = setTimeout(() => {
      if (!settled) {
        console.error(`[Upload] TIMEOUT | content-length=${contentLength} | bytes=${bytesWritten}`);
        cleanupFile();
        nodeStream.destroy();
        const err: any = new Error("上传处理超时");
        err.code = "ETIMEDOUT";
        settle(err, null);
      }
    }, 3600 * 1000);
  });
}

import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const STORAGE_ROOT = path.resolve(process.cwd(), "storage", "uploads");

export function ensureStorageDir(): void {
  if (!fs.existsSync(STORAGE_ROOT)) {
    fs.mkdirSync(STORAGE_ROOT, { recursive: true });
  }
}

export function sanitizeFilename(originalName: string): string {
  const ext = path.extname(originalName);
  return uuidv4() + ext;
}

export function getStoragePath(storedName: string): string {
  const safeName = path.basename(storedName);
  const fullPath = path.resolve(STORAGE_ROOT, safeName);
  if (!fullPath.startsWith(STORAGE_ROOT)) {
    throw new Error("Invalid file path");
  }
  return fullPath;
}

export function getUploadDir(): string {
  ensureStorageDir();
  return STORAGE_ROOT;
}

export function deleteFile(storedName: string): void {
  const filePath = getStoragePath(storedName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function fileExists(storedName: string): boolean {
  try {
    const filePath = getStoragePath(storedName);
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

export function decodeFilename(rawName: string): string {
  try {
    const latin1ToUtf8 = Buffer.from(rawName, "latin1").toString("utf8");
    if (/[\u4e00-\u9fff]/.test(latin1ToUtf8)) {
      return latin1ToUtf8;
    }
  } catch {}
  return rawName;
}

export function sanitizeFolderName(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").trim();
}

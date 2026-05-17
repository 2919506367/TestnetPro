import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";
import { sanitizeFolderName } from "@/lib/storage";

const cache = new Map<number, { data: unknown; ts: number }>();
const CACHE_TTL = 15000;

function getCached<T>(key: number): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data as T;
  return null;
}

function setCache(key: number, data: unknown) {
  cache.set(key, { data, ts: Date.now() });
  if (cache.size > 200) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now - v.ts > CACHE_TTL * 2) cache.delete(k);
    }
  }
}

function clearCache(userId: number) {
  cache.delete(userId);
}

export async function GET() {
  const userId = await getUserIdFromCookies();
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const cached = getCached<any>(userId);
  if (cached) return NextResponse.json({ folders: cached });

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

  setCache(userId, folders);

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

  clearCache(userId);

  return NextResponse.json({ folder });
}

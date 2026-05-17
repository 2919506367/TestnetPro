import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";

const cache = new Map<number, { user: Record<string, unknown>; ts: number }>();
const CACHE_TTL = 30000;

export async function GET() {
  const userId = await getUserIdFromCookies();
  if (!userId) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const cached = cache.get(userId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ user: cached.user });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, nickname: true, role: true,
      banned: true, goldExpiresAt: true, tokenQuota: true, createdAt: true,
    },
  });

  if (!user || user.banned) {
    cache.delete(userId);
    return NextResponse.json({ user: null }, { status: 401 });
  }

  cache.set(userId, { user: user as Record<string, unknown>, ts: Date.now() });

  if (cache.size > 500) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now - v.ts > CACHE_TTL * 2) cache.delete(k);
    }
  }

  return NextResponse.json({ user });
}

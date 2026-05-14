import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (!q || q.length < 1) return NextResponse.json({ users: [] });

  const friendIds = await prisma.friendship.findMany({
    where: { OR: [{ userId }, { friendId: userId }] },
    select: { userId: true, friendId: true },
  });
  const friendIdSet = new Set<number>();
  for (const f of friendIds) {
    friendIdSet.add(f.userId === userId ? f.friendId : f.userId);
  }

  const pendingToIds = await prisma.friendRequest.findMany({
    where: { fromUserId: userId, status: "PENDING" },
    select: { toUserId: true },
  });
  const pendingFromIds = await prisma.friendRequest.findMany({
    where: { toUserId: userId, status: "PENDING" },
    select: { fromUserId: true },
  });

  const excludeIds = new Set<number>([userId, ...friendIdSet, ...pendingToIds.map((r) => r.toUserId), ...pendingFromIds.map((r) => r.fromUserId)]);

  const users = await prisma.user.findMany({
    where: {
      id: { notIn: [...excludeIds] },
      OR: [
        { email: { contains: q } },
        { nickname: { contains: q } },
      ],
    },
    select: { id: true, nickname: true, email: true, role: true },
    take: 20,
  });

  return NextResponse.json({ users });
}

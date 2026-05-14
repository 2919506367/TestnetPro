import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";

export async function GET() {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ count: 0 });

  const [privateUnread, groupUnread] = await Promise.all([
    prisma.privateMessage.count({
      where: { toUserId: userId, readAt: null },
    }),
    prisma.groupMessage.count({
      where: {
        group: { members: { some: { userId } } },
        senderId: { not: userId },
        readAt: null,
      },
    }),
  ]);

  const total = privateUnread + groupUnread;
  return NextResponse.json({ count: total });
}

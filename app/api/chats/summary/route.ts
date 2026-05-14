import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";

export async function GET() {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  // 1. GET ALL FRIENDS (even without messages)
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userId }, { friendId: userId }] },
    include: {
      user: { select: { id: true, nickname: true, role: true } },
      friend: { select: { id: true, nickname: true, role: true } },
    },
  });

  // 2. GET ALL PRIVATE MESSAGES (for preview and unread)
  const privateChats = await prisma.privateMessage.findMany({
    where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
    orderBy: { createdAt: "desc" },
    include: {
      fromUser: { select: { id: true, nickname: true, role: true } },
      toUser: { select: { id: true, nickname: true, role: true } },
    },
  });

  const partnerMap = new Map<number, (typeof privateChats)[0]>();
  for (const msg of privateChats) {
    const partnerId = msg.fromUserId === userId ? msg.toUserId : msg.fromUserId;
    if (!partnerMap.has(partnerId)) partnerMap.set(partnerId, msg);
  }

  // 3. BUILD private conversations list
  const seenFriendIds = new Set<number>();
  const privateGroups: Record<string, unknown>[] = [];

  for (const f of friendships) {
    const friend = f.userId === userId ? f.friend : f.user;
    const friendId = friend.id;
    seenFriendIds.add(friendId);

    const lastMsg = partnerMap.get(friendId);
    const unread = await prisma.privateMessage.count({
      where: { fromUserId: friendId, toUserId: userId, readAt: null },
    });

    privateGroups.push({
      kind: "private",
      id: `private-${friendId}`,
      targetId: friendId,
      title: friend.nickname,
      preview: lastMsg?.content?.substring(0, 40) || "",
      time: lastMsg?.createdAt || f.createdAt,
      unread,
      isGold: friend.role === "GOLD",
    });
  }

  // 4. GET GROUPS
  const groupMemberships = await prisma.groupChatMember.findMany({
    where: { userId },
    include: {
      group: {
        include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      },
    },
  });

  const groupItems: Record<string, unknown>[] = [];
  for (const g of groupMemberships) {
    const lastMsg = g.group.messages[0];
    const unread = await prisma.groupMessage.count({
      where: { groupId: g.groupId, senderId: { not: userId }, readAt: null },
    });
    groupItems.push({
      kind: "group",
      id: `group-${g.groupId}`,
      targetId: g.groupId,
      title: g.group.name,
      preview: lastMsg?.content?.substring(0, 40) || "",
      time: lastMsg?.createdAt || new Date().toISOString(),
      unread,
      isGold: false,
    });
  }

  return NextResponse.json({
    conversations: [...privateGroups, ...groupItems].sort(
      (a, b) => new Date(b.time as string).getTime() - new Date(a.time as string).getTime()
    ),
  });
}

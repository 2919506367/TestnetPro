import { jwtVerify } from "jose";
import { prisma } from "../db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "cloud-drive-secret-key-change-in-production"
);

export interface SocketSessionUser {
  id: number;
  nickname: string;
  role: string;
}

export async function getSocketSessionUser(cookieHeader: string | undefined): Promise<SocketSessionUser | null> {
  if (!cookieHeader) return null;

  const match = cookieHeader.match(/token=([^;]+)/);
  if (!match) return null;

  try {
    const { payload } = await jwtVerify(match[1], JWT_SECRET);
    const userId = parseInt(payload.sub as string, 10);
    if (!userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nickname: true, role: true, banned: true },
    });
    if (!user || user.banned) return null;
    return { id: user.id, nickname: user.nickname, role: user.role };
  } catch {
    return null;
  }
}

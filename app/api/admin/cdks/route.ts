import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";
import { randomBytes } from "crypto";

function ensureAdmin(userId: number) {
  return prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    .then(u => (!u || u.role !== "ADMIN") ? null : true);
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (!await ensureAdmin(userId)) return NextResponse.json({ error: "无权操作" }, { status: 403 });

  try {
    const { goldDays, tokenAmount, count } = await request.json();
    const days = parseInt(String(goldDays || "0"), 10) || 0;
    const tokens = parseInt(String(tokenAmount || "0"), 10) || 0;
    const cnt = Math.min(parseInt(String(count || 1), 10) || 1, 50);

    if (!days && !tokens) {
      return NextResponse.json({ error: "请填写黄金天数或Token额度" }, { status: 400 });
    }
    if (days && (days < 1 || days > 3650)) {
      return NextResponse.json({ error: "天数需要为1-3650之间" }, { status: 400 });
    }
    if (tokens && (tokens < 1 || tokens > 10000000)) {
      return NextResponse.json({ error: "Token额度为1-10,000,000" }, { status: 400 });
    }

    const codes = [];
    for (let i = 0; i < cnt; i++) {
      const code = "CDK-" + randomBytes(4).toString("hex").toUpperCase() + "-" + randomBytes(3).toString("hex").toUpperCase();
      const cdk = await prisma.cdk.create({
        data: { code, goldDays: days, tokenAmount: tokens, createdBy: userId },
      });
      codes.push(cdk);
    }

    return NextResponse.json({ cdks: codes });
  } catch {
    return NextResponse.json({ error: "生成失败" }, { status: 500 });
  }
}

export async function GET() {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (!await ensureAdmin(userId)) return NextResponse.json({ error: "无权操作" }, { status: 403 });

  const cdks = await prisma.cdk.findMany({
    orderBy: { createdAt: "desc" },
    include: { redeemer: { select: { nickname: true, email: true } } },
  });

  return NextResponse.json({ cdks });
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (!await ensureAdmin(userId)) return NextResponse.json({ error: "无权操作" }, { status: 403 });

  const { id } = await request.json();
  const cdkId = parseInt(String(id), 10);
  if (!cdkId) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  await prisma.cdk.delete({ where: { id: cdkId } });
  return NextResponse.json({ success: true });
}

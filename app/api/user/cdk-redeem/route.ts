import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  try {
    const { code, type } = await request.json();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "请输入CDK码" }, { status: 400 });
    }

    const wantVIP = type === "vip";
    const wantToken = type === "token";
    if (!wantVIP && !wantToken) {
      return NextResponse.json({ error: "请选择兑换类型" }, { status: 400 });
    }

    const cdk = await prisma.cdk.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (!cdk) return NextResponse.json({ error: "CDK无效或不存在" }, { status: 404 });
    if (cdk.isUsed) return NextResponse.json({ error: "CDK已被使用" }, { status: 409 });

    if (wantVIP && cdk.goldDays < 1) {
      return NextResponse.json({ error: "这不是VIP会员CDK，请到Token兑换区使用" }, { status: 400 });
    }
    if (wantToken && cdk.tokenAmount < 1) {
      return NextResponse.json({ error: "这不是Token CDK，请到VIP兑换区使用" }, { status: 400 });
    }

    const now = new Date();
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { goldExpiresAt: true, role: true, tokenQuota: true } });
    if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

    if (wantToken) {
      const newBalance = (user.tokenQuota ?? 10000) + cdk.tokenAmount;
      await prisma.$transaction([
        prisma.cdk.update({ where: { id: cdk.id }, data: { isUsed: true, usedBy: userId, usedAt: now } }),
        prisma.user.update({ where: { id: userId }, data: { tokenQuota: newBalance } }),
      ]);
      return NextResponse.json({ success: true, tokenAmount: cdk.tokenAmount, newBalance });
    }

    const base = (user.goldExpiresAt && new Date(user.goldExpiresAt) > now) ? new Date(user.goldExpiresAt) : now;
    const newExpiry = new Date(base.getTime() + cdk.goldDays * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.cdk.update({ where: { id: cdk.id }, data: { isUsed: true, usedBy: userId, usedAt: now } }),
      prisma.user.update({ where: { id: userId }, data: { role: "GOLD", goldExpiresAt: newExpiry } }),
    ]);

    return NextResponse.json({ success: true, goldExpiresAt: newExpiry.toISOString(), goldDays: cdk.goldDays });
  } catch {
    return NextResponse.json({ error: "兑换失败，请稍后重试" }, { status: 500 });
  }
}

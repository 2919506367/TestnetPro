import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createToken, setAuthCookie } from "@/lib/auth";
import { verifyCaptcha } from "@/lib/captcha";

export async function POST(request: NextRequest) {
  try {
    const { email, password, captchaInput } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "邮箱和密码不能为空" }, { status: 400 });
    }

    const captchaToken = request.cookies.get("captcha_token")?.value;
    if (!captchaToken || !captchaInput) {
      return NextResponse.json({ error: "请完成图形验证码" }, { status: 400 });
    }
    if (!verifyCaptcha(captchaToken, captchaInput)) {
      return NextResponse.json({ error: "图形验证码错误或已失效" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
    }

    if (user.banned) {
      return NextResponse.json({ error: "账号已被封禁" }, { status: 403 });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
    }

    const token = await createToken(user.id);
    await setAuthCookie(token);

    return NextResponse.json({
      id: user.id, email: user.email, nickname: user.nickname, role: user.role,
    });
  } catch {
    return NextResponse.json({ error: "登录失败，请稍后重试" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createToken, setAuthCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password, nickname } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "邮箱和密码不能为空" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "密码至少6位" }, { status: 400 });
    }

    const trimmedNickname = (nickname || "").trim();
    if (!trimmedNickname || trimmedNickname.length < 1 || trimmedNickname.length > 20) {
      return NextResponse.json({ error: "昵称需要1-20个字符" }, { status: 400 });
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: "该邮箱已被注册" }, { status: 409 });
    }

    const existingNickname = await prisma.user.findUnique({ where: { nickname: trimmedNickname } });
    if (existingNickname) {
      return NextResponse.json({ error: "该昵称已被使用" }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, nickname: trimmedNickname, role: "USER" },
    });

    await prisma.driveFolder.create({
      data: { userId: user.id, name: "我的文件" },
    });

    const token = await createToken(user.id);
    await setAuthCookie(token);

    return NextResponse.json({
      id: user.id, email: user.email, nickname: user.nickname, role: user.role,
    });
  } catch {
    return NextResponse.json({ error: "注册失败，请稍后重试" }, { status: 500 });
  }
}

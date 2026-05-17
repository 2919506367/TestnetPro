import { NextRequest, NextResponse } from "next/server";
import { sendVerificationCode } from "@/lib/email";
import { setEmailCode, getEmailCodeRemaining } from "@/lib/verification";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
    }

    const remaining = getEmailCodeRemaining(email);
    if (remaining > 0 && remaining > 10) {
      return NextResponse.json({ error: `请${remaining}秒后再试` }, { status: 429 });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    setEmailCode(email, code);

    const sent = await sendVerificationCode(email, code);
    if (!sent) {
      return NextResponse.json({ error: "邮件发送失败，请确认邮箱地址正确" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "请求失败" }, { status: 500 });
  }
}

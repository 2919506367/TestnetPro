import { NextResponse } from "next/server";
import { generateCaptcha, setCaptcha } from "@/lib/captcha";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const token = uuidv4();
  const { text, svg } = generateCaptcha();
  setCaptcha(token, text);

  const resp = NextResponse.json({ svg });
  resp.cookies.set("captcha_token", token, {
    httpOnly: true,
    secure: false,
    path: "/",
    maxAge: 120,
    sameSite: "lax",
  });
  return resp;
}

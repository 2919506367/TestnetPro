import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookies } from "@/lib/auth";
import { getUploadDir } from "@/lib/storage";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "请上传图片" }, { status: 400 });
  }

  const formData = await request.formData();
  const imageFile = formData.get("image") as File | null;
  if (!imageFile) return NextResponse.json({ error: "请选择图片" }, { status: 400 });

  const MAX_SIZE = 5 * 1024 * 1024;
  if (imageFile.size > MAX_SIZE) return NextResponse.json({ error: "图片不能超过5MB" }, { status: 400 });

  const allowedTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
  if (!allowedTypes.includes(imageFile.type)) {
    return NextResponse.json({ error: "仅支持PNG/JPG/GIF/WEBP" }, { status: 400 });
  }

  const ext = path.extname(imageFile.name) || ".png";
  const safeExt = [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext) ? ext : ".png";
  const filename = "emoji_" + uuidv4() + safeExt;

  const emoticonDir = path.resolve(process.cwd(), "public", "uploads", "emoticons");
  if (!fs.existsSync(emoticonDir)) fs.mkdirSync(emoticonDir, { recursive: true });

  const filePath = path.resolve(emoticonDir, filename);
  const buffer = Buffer.from(await imageFile.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  const imageUrl = `/uploads/emoticons/${filename}`;
  return NextResponse.json({ ok: true, imageUrl });
}

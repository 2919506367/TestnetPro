import { NextRequest, NextResponse } from "next/server";
import { biliFetch } from "@/lib/bilibili";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mid: string }> }
) {
  const { mid } = await params;
  if (!mid) return NextResponse.json({ error: "缺少mid" }, { status: 400 });

  try {
    const [infoData, statData] = await Promise.all([
      biliFetch(`/x/space/acc/info?mid=${mid}`),
      biliFetch(`/x/relation/stat?vmid=${mid}`),
    ]);

    const info = (infoData?.data || {}) as Record<string, unknown>;
    const stat = (statData?.data || {}) as Record<string, unknown>;

    return NextResponse.json({
      mid: Number(info.mid || mid),
      name: String(info.name || ""),
      face: String(info.face || ""),
      sign: String(info.sign || ""),
      sex: String(info.sex || ""),
      level: Number(info.level || 0),
      birthday: String(info.birthday || ""),
      followerCount: formatNum(Number(stat.follower || 0)),
      followingCount: formatNum(Number(stat.following || 0)),
      videoCount: Number(info.videos || 0),
    });
  } catch {
    return NextResponse.json({ error: "获取用户信息失败" }, { status: 502 });
  }
}

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  return String(n);
}

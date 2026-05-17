import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "cloud-drive-secret-key-change-in-production"
);

const COOKIE_NAME = "token";

async function getUserIdFromRequest(request: NextRequest): Promise<number | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const sub = payload.sub;
    if (!sub) return null;
    return parseInt(sub, 10);
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const userId = await getUserIdFromRequest(request);

  if (userId && pathname === "/") {
    return NextResponse.redirect(new URL("/drive", request.url));
  }

  const response = NextResponse.next();
  if (userId) {
    response.headers.set("X-Auth-UserId", String(userId));
  }
  return response;
}

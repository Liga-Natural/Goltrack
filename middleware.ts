import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secretKey = new TextEncoder().encode(process.env.SESSION_SECRET || "dev-only-secret-change-me-32chars");

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("goltrack_session")?.value;
  let valid = false;
  if (token) {
    try {
      await jwtVerify(token, secretKey);
      valid = true;
    } catch {
      valid = false;
    }
  }
  if (!valid) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

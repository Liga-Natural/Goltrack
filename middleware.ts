import { NextResponse, type NextRequest } from "next/server";

// Session gate for the authenticated half of the site.
//
// This is a fast redirect, not the security boundary. Middleware runs on the
// edge runtime where the database and the password hashing are not
// available, so all it can honestly do is look for the session cookie: a
// visitor with no cookie is sent to the login page instead of watching a
// dashboard render and then bounce. A cookie that is stale, forged, or
// belongs to a deleted account still gets past here — and is then refused by
// app/(app)/layout.tsx, which loads the real user server-side, and by every
// action that checks a role or an ownership before it writes anything.
//
// Kept as an explicit list of path prefixes rather than derived from the
// route group, because middleware matches URLs and a route group is invisible
// in a URL by design.
const PROTECTED = ["/admin", "/dashboard", "/coach", "/communication", "/me", "/referee", "/team"];

const SESSION_COOKIE = "jogo_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsSession = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!needsSession) return NextResponse.next();

  if (request.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next();

  // Where they were going, so login can send them back rather than dumping
  // everyone on the same landing page.
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except Next's own assets, the API routes (which do their own
  // auth and must be able to answer 404 rather than redirect), and files with
  // an extension — the vendored face-detection model among them.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

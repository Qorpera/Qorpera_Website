import { NextRequest, NextResponse } from "next/server";
import { decodeSession, SESSION_COOKIE } from "@/lib/session-codec";

const PUBLIC_PATHS = new Set(["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname.startsWith("/api/stripe/webhook")) return true;
  // Runner endpoints authenticate via bearer token, not session cookie
  if (pathname.startsWith("/api/runners/heartbeat")) return true;
  if (pathname.startsWith("/api/runners/jobs/poll")) return true;
  if (pathname.startsWith("/api/runners/policy/resolve")) return true;
  // Runner job lifecycle endpoints (start, renew, events, complete, control/poll)
  if (/^\/api\/runners\/jobs\/[^/]+\/(start|renew|events|complete|control\/poll)/.test(pathname)) return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let authenticated = false;

  if (token) {
    const session = await decodeSession(token);
    if (session) {
      authenticated = true;
    } else if (process.env.NODE_ENV !== "production" && !token.includes(".")) {
      // Legacy unsigned dev cookie
      authenticated = true;
    }
  }

  if (!authenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico and static assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

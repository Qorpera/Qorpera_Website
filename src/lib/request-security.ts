import { NextResponse } from "next/server";

function originFromHeaders(request: Request) {
  const origin = request.headers.get("origin")?.trim();
  if (origin) return origin;
  const referer = request.headers.get("referer")?.trim();
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function verifySameOrigin(request: Request): { ok: true } | { ok: false; response: NextResponse } {
  // Non-browser clients often omit both headers. Allow in development for local scripts/testing.
  const headerOrigin = originFromHeaders(request);
  if (!headerOrigin) {
    if (process.env.NODE_ENV !== "production") return { ok: true };
    return {
      ok: false,
      response: NextResponse.json({ error: "Missing Origin/Referer header" }, { status: 403 }),
    };
  }

  let requestOrigin: string;
  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid request URL" }, { status: 400 }),
    };
  }

  // Behind a reverse proxy the internal request URL may differ from the public origin.
  const publicOrigin = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
    : null;

  if (headerOrigin !== requestOrigin && headerOrigin !== publicOrigin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 }),
    };
  }

  return { ok: true };
}

export function requireProductionDisabled(request: Request, routeLabel: string) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: `${routeLabel} is disabled in production` }, { status: 403 });
  }
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;
  return null;
}

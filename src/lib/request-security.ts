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

  // Collect all origins we consider "same site".
  // Behind a reverse proxy the internal request.url may differ from the public origin,
  // so we also check NEXT_PUBLIC_APP_URL and the Host/X-Forwarded-Host headers.
  const allowedOrigins = new Set<string>();

  try { allowedOrigins.add(new URL(request.url).origin); } catch { /* ignore */ }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    try { allowedOrigins.add(new URL(process.env.NEXT_PUBLIC_APP_URL).origin); } catch { /* ignore */ }
  }

  // Trust the Host / X-Forwarded-Host header so proxied deployments work
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (forwardedHost) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    allowedOrigins.add(`${proto}://${forwardedHost.split(",")[0].trim()}`);
  }

  if (!allowedOrigins.has(headerOrigin)) {
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

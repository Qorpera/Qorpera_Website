import { NextResponse } from "next/server";
import { get2faPendingUserId, clear2faPendingCookie, setSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyTotpCode } from "@/lib/totp";
import { verifySameOrigin } from "@/lib/request-security";

export async function POST(req: Request) {
  const sameOrigin = verifySameOrigin(req);
  if (!sameOrigin.ok) return sameOrigin.response;

  const userId = await get2faPendingUserId();
  if (!userId) return NextResponse.json({ error: "No pending 2FA session" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const code = String(json?.code ?? "").replace(/\s/g, "");
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpSecret: true, totpEnabled: true },
  });

  // If 2FA was disabled between login start and verify, just grant the session
  if (!user?.totpEnabled || !user.totpSecret) {
    await clear2faPendingCookie();
    await setSession(userId);
    return NextResponse.json({ ok: true });
  }

  if (!verifyTotpCode(code, user.totpSecret)) {
    return NextResponse.json({ error: "Invalid code — try again" }, { status: 400 });
  }

  await clear2faPendingCookie();
  await setSession(userId);
  return NextResponse.json({ ok: true });
}

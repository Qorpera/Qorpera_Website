import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyTotpCode } from "@/lib/totp";
import { verifySameOrigin } from "@/lib/request-security";

export async function POST(req: Request) {
  const sameOrigin = verifySameOrigin(req);
  if (!sameOrigin.ok) return sameOrigin.response;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const code = String(json?.code ?? "").replace(/\s/g, "");
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { totpSecret: true, totpEnabled: true },
  });
  if (!user?.totpSecret) return NextResponse.json({ error: "Run 2FA setup first" }, { status: 400 });
  if (user.totpEnabled) return NextResponse.json({ error: "2FA already enabled" }, { status: 409 });

  if (!verifyTotpCode(code, user.totpSecret)) {
    return NextResponse.json({ error: "Invalid code — try again" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: session.userId }, data: { totpEnabled: true } });
  return NextResponse.json({ ok: true });
}

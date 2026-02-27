import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateTotpSecret, getTotpOtpAuthUrl, generateTotpQrDataUrl } from "@/lib/totp";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, totpEnabled: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.totpEnabled) return NextResponse.json({ error: "2FA already enabled" }, { status: 409 });

  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: session.userId }, data: { totpSecret: secret } });

  const otpAuthUrl = getTotpOtpAuthUrl(user.email, secret);
  const qrDataUrl = await generateTotpQrDataUrl(otpAuthUrl);

  return NextResponse.json({ secret, qrDataUrl });
}

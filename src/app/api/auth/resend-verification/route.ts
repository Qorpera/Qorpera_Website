import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { sendEmail } from "@/lib/email-sender";
import { verifySameOrigin } from "@/lib/request-security";

const VERIFY_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export async function POST(req: Request) {
  const sameOrigin = verifySameOrigin(req);
  if (!sameOrigin.ok) return sameOrigin.response;

  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.emailVerified) return NextResponse.json({ ok: true, already: true });

  const token = randomBytes(32).toString("base64url");
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerifyToken: token, emailVerifyExp: new Date(Date.now() + VERIFY_TTL_MS) },
  });

  const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyUrl = `${origin}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`;

  await sendEmail({
    to: user.email,
    subject: "Verify your Zygenic email",
    body: `Welcome to Zygenic!\n\nClick here to verify your email:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}

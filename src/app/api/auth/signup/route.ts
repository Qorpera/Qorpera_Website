import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { hashPassword, setSession } from "@/lib/auth";
import { ensureBaseAgents } from "@/lib/seed";
import { sendEmail } from "@/lib/email-sender";
import { SignupBody } from "@/lib/schemas";
import { verifySameOrigin } from "@/lib/request-security";

const VERIFY_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export async function POST(req: Request) {
  const sameOrigin = verifySameOrigin(req);
  if (!sameOrigin.ok) return sameOrigin.response;
  const json = await req.json().catch(() => null);
  const parsed = SignupBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const emailVerifyToken = randomBytes(32).toString("base64url");
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      emailVerifyToken,
      emailVerifyExp: new Date(Date.now() + VERIFY_TTL_MS),
    },
  });

  await ensureBaseAgents();
  await setSession(user.id);

  // Send verification email (fire-and-forget — don't block signup)
  const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyUrl = `${origin}/api/auth/verify-email?token=${emailVerifyToken}&email=${encodeURIComponent(email)}`;
  sendEmail({
    to: email,
    subject: "Verify your qorpera email",
    body: `Welcome to qorpera!\n\nClick here to verify your email:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}

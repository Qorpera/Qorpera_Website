import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email-sender";
import { verifySameOrigin } from "@/lib/request-security";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const Body = z.object({ email: z.string().email() });

const RESET_TTL_MS = 1000 * 60 * 60; // 1 hour

export async function POST(req: NextRequest) {
  const sameOrigin = verifySameOrigin(req);
  if (!sameOrigin.ok) return sameOrigin.response;

  // Rate-limit by IP: 5 requests per 15 minutes
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await checkRateLimit(`forgot:${ip}`, "auth");
  if (!rl.allowed) return rl.response!;

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  // Always return success to prevent email enumeration
  const ok = NextResponse.json({ ok: true });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return ok;

  const token = randomBytes(32).toString("base64url");
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExp: new Date(Date.now() + RESET_TTL_MS) },
  });

  const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://qorpera.com";
  const resetUrl = `${origin}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

  await sendEmail({
    to: user.email,
    subject: "Reset your qorpera password",
    body: `You requested a password reset.\n\nClick here to reset your password:\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
  }, user.id).catch((err: unknown) => {
    console.error("[forgot-password] Failed to send reset email", { err: String(err) });
  });

  return ok;
}

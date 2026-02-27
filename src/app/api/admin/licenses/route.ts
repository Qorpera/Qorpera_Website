import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import { createPlanLicenseKey, revokePlanLicenseKey } from "@/lib/plan-license-keys-store";
import { sendEmail } from "@/lib/email-sender";
import type { PlanTier } from "@prisma/client";

function isOwner(userId: string) {
  const ownerId = process.env.OWNER_USER_ID;
  return Boolean(ownerId && userId === ownerId);
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.qorpera.ai";

const TIER_LABELS: Record<string, string> = {
  SOLO: "Solo (4 agents)",
  SMALL_BUSINESS: "Small Business (8 agents)",
  MID_SIZE: "Mid-size (20 agents)",
};

function buildLicenseEmail(code: string, tier: string, toEmail: string): { html: string; text: string } {
  const tierLabel = TIER_LABELS[tier] ?? tier;
  const redeemUrl = `${APP_URL}/profile?tab=plans`;
  const accent = "#2dd4bf";

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
        <tr><td style="height:4px;background:${accent};"></td></tr>
        <tr><td style="padding:32px 36px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${accent};">Qorpera</p>
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#f1f5f9;">Your license key is ready</h1>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:rgba(241,245,249,0.65);">
            You've been granted access to the <strong style="color:#f1f5f9;">${tierLabel}</strong> plan.
            Use the key below to activate it on your account.
          </p>
          <div style="background:#0d1117;border:1px solid rgba(45,212,191,0.3);border-radius:8px;padding:16px 20px;margin:0 0 28px;text-align:center;">
            <p style="margin:0 0 6px;font-size:11px;color:rgba(241,245,249,0.4);letter-spacing:0.06em;text-transform:uppercase;">License Key</p>
            <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:0.12em;color:#2dd4bf;font-family:'Courier New',Courier,monospace;">${code}</p>
          </div>
          <a href="${redeemUrl}" style="display:inline-block;background:${accent};color:#0d1117;font-size:13px;font-weight:700;padding:10px 22px;border-radius:8px;text-decoration:none;">Redeem on Qorpera</a>
          <p style="margin:20px 0 0;font-size:12px;color:rgba(241,245,249,0.35);">
            Go to Profile → Plans → Redeem License Key, or visit<br>
            <a href="${redeemUrl}" style="color:rgba(45,212,191,0.7);">${redeemUrl}</a>
          </p>
        </td></tr>
        <tr><td style="padding:16px 36px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;font-size:11px;color:rgba(241,245,249,0.3);">This key was sent to ${toEmail}. Keep it safe — it can only be redeemed once.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text =
    `Your Qorpera license key\n\n` +
    `Plan: ${tierLabel}\n` +
    `Key: ${code}\n\n` +
    `Redeem at: ${redeemUrl}\n\n` +
    `Go to Profile → Plans → Redeem License Key and enter the code above.\n\n` +
    `This key can only be redeemed once.`;

  return { html, text };
}

const GrantBody = z.object({
  email: z.string().email(),
  tier: z.enum(["SOLO", "SMALL_BUSINESS", "MID_SIZE"]),
});

const RevokeBody = z.object({
  keyId: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !isOwner(session.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = GrantBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const { email, tier } = parsed.data;

  let key;
  try {
    key = await createPlanLicenseKey(session.userId, tier as PlanTier);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to generate key";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const { html, text } = buildLicenseEmail(key.code, tier, email);
  const emailResult = await sendEmail(
    {
      to: email,
      subject: `Your Qorpera license key — ${TIER_LABELS[tier] ?? tier}`,
      body: text,
      html,
    },
    session.userId,
  );

  return NextResponse.json({
    code: key.code,
    keyId: key.id,
    emailOk: emailResult.ok,
    emailError: emailResult.ok ? null : emailResult.error,
  });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || !isOwner(session.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = RevokeBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await revokePlanLicenseKey(session.userId, parsed.data.keyId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to revoke";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}

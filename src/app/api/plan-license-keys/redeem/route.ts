import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request-security";
import { RedeemPlanLicenseKeyBody } from "@/lib/schemas";
import { redeemPlanLicenseKey } from "@/lib/plan-license-keys-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;

  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = RedeemPlanLicenseKeyBody.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  try {
    const result = await redeemPlanLicenseKey(userId, parsed.data.code);
    return NextResponse.json({
      ok: true,
      planName: result.subscription.plan.name,
      tier: result.key.tier,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to redeem" }, { status: 400 });
  }
}

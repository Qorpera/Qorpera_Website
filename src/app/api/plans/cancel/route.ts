import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getActivePlanForUser, cancelPlanSubscription } from "@/lib/plan-store";
import { cancelStripePlanSubscription } from "@/lib/plan-checkout";
import { verifySameOrigin } from "@/lib/request-security";

export async function POST(req: Request) {
  const sameOrigin = verifySameOrigin(req);
  if (!sameOrigin.ok) return sameOrigin.response;

  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await getActivePlanForUser(userId);
  if (!sub) {
    return NextResponse.json({ error: "No active plan subscription found." }, { status: 404 });
  }

  try {
    if (sub.stripeSubscriptionId) {
      await cancelStripePlanSubscription(sub.stripeSubscriptionId);
    }
    await cancelPlanSubscription(sub.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Cancellation failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

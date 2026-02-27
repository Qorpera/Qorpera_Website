import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { createPlanSubscription } from "@/lib/plan-store";
import { createPlanCheckoutSession } from "@/lib/plan-checkout";
import { verifySameOrigin } from "@/lib/request-security";
import { z } from "zod";

const SubscribeBody = z.object({
  planSlug: z.enum(["solo", "small-business", "mid-size"]),
});

function parseBaseUrl(req: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return new URL(req.url).origin;
}

export async function POST(req: Request) {
  const sameOrigin = verifySameOrigin(req);
  if (!sameOrigin.ok) return sameOrigin.response;

  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = SubscribeBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { planSlug } = parsed.data;

  // Only SOLO tier supports self-service checkout
  if (planSlug !== "solo") {
    return NextResponse.json(
      { error: "This plan requires contacting sales. Use /api/plans/inquire instead." },
      { status: 400 },
    );
  }

  try {
    const sub = await createPlanSubscription(userId, planSlug);

    const session = await createPlanCheckoutSession({
      baseUrl: parseBaseUrl(req),
      userId,
      planSubscriptionId: sub.id,
      planSlug,
    });

    if (!session?.url) {
      return NextResponse.json({ error: "Stripe checkout session could not be created." }, { status: 502 });
    }

    return NextResponse.json({ url: session.url, subscriptionId: sub.id });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Checkout failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

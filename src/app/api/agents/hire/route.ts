import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { type HireAgentKind, type HireSchedule, createHiredJobIfMissing } from "@/lib/agent-hiring";
import { createStripeCheckoutSession, isStripeCheckoutEnabledForPlan } from "@/lib/stripe-checkout";
import { ensureStripeFinanceArtifacts } from "@/lib/stripe-payments-store";
import { createAgentPurchaseOrder, markOrderCheckoutCreated, markOrderCheckoutFailed } from "@/lib/agent-purchase-orders";
import { HireBody } from "@/lib/schemas";
import { verifySameOrigin } from "@/lib/request-security";

function parseBaseUrl(req: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return new URL(req.url).origin;
}

async function parseRequestData(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return req.json().catch(() => null);
  }
  const form = await req.formData();
  return Object.fromEntries(form.entries());
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

  const parsed = HireBody.safeParse(await parseRequestData(req));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { agentKind, schedule, mode } = parsed.data as {
    agentKind: HireAgentKind;
    schedule: HireSchedule;
    mode: "HIRE" | "LOCAL_DEMO";
  };

  if (mode === "LOCAL_DEMO") {
    if (process.env.NODE_ENV === "production") {
      const url = new URL("/agents/hire", req.url);
      url.searchParams.set("checkout", "error");
      url.searchParams.set("message", "Local demo mode is disabled in production.");
      return NextResponse.redirect(url, { status: 303 });
    }
    await createHiredJobIfMissing({ userId, agentKind, schedule });
    const url = new URL("/agents/hire", req.url);
    url.searchParams.set("checkout", "demo");
    url.searchParams.set("agentKind", agentKind);
    return NextResponse.redirect(url, { status: 303 });
  }

  if (!isStripeCheckoutEnabledForPlan(agentKind, schedule)) {
    const url = new URL("/agents/hire", req.url);
    url.searchParams.set("checkout", "error");
    url.searchParams.set("message", `Stripe subscription price is not configured for ${agentKind} (${schedule}).`);
    return NextResponse.redirect(url, { status: 303 });
  }

  const order = await createAgentPurchaseOrder({
    userId,
    agentKind,
    schedule,
  });

  try {
    await ensureStripeFinanceArtifacts(userId);
    const stripeSession = await createStripeCheckoutSession({
      baseUrl: parseBaseUrl(req),
      userId,
      orderId: order.id,
      agentKind,
      schedule,
    });

    if (!stripeSession?.url) {
      await markOrderCheckoutFailed({ orderId: order.id, reason: "Stripe checkout session was not created." });
      const url = new URL("/agents/hire", req.url);
      url.searchParams.set("checkout", "error");
      url.searchParams.set("order_id", order.id);
      url.searchParams.set("message", "Stripe checkout session could not be created.");
      return NextResponse.redirect(url, { status: 303 });
    }

    await markOrderCheckoutCreated({ orderId: order.id, checkoutSessionId: stripeSession.id });
    return NextResponse.redirect(stripeSession.url, { status: 303 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Stripe checkout failed";
    await markOrderCheckoutFailed({ orderId: order.id, reason: msg }).catch(() => undefined);
    const url = new URL("/agents/hire", req.url);
    url.searchParams.set("checkout", "error");
    url.searchParams.set("order_id", order.id);
    url.searchParams.set("message", msg);
    return NextResponse.redirect(url, { status: 303 });
  }
}

import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request-security";
import { prisma } from "@/lib/db";
import { cancelStripeSubscription } from "@/lib/stripe-checkout";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sameOrigin = verifySameOrigin(req);
  if (!sameOrigin.ok) return sameOrigin.response;

  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let jobId: string | null = null;

  if (contentType.includes("application/json")) {
    const raw = await req.json().catch(() => ({}));
    jobId = typeof raw.jobId === "string" ? raw.jobId : null;
  } else {
    const form = await req.formData().catch(() => null);
    jobId = form?.get("jobId")?.toString() ?? null;
  }

  if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

  const job = await prisma.hiredJob.findFirst({ where: { id: jobId, userId } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Look for an active Stripe subscription for this user + agent kind
  const stripeSub = await prisma.stripeSubscription.findFirst({
    where: { userId, agentKind: job.agentKind, status: "active" },
    orderBy: { createdAt: "desc" },
  });

  // Only treat as a paid Stripe subscription if it has a real future billing period.
  // Stale records (no currentPeriodEnd, or period already ended) are treated like LOCAL_DEMO.
  const hasFuturePeriod =
    stripeSub?.currentPeriodEnd != null && new Date(stripeSub.currentPeriodEnd) > new Date();

  if (stripeSub && hasFuturePeriod) {
    // Cancel via Stripe — agent stays active until period ends
    const result = await cancelStripeSubscription(stripeSub.stripeSubscriptionId);

    await prisma.stripeSubscription.update({
      where: { id: stripeSub.id },
      data: { cancelAtPeriodEnd: true },
    });

    const endDate = new Date(result.current_period_end * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return NextResponse.redirect(
      new URL(`/agents/hire?message=${encodeURIComponent(`Subscription cancelled. Agent stays active until ${endDate}.`)}`, req.url),
      { status: 303 },
    );
  }

  // No active paid subscription (LOCAL_DEMO or stale record) — disable immediately
  await prisma.hiredJob.update({ where: { id: jobId }, data: { enabled: false } });

  return NextResponse.redirect(new URL("/agents/hire", req.url), { status: 303 });
}

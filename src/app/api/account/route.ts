import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request-security";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/session-codec";

export const runtime = "nodejs";

async function cancelStripeSubNow(subId: string) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return;
  await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  }).catch(() => {});
}

export async function DELETE(req: Request) {
  const sameOrigin = verifySameOrigin(req);
  if (!sameOrigin.ok) return sameOrigin.response;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = session;

  // Cancel active Stripe subscriptions immediately before deleting user data
  const [planSubs, stripeSubs] = await Promise.all([
    prisma.planSubscription.findMany({
      where: { userId, status: { in: ["active", "trialing", "past_due"] } },
      select: { stripeSubscriptionId: true },
    }),
    prisma.stripeSubscription.findMany({
      where: { userId, status: { in: ["active", "trialing", "past_due"] } },
      select: { stripeSubscriptionId: true },
    }),
  ]);

  const subIds = new Set([
    ...planSubs.map((s) => s.stripeSubscriptionId).filter(Boolean),
    ...stripeSubs.map((s) => s.stripeSubscriptionId).filter(Boolean),
  ]);

  await Promise.all([...subIds].map((id) => cancelStripeSubNow(id!)));

  // Delete user — all related rows cascade via Prisma schema
  await prisma.user.delete({ where: { id: userId } });

  // Clear session cookie
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}

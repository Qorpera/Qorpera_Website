import { prisma } from "@/lib/db";
import { disableAllHiredJobs } from "@/lib/plan-store";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AdminUserRow = {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
  plan: { name: string; tier: string } | null;
  subscription: {
    id: string;
    status: string;
    source: string;
    currentPeriodEnd: Date | null;
  } | null;
  hiredCount: number;
  agentCap: number;
  lastSessionAt: Date | null;
  hiredAgents: Array<{ id: string; agentKind: string; title: string; enabled: boolean }>;
  businessLogCount: number;
};

export type ManualLicense = {
  id: string;
  userId: string;
  email: string;
  planName: string;
  planTier: string;
  status: string;
  createdAt: Date;
};

export type DevStats = {
  totalUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  activeManualLicenses: number;
  activeStripeSubscriptions: number;
  totalHiredAgents: number;
  advisorSessionsLast7Days: number;
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getAllUsersWithStats(): Promise<AdminUserRow[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      createdAt: true,
      jobs: {
        select: { id: true, agentKind: true, title: true, enabled: true },
        where: { enabled: true },
      },
      planSubscriptions: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { plan: { select: { name: true, tier: true, agentCap: true } } },
      },
      advisorSessions: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { updatedAt: true },
      },
      _count: {
        select: { businessLogs: true },
      },
    },
  });

  return users.map((u) => {
    const sub = u.planSubscriptions[0] ?? null;
    return {
      id: u.id,
      email: u.email,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt,
      plan: sub ? { name: sub.plan.name, tier: String(sub.plan.tier) } : null,
      subscription: sub
        ? {
            id: sub.id,
            status: sub.status,
            source: sub.source,
            currentPeriodEnd: sub.currentPeriodEnd ?? null,
          }
        : null,
      hiredCount: u.jobs.length,
      agentCap: sub?.plan.agentCap ?? 0,
      lastSessionAt: u.advisorSessions[0]?.updatedAt ?? null,
      hiredAgents: u.jobs.map((j) => ({
        id: j.id,
        agentKind: String(j.agentKind),
        title: j.title,
        enabled: j.enabled,
      })),
      businessLogCount: u._count.businessLogs,
    };
  });
}

// ─── Manual license management ────────────────────────────────────────────────

const TIER_TO_SLUG: Record<string, string> = {
  SOLO: "solo",
  SMALL_BUSINESS: "small-business",
  MID_SIZE: "mid-size",
};

export async function grantManualLicense(
  email: string,
  tier: "SOLO" | "SMALL_BUSINESS" | "MID_SIZE",
): Promise<{ ok: true; subscriptionId: string } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: false, error: `No user found with email "${email}"` };

  const slug = TIER_TO_SLUG[tier];
  const plan = await prisma.plan.findUnique({ where: { slug } });
  if (!plan) return { ok: false, error: `Plan "${slug}" not found in DB` };

  // Cancel any existing active subscriptions for this user first
  await prisma.planSubscription.updateMany({
    where: { userId: user.id, status: "ACTIVE" },
    data: { status: "CANCELED", canceledAt: new Date() },
  });

  const sub = await prisma.planSubscription.create({
    data: {
      userId: user.id,
      planId: plan.id,
      status: "ACTIVE",
      source: "MANUAL",
    },
  });

  return { ok: true, subscriptionId: sub.id };
}

export async function revokeManualLicense(
  subscriptionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sub = await prisma.planSubscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!sub) return { ok: false, error: "Subscription not found" };

  if (sub.source !== "MANUAL") {
    return { ok: false, error: "Only manual licenses can be revoked here" };
  }

  await prisma.planSubscription.update({
    where: { id: subscriptionId },
    data: { status: "CANCELED", canceledAt: new Date() },
  });

  await disableAllHiredJobs(sub.userId);

  return { ok: true };
}

export async function getManualLicenses(): Promise<ManualLicense[]> {
  const subs = await prisma.planSubscription.findMany({
    where: { source: "MANUAL" },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true } },
      plan: { select: { name: true, tier: true } },
    },
  });

  return subs.map((s) => ({
    id: s.id,
    userId: s.userId,
    email: s.user.email,
    planName: s.plan.name,
    planTier: String(s.plan.tier),
    status: s.status,
    createdAt: s.createdAt,
  }));
}

// ─── Dev stats ────────────────────────────────────────────────────────────────

export async function getDevStats(): Promise<DevStats> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    verifiedUsers,
    activeManualLicenses,
    activeStripeSubscriptions,
    totalHiredAgents,
    advisorSessionsLast7Days,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { emailVerified: true } }),
    prisma.planSubscription.count({ where: { status: "ACTIVE", source: "MANUAL" } }),
    prisma.planSubscription.count({ where: { status: "ACTIVE", source: "STRIPE" } }),
    prisma.hiredJob.count({ where: { enabled: true } }),
    prisma.advisorSession.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
  ]);

  return {
    totalUsers,
    verifiedUsers,
    unverifiedUsers: totalUsers - verifiedUsers,
    activeManualLicenses,
    activeStripeSubscriptions,
    totalHiredAgents,
    advisorSessionsLast7Days,
  };
}

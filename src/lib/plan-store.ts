import { prisma } from "@/lib/db";

export async function getActivePlanForUser(userId: string) {
  const sub = await prisma.planSubscription.findFirst({
    where: { userId, status: "ACTIVE" },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
  return sub;
}

export async function getUserAgentCap(userId: string): Promise<number> {
  const sub = await getActivePlanForUser(userId);
  return sub?.plan.agentCap ?? 0;
}

export async function getHiredAgentCount(userId: string): Promise<number> {
  return prisma.hiredJob.count({
    where: { userId, enabled: true },
  });
}

export async function canHireMoreAgents(userId: string): Promise<boolean> {
  const cap = await getUserAgentCap(userId);
  if (cap <= 0) return false;
  const count = await getHiredAgentCount(userId);
  return count < cap;
}

export async function createPlanSubscription(userId: string, planSlug: string) {
  const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
  if (!plan || !plan.isActive) {
    throw new Error(`Plan "${planSlug}" not found or inactive`);
  }

  return prisma.planSubscription.create({
    data: {
      userId,
      planId: plan.id,
      status: "PENDING",
    },
    include: { plan: true },
  });
}

export async function activatePlanSubscription(
  subscriptionId: string,
  stripeData?: {
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
    checkoutSessionId?: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
  },
) {
  return prisma.planSubscription.update({
    where: { id: subscriptionId },
    data: {
      status: "ACTIVE",
      ...stripeData,
    },
  });
}

export async function cancelPlanSubscription(subscriptionId: string) {
  return prisma.planSubscription.update({
    where: { id: subscriptionId },
    data: {
      cancelAtPeriodEnd: true,
      canceledAt: new Date(),
    },
  });
}

export async function deactivatePlanSubscription(subscriptionId: string) {
  return prisma.planSubscription.update({
    where: { id: subscriptionId },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
    },
  });
}

export async function disableAllHiredJobs(userId: string) {
  return prisma.hiredJob.updateMany({
    where: { userId, enabled: true },
    data: { enabled: false },
  });
}

export async function getPlanStatus(userId: string) {
  const sub = await getActivePlanForUser(userId);
  const hiredCount = await getHiredAgentCount(userId);
  return {
    plan: sub?.plan ?? null,
    subscription: sub
      ? {
          id: sub.id,
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        }
      : null,
    hiredCount,
    agentCap: sub?.plan.agentCap ?? 0,
  };
}

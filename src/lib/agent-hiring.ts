import { prisma } from "@/lib/db";
import { getHireCatalogItem, getHiredJobTitle, type HireAgentKind, type HireSchedule } from "@/lib/agent-catalog";

// Re-export everything from the client-safe catalog so existing server-side
// consumers can keep importing from this file without changes.
export type { HireAgentKind, HireSchedule, AgentHireCatalogItem } from "@/lib/agent-catalog";
export { AGENT_HIRE_CATALOG, getHireCatalogItem, getHiredJobTitle } from "@/lib/agent-catalog";

export async function createHiredJobIfMissing(input: {
  userId: string;
  agentKind: HireAgentKind;
  schedule: HireSchedule;
}) {
  const title = getHiredJobTitle(input.agentKind);
  const existing = await prisma.hiredJob.findFirst({
    where: {
      userId: input.userId,
      title,
      agentKind: input.agentKind,
      schedule: input.schedule,
    },
  });

  if (existing) return { job: existing, created: false };

  const job = await prisma.hiredJob.create({
    data: {
      userId: input.userId,
      title,
      agentKind: input.agentKind,
      schedule: input.schedule,
    },
  });

  return { job, created: true };
}

export async function hireAgentWithinPlan(userId: string, agentKind: HireAgentKind) {
  // Wrap in a transaction so cap check + create/enable are atomic —
  // prevents concurrent requests from bypassing the agent cap.
  return prisma.$transaction(async (tx) => {
    // Check cap inside the transaction
    const sub = await tx.planSubscription.findFirst({
      where: { userId, status: "ACTIVE" },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
    const cap = sub?.plan.agentCap ?? 0;
    if (cap <= 0) {
      return { ok: false as const, error: "Agent cap reached. Upgrade your plan or deactivate an agent to make room." };
    }
    const count = await tx.hiredJob.count({ where: { userId, enabled: true } });
    if (count >= cap) {
      return { ok: false as const, error: "Agent cap reached. Upgrade your plan or deactivate an agent to make room." };
    }

    // Check if already hired and enabled
    const existing = await tx.hiredJob.findFirst({
      where: { userId, agentKind, enabled: true },
    });
    if (existing) {
      return { ok: true as const, job: existing, created: false };
    }

    // Re-enable a previously disabled job if one exists
    const disabled = await tx.hiredJob.findFirst({
      where: { userId, agentKind, enabled: false },
      orderBy: { updatedAt: "desc" },
    });
    if (disabled) {
      const job = await tx.hiredJob.update({
        where: { id: disabled.id },
        data: { enabled: true, schedule: "MONTHLY" },
      });
      return { ok: true as const, job, created: false };
    }

    const title = getHiredJobTitle(agentKind);
    const job = await tx.hiredJob.create({
      data: {
        userId,
        title,
        agentKind,
        schedule: "MONTHLY",
      },
    });
    return { ok: true as const, job, created: true };
  });
}

export async function fireAgentFromPlan(userId: string, agentKind: HireAgentKind) {
  const result = await prisma.hiredJob.updateMany({
    where: { userId, agentKind, enabled: true },
    data: { enabled: false },
  });
  return { ok: true, deactivated: result.count };
}

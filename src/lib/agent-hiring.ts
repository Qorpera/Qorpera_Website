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

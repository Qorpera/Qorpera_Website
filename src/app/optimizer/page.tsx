import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AgentOptimizer } from "@/components/agent-optimizer";
import {
  listCycles,
  getLatestCycle,
  getAppliedApplications,
} from "@/lib/optimizer/optimizer-store";

export default async function OptimizerPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const agentKind = "CHIEF_ADVISOR";

  const [cycles, latestDetail, appliedApplications] = await Promise.all([
    listCycles(session.userId, agentKind, 5),
    getLatestCycle(session.userId, agentKind),
    getAppliedApplications(session.userId, agentKind),
  ]);

  return (
    <AgentOptimizer
      agentKind={agentKind}
      initialCycles={cycles}
      initialLatestDetail={
        latestDetail
          ? {
              ...latestDetail,
              appliedImprovementIds: Array.from(latestDetail.appliedImprovementIds),
            }
          : null
      }
      initialAppliedApplications={appliedApplications}
    />
  );
}

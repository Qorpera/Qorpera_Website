import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listRecurringTasks } from "@/lib/recurring-tasks-store";
import { prisma } from "@/lib/db";
import { SchedulePanel } from "@/components/schedule-panel";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const session = await getSession();
  if (!session) notFound();

  const [tasks, hiredJobs] = await Promise.all([
    listRecurringTasks(session.userId),
    prisma.hiredJob.findMany({
      where: { userId: session.userId, enabled: true },
      select: { agentKind: true },
      distinct: ["agentKind"],
    }),
  ]);

  const hiredKinds = hiredJobs.map((j) => j.agentKind as string);

  return <SchedulePanel initialTasks={tasks} hiredKinds={hiredKinds} />;
}

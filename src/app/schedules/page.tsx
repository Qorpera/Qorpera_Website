import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listSchedules } from "@/lib/schedule-store";
import { SchedulesPanel } from "@/components/schedules-panel";

export const dynamic = "force-dynamic";

export default async function SchedulesPage() {
  const session = await getSession();
  if (!session) return notFound();

  const schedules = await listSchedules(session.userId);

  return <SchedulesPanel initialSchedules={schedules} />;
}

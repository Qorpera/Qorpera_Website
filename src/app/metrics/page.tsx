import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getMetricsForUser } from "@/lib/metrics-store";
import { MetricsDashboard } from "@/components/metrics-dashboard";

export const dynamic = "force-dynamic";

export default async function MetricsPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string | string[] | undefined }>;
}) {
  const session = await getSession();
  if (!session) return notFound();

  const resolved = (await searchParams) ?? {};
  const rangeRaw = Array.isArray(resolved.range) ? resolved.range[0] : resolved.range;
  const rangeDays = rangeRaw === "7" ? 7 : rangeRaw === "30" ? 30 : rangeRaw === "0" ? 0 : 365;

  const metrics = await getMetricsForUser(session.userId, rangeDays);

  return <MetricsDashboard metrics={metrics} rangeDays={rangeDays} />;
}

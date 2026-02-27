export function PlanStatusBanner({
  planName,
  hiredCount,
  agentCap,
  periodEnd,
  cancelAtPeriodEnd,
}: {
  planName: string;
  hiredCount: number;
  agentCap: number;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}) {
  const renewalLabel = periodEnd
    ? new Date(periodEnd).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-[rgba(10,14,18,0.9)] px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-teal-400" />
        <span className="text-sm font-medium text-zinc-200">{planName} Plan</span>
      </div>

      <div className="text-sm text-zinc-400">
        <span className="font-medium text-zinc-200">{hiredCount}</span>
        <span className="mx-0.5">/</span>
        <span>{agentCap}</span>
        <span className="ml-1">agents</span>
      </div>

      {renewalLabel && (
        <div className="text-sm text-zinc-500">
          {cancelAtPeriodEnd ? "Expires" : "Renews"} {renewalLabel}
        </div>
      )}

      {cancelAtPeriodEnd && (
        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
          Canceling
        </span>
      )}
    </div>
  );
}

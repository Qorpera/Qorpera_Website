"use client";

import type { DevStats } from "@/lib/admin-store";

type Props = { stats: DevStats };

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-5 py-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-white/40">{label}</div>
      <div className="mt-1.5 text-3xl font-semibold tabular-nums text-white/90">{value}</div>
      {sub && <div className="mt-1 text-[12px] text-white/40">{sub}</div>}
    </div>
  );
}

export function DevStatsTab({ stats }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-white/80">System Stats</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={stats.totalUsers}
          sub={`${stats.verifiedUsers} verified · ${stats.unverifiedUsers} unverified`}
        />
        <StatCard
          label="Manual Licenses"
          value={stats.activeManualLicenses}
          sub="Active (granted by owner)"
        />
        <StatCard
          label="Stripe Subscriptions"
          value={stats.activeStripeSubscriptions}
          sub="Active paid plans"
        />
        <StatCard
          label="Hired Agents"
          value={stats.totalHiredAgents}
          sub="Enabled across all users"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Advisor Sessions"
          value={stats.advisorSessionsLast7Days}
          sub="Last 7 days"
        />
      </div>
    </div>
  );
}

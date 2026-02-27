"use client";

import { useState } from "react";
import { DevCustomersTab } from "@/components/dev-customers-tab";
import { DevLicensesTab } from "@/components/dev-licenses-tab";
import { DevFlagsTab } from "@/components/dev-flags-tab";
import { DevStatsTab } from "@/components/dev-stats-tab";
import type { AdminUserRow, ManualLicense, DevStats } from "@/lib/admin-store";
import type { FeatureFlagRow } from "@/lib/feature-flags-store";

type SerializedUserRow = Omit<AdminUserRow, "createdAt" | "lastSessionAt" | "subscription"> & {
  createdAt: string;
  lastSessionAt: string | null;
  subscription: {
    id: string;
    status: string;
    source: string;
    currentPeriodEnd: string | null;
  } | null;
};

// kept for type compat with dev page — not used in UI
type SerializedManualLicense = Omit<ManualLicense, "createdAt"> & { createdAt: string }; // eslint-disable-line @typescript-eslint/no-unused-vars

type PlanLicenseKeyRow = {
  id: string;
  tier: string;
  code: string;
  status: string;
  redeemedBy: { email: string } | null;
  redeemedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

type Props = {
  users: SerializedUserRow[];
  manualLicenses: unknown[]; // legacy — kept for page compat
  planLicenseKeys: PlanLicenseKeyRow[];
  stats: DevStats;
  flags: { global: FeatureFlagRow[]; overrides: FeatureFlagRow[] };
};

type Tab = "customers" | "licenses" | "flags" | "stats";

const TABS: { id: Tab; label: string }[] = [
  { id: "customers", label: "Customers" },
  { id: "licenses", label: "Licenses" },
  { id: "flags", label: "Feature Flags" },
  { id: "stats", label: "Stats" },
];

export function DevDashboard({ users, planLicenseKeys, stats, flags }: Props) {
  const [tab, setTab] = useState<Tab>("customers");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M9.674 2.075a.75.75 0 0 1 .652 0l7 3.5A.75.75 0 0 1 18 6.257v7.486a.75.75 0 0 1-.674.67l-7 1a.75.75 0 0 1-.652 0l-7-1A.75.75 0 0 1 2 13.743V6.257a.75.75 0 0 1 .674-.682l7-3.5Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white/90">Dev Console</h1>
          <p className="text-[12px] text-white/35">Owner-only admin panel</p>
        </div>
        <span className="ml-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-300">
          PRIVATE
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-white/8 bg-white/[0.02] p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "bg-white/8 text-white/90"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div>
        {tab === "customers" && <DevCustomersTab users={users} />}
        {tab === "licenses" && <DevLicensesTab planLicenseKeys={planLicenseKeys} />}
        {tab === "flags" && (
          <DevFlagsTab
            global={flags.global.map((f) => ({ ...f, updatedAt: new Date(f.updatedAt) }))}
            overrides={flags.overrides.map((f) => ({ ...f, updatedAt: new Date(f.updatedAt) }))}
          />
        )}
        {tab === "stats" && <DevStatsTab stats={stats} />}
      </div>
    </div>
  );
}

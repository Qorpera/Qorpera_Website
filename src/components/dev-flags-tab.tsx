"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FLAG_CATALOG } from "@/lib/feature-flags-catalog";
import type { FeatureFlagRow } from "@/lib/feature-flags-store";

type Props = {
  global: FeatureFlagRow[];
  overrides: FeatureFlagRow[];
};

function Toggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
        enabled
          ? "border-teal-500/50 bg-teal-500/25"
          : "border-white/15 bg-white/5"
      }`}
    >
      <span
        className={`inline-block h-3 w-3 transform rounded-full shadow transition-transform duration-200 ${
          enabled ? "translate-x-4 bg-teal-400" : "translate-x-1 bg-white/40"
        }`}
      />
    </button>
  );
}

export function DevFlagsTab({ global: globalFlags, overrides }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [overrideEmail, setOverrideEmail] = useState("");
  const [overrideUserId, setOverrideUserId] = useState("");
  const [addingOverrideKey, setAddingOverrideKey] = useState<string | null>(null);

  async function toggleGlobal(key: string, enabled: boolean) {
    await fetch("/api/admin/feature-flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, enabled }),
    });
    startTransition(() => router.refresh());
  }

  async function addOverride(key: string, enabled: boolean, userId: string) {
    if (!userId.trim()) return;
    await fetch("/api/admin/feature-flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, enabled, userId: userId.trim() }),
    });
    setAddingOverrideKey(null);
    setOverrideUserId("");
    startTransition(() => router.refresh());
  }

  async function deleteOverride(id: string) {
    await fetch("/api/admin/feature-flags", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    startTransition(() => router.refresh());
  }

  const globalMap = new Map(globalFlags.map((f) => [f.key, f]));

  return (
    <div className="space-y-8">
      {/* Global flags */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-white/80">Global Feature Flags</h2>
        <div className="space-y-2">
          {FLAG_CATALOG.map((entry) => {
            const flag = globalMap.get(entry.key);
            const enabled = flag?.enabled ?? false;

            return (
              <div
                key={entry.key}
                className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-white/80">{entry.label}</div>
                  {entry.description && (
                    <div className="text-[12px] text-white/40">{entry.description}</div>
                  )}
                  <div className="mt-0.5 font-mono text-[10px] text-white/25">{entry.key}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Toggle
                    enabled={enabled}
                    onChange={(v) => toggleGlobal(entry.key, v)}
                    disabled={pending}
                  />
                  <button
                    onClick={() =>
                      setAddingOverrideKey(addingOverrideKey === entry.key ? null : entry.key)
                    }
                    className="text-[11px] text-white/30 hover:text-white/60 transition"
                    title="Add per-user override"
                  >
                    + override
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add per-user override form */}
      {addingOverrideKey && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 p-4">
          <h3 className="mb-3 text-sm font-semibold text-amber-300">
            Per-user override: <span className="font-mono">{addingOverrideKey}</span>
          </h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-44">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-white/40">
                User ID
              </label>
              <input
                type="text"
                placeholder="cuid…"
                value={overrideUserId}
                onChange={(e) => setOverrideUserId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 placeholder:text-white/30 outline-none focus:border-amber-500/50 font-mono"
              />
            </div>
            <button
              onClick={() => addOverride(addingOverrideKey, true, overrideUserId)}
              disabled={!overrideUserId.trim() || pending}
              className="rounded-lg border border-teal-500/30 bg-teal-500/15 px-3 py-2 text-sm font-medium text-teal-300 hover:bg-teal-500/25 disabled:opacity-40 transition"
            >
              Enable for user
            </button>
            <button
              onClick={() => addOverride(addingOverrideKey, false, overrideUserId)}
              disabled={!overrideUserId.trim() || pending}
              className="rounded-lg border border-rose-500/30 bg-rose-500/15 px-3 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/25 disabled:opacity-40 transition"
            >
              Disable for user
            </button>
            <button
              onClick={() => setAddingOverrideKey(null)}
              className="text-sm text-white/30 hover:text-white/60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Per-user overrides */}
      {overrides.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-white/50">
            Per-user Overrides ({overrides.length})
          </h3>
          <div className="overflow-x-auto rounded-xl border border-white/8">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-white/8 bg-white/[0.02] text-left text-[11px] font-medium uppercase tracking-wide text-white/40">
                  <th className="px-4 py-2.5">Flag</th>
                  <th className="px-4 py-2.5">User ID</th>
                  <th className="px-4 py-2.5">Value</th>
                  <th className="px-4 py-2.5">Updated</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {overrides.map((ov) => (
                  <tr key={ov.id} className="border-b border-white/5">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-white/70">{ov.label || ov.key}</div>
                      <div className="font-mono text-[10px] text-white/30">{ov.key}</div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-white/45">{ov.userId}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-[12px] font-semibold ${
                          ov.enabled ? "text-teal-400" : "text-white/30"
                        }`}
                      >
                        {ov.enabled ? "enabled" : "disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-white/35">
                      {new Date(ov.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => deleteOverride(ov.id)}
                        disabled={pending}
                        className="rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-white/40 hover:border-rose-500/30 hover:text-rose-300 transition"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

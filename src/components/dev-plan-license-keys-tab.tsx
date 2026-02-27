"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
  planLicenseKeys: PlanLicenseKeyRow[];
};

const TIER_LABELS: Record<string, string> = {
  SMALL_BUSINESS: "Small Business (8 agents)",
  MID_SIZE: "Mid-size (20 agents)",
};

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "ACTIVE"
      ? "bg-teal-500/15 text-teal-300"
      : status === "REDEEMED"
        ? "bg-blue-500/15 text-blue-300"
        : "bg-white/8 text-white/40";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {status}
    </span>
  );
}

export function DevPlanLicenseKeysTab({ planLicenseKeys }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tier, setTier] = useState<"SMALL_BUSINESS" | "MID_SIZE">("SMALL_BUSINESS");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setError(null);
    setGeneratedCode(null);

    const res = await fetch("/api/plan-license-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to generate key");
      return;
    }

    setGeneratedCode(data.key.code);
    startTransition(() => router.refresh());
  }

  async function handleRevoke(keyId: string, code: string) {
    if (!confirm(`Revoke plan license key ${code}? If redeemed, the customer's plan will be canceled.`)) return;

    const res = await fetch("/api/plan-license-keys/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error ?? "Failed to revoke");
      return;
    }

    startTransition(() => router.refresh());
  }

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const active = planLicenseKeys.filter((k) => k.status === "ACTIVE");
  const redeemed = planLicenseKeys.filter((k) => k.status === "REDEEMED");
  const revoked = planLicenseKeys.filter((k) => k.status === "REVOKED");

  return (
    <div className="space-y-8">
      {/* Generate section */}
      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
        <h2 className="mb-4 text-base font-semibold text-white/80">Generate Plan License Key</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-white/40">
              Tier
            </label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as typeof tier)}
              className="rounded-lg border border-white/10 bg-[rgba(10,14,18,1)] px-3 py-2 text-sm text-white/80 outline-none focus:border-teal-500/50"
            >
              <option value="SMALL_BUSINESS">Small Business — 8 agents</option>
              <option value="MID_SIZE">Mid-size — 20 agents</option>
            </select>
          </div>
          <button
            onClick={handleGenerate}
            disabled={pending}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:opacity-50"
          >
            Generate Key
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </div>
        )}

        {generatedCode && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-teal-500/30 bg-teal-500/10 px-4 py-3">
            <code className="flex-1 font-mono text-base text-teal-200">{generatedCode}</code>
            <button
              onClick={() => handleCopy(generatedCode)}
              className="rounded-md border border-teal-500/30 bg-teal-500/15 px-3 py-1 text-[12px] font-medium text-teal-300 transition hover:bg-teal-500/25"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
      </div>

      {/* Active keys */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-white/60">
          Active Keys ({active.length})
        </h3>
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-white/8 bg-white/[0.02] text-left text-[11px] font-medium uppercase tracking-wide text-white/40">
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Tier</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Created</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {active.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-white/30">
                    No active keys.
                  </td>
                </tr>
              )}
              {active.map((k) => (
                <tr key={k.id} className="border-b border-white/5">
                  <td className="px-4 py-2.5 font-mono text-sm text-white/80">{k.code}</td>
                  <td className="px-4 py-2.5 text-white/55">{TIER_LABELS[k.tier] ?? k.tier}</td>
                  <td className="px-4 py-2.5">
                    <StatusPill status={k.status} />
                  </td>
                  <td className="px-4 py-2.5 text-white/40">
                    {new Date(k.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => handleCopy(k.code)}
                      className="mr-2 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[12px] text-white/50 transition hover:text-white/70"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => handleRevoke(k.id, k.code)}
                      className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[12px] text-rose-300 transition hover:bg-rose-500/20"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Redeemed keys */}
      {redeemed.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-white/60">
            Redeemed ({redeemed.length})
          </h3>
          <div className="overflow-x-auto rounded-xl border border-white/8">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-white/8 bg-white/[0.02] text-left text-[11px] font-medium uppercase tracking-wide text-white/40">
                  <th className="px-4 py-2.5">Code</th>
                  <th className="px-4 py-2.5">Tier</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Redeemed By</th>
                  <th className="px-4 py-2.5">Redeemed</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {redeemed.map((k) => (
                  <tr key={k.id} className="border-b border-white/5">
                    <td className="px-4 py-2.5 font-mono text-sm text-white/70">{k.code}</td>
                    <td className="px-4 py-2.5 text-white/50">{TIER_LABELS[k.tier] ?? k.tier}</td>
                    <td className="px-4 py-2.5">
                      <StatusPill status={k.status} />
                    </td>
                    <td className="px-4 py-2.5 text-white/55">{k.redeemedBy?.email ?? "—"}</td>
                    <td className="px-4 py-2.5 text-white/40">
                      {k.redeemedAt ? new Date(k.redeemedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleRevoke(k.id, k.code)}
                        className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[12px] text-rose-300 transition hover:bg-rose-500/20"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revoked keys */}
      {revoked.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-white/40">
            Revoked ({revoked.length})
          </h3>
          <div className="overflow-x-auto rounded-xl border border-white/5 opacity-60">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-white/6 bg-white/[0.015] text-left text-[11px] font-medium uppercase tracking-wide text-white/30">
                  <th className="px-4 py-2.5">Code</th>
                  <th className="px-4 py-2.5">Tier</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Redeemed By</th>
                  <th className="px-4 py-2.5">Revoked</th>
                </tr>
              </thead>
              <tbody>
                {revoked.map((k) => (
                  <tr key={k.id} className="border-b border-white/4">
                    <td className="px-4 py-2 font-mono text-sm text-white/40">{k.code}</td>
                    <td className="px-4 py-2 text-white/35">{TIER_LABELS[k.tier] ?? k.tier}</td>
                    <td className="px-4 py-2">
                      <StatusPill status={k.status} />
                    </td>
                    <td className="px-4 py-2 text-white/35">{k.redeemedBy?.email ?? "—"}</td>
                    <td className="px-4 py-2 text-white/30">
                      {k.revokedAt ? new Date(k.revokedAt).toLocaleDateString() : "—"}
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

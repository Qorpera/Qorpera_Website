"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type PlanLicenseKey = {
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
  planLicenseKeys: PlanLicenseKey[];
};

const TIER_LABELS: Record<string, string> = {
  SOLO: "Solo · 4 agents",
  SMALL_BUSINESS: "Small Business · 8 agents",
  MID_SIZE: "Mid-size · 20 agents",
};

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "bg-teal-500/15 text-teal-300 border-teal-500/25",
    REDEEMED: "bg-blue-500/15 text-blue-300 border-blue-500/25",
    REVOKED: "bg-white/8 text-white/35 border-white/10",
  };
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles[status] ?? "bg-white/8 text-white/40 border-white/10"}`}>
      {status}
    </span>
  );
}

export function DevLicensesTab({ planLicenseKeys }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<"SOLO" | "SMALL_BUSINESS" | "MID_SIZE">("SOLO");
  const [granting, setGranting] = useState(false);
  const [result, setResult] = useState<{ code: string; emailOk: boolean; emailError: string | null } | null>(null);
  const [grantError, setGrantError] = useState<string | null>(null);

  async function handleGrant(e: React.FormEvent) {
    e.preventDefault();
    setGrantError(null);
    setResult(null);
    setGranting(true);

    try {
      const res = await fetch("/api/admin/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), tier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGrantError(data.error ?? "Failed to generate license");
        return;
      }
      setResult({ code: data.code, emailOk: data.emailOk, emailError: data.emailError });
      setEmail("");
      startTransition(() => router.refresh());
    } finally {
      setGranting(false);
    }
  }

  async function handleRevoke(keyId: string, code: string) {
    if (!confirm(`Revoke license key ${code}? If already redeemed, the user's plan will be canceled.`)) return;

    const res = await fetch("/api/admin/licenses", {
      method: "DELETE",
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

  const active = planLicenseKeys.filter((k) => k.status === "ACTIVE");
  const redeemed = planLicenseKeys.filter((k) => k.status === "REDEEMED");
  const revoked = planLicenseKeys.filter((k) => k.status === "REVOKED");

  return (
    <div className="space-y-8">
      {/* Grant form */}
      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
        <h2 className="mb-1 text-base font-semibold text-white/80">Generate License Key</h2>
        <p className="mb-4 text-[13px] text-white/40">A unique key will be generated and emailed to the address you enter.</p>

        <form onSubmit={handleGrant} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-48">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-white/40">
              Send to Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="beta@example.com"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 placeholder:text-white/30 outline-none focus:border-teal-500/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-white/40">
              Plan Tier
            </label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as typeof tier)}
              className="rounded-lg border border-white/10 bg-[rgba(10,14,18,1)] px-3 py-2 text-sm text-white/80 outline-none focus:border-teal-500/50"
            >
              <option value="SOLO">Solo — 4 agents</option>
              <option value="SMALL_BUSINESS">Small Business — 8 agents</option>
              <option value="MID_SIZE">Mid-size — 20 agents</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={granting || pending}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:opacity-50"
          >
            {granting ? "Generating…" : "Generate & Send"}
          </button>
        </form>

        {grantError && (
          <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {grantError}
          </div>
        )}

        {result && (
          <div className="mt-3 rounded-lg border border-teal-500/25 bg-teal-500/8 px-4 py-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wide text-teal-400/60">Generated Key</span>
            </div>
            <div className="font-mono text-lg font-bold tracking-[0.15em] text-teal-300">{result.code}</div>
            {result.emailOk ? (
              <div className="text-[12px] text-teal-400/70">Email sent successfully.</div>
            ) : (
              <div className="text-[12px] text-amber-300">
                Key generated but email failed: {result.emailError ?? "unknown error"}. Share the key manually above.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active (unsent / pending redemption) */}
      <KeyTable title={`Active — awaiting redemption (${active.length})`} keys={active} onRevoke={handleRevoke} pending={pending} />

      {/* Redeemed */}
      <KeyTable title={`Redeemed (${redeemed.length})`} keys={redeemed} onRevoke={handleRevoke} pending={pending} />

      {/* Revoked */}
      {revoked.length > 0 && (
        <KeyTable title={`Revoked (${revoked.length})`} keys={revoked} onRevoke={handleRevoke} pending={pending} muted />
      )}
    </div>
  );
}

function KeyTable({
  title,
  keys,
  onRevoke,
  pending,
  muted,
}: {
  title: string;
  keys: PlanLicenseKey[];
  onRevoke: (keyId: string, code: string) => void;
  pending: boolean;
  muted?: boolean;
}) {
  return (
    <div className={muted ? "opacity-50" : ""}>
      <h3 className="mb-3 text-sm font-semibold text-white/50">{title}</h3>
      <div className="overflow-x-auto rounded-xl border border-white/8">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-white/8 bg-white/[0.02] text-left text-[11px] font-medium uppercase tracking-wide text-white/40">
              <th className="px-4 py-2.5">Code</th>
              <th className="px-4 py-2.5">Tier</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Redeemed by</th>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-5 text-center text-white/25">
                  None.
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <tr key={k.id} className="border-b border-white/5">
                  <td className="px-4 py-2.5 font-mono text-[13px] font-semibold tracking-wider text-teal-300/80">
                    {k.code}
                  </td>
                  <td className="px-4 py-2.5 text-white/50 text-[12px]">
                    {TIER_LABELS[k.tier] ?? k.tier}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusPill status={k.status} />
                  </td>
                  <td className="px-4 py-2.5 text-white/45">
                    {k.redeemedBy?.email ?? <span className="text-white/20">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-white/35 text-[12px]">
                    {new Date(k.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5">
                    {k.status !== "REVOKED" && (
                      <button
                        onClick={() => onRevoke(k.id, k.code)}
                        disabled={pending}
                        className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[12px] text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-40"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

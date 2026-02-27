"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ManualLicense } from "@/lib/admin-store";

type LicenseRow = Omit<ManualLicense, "createdAt"> & { createdAt: string };

type Props = {
  manualLicenses: LicenseRow[];
};

const TIER_LABELS: Record<string, string> = {
  SOLO: "Solo ($299/mo, 4 agents)",
  SMALL_BUSINESS: "Small Business (8 agents)",
  MID_SIZE: "Mid-size (20 agents)",
};

function StatusPill({ status }: { status: string }) {
  const active = status === "ACTIVE";
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
        active
          ? "bg-teal-500/15 text-teal-300"
          : "bg-white/8 text-white/40"
      }`}
    >
      {status}
    </span>
  );
}

export function DevLicensesTab({ manualLicenses }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<"SOLO" | "SMALL_BUSINESS" | "MID_SIZE">("SOLO");
  const [grantError, setGrantError] = useState<string | null>(null);
  const [grantSuccess, setGrantSuccess] = useState<string | null>(null);

  async function handleGrant(e: React.FormEvent) {
    e.preventDefault();
    setGrantError(null);
    setGrantSuccess(null);

    const res = await fetch("/api/admin/licenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), tier }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setGrantError(data.error ?? "Failed to grant license");
      return;
    }

    setGrantSuccess(`License granted to ${email}`);
    setEmail("");
    startTransition(() => router.refresh());
  }

  async function handleRevoke(subscriptionId: string, userEmail: string) {
    if (!confirm(`Revoke license for ${userEmail}? This will disable their hired agents.`)) return;

    const res = await fetch("/api/admin/licenses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionId }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error ?? "Failed to revoke");
      return;
    }

    startTransition(() => router.refresh());
  }

  const active = manualLicenses.filter((l) => l.status === "ACTIVE");
  const inactive = manualLicenses.filter((l) => l.status !== "ACTIVE");

  return (
    <div className="space-y-8">
      {/* Grant form */}
      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
        <h2 className="mb-4 text-base font-semibold text-white/80">Grant Manual License</h2>
        <form onSubmit={handleGrant} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-48">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-white/40">
              User Email
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
              Tier
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
            disabled={pending}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:opacity-50"
          >
            Grant License
          </button>
        </form>

        {grantError && (
          <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {grantError}
          </div>
        )}
        {grantSuccess && (
          <div className="mt-3 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-sm text-teal-300">
            {grantSuccess}
          </div>
        )}
      </div>

      {/* Active manual licenses */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-white/60">
          Active Manual Licenses ({active.length})
        </h3>
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-white/8 bg-white/[0.02] text-left text-[11px] font-medium uppercase tracking-wide text-white/40">
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Plan</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Granted</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {active.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-white/30">
                    No active manual licenses.
                  </td>
                </tr>
              )}
              {active.map((lic) => (
                <tr key={lic.id} className="border-b border-white/5">
                  <td className="px-4 py-2.5 font-medium text-white/80">{lic.email}</td>
                  <td className="px-4 py-2.5 text-white/55">{lic.planName}</td>
                  <td className="px-4 py-2.5">
                    <StatusPill status={lic.status} />
                  </td>
                  <td className="px-4 py-2.5 text-white/40">
                    {new Date(lic.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => handleRevoke(lic.id, lic.email)}
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

      {/* Past/canceled licenses */}
      {inactive.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-white/40">
            Revoked / Canceled ({inactive.length})
          </h3>
          <div className="overflow-x-auto rounded-xl border border-white/5 opacity-60">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-white/6 bg-white/[0.015] text-left text-[11px] font-medium uppercase tracking-wide text-white/30">
                  <th className="px-4 py-2.5">Email</th>
                  <th className="px-4 py-2.5">Plan</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody>
                {inactive.map((lic) => (
                  <tr key={lic.id} className="border-b border-white/4">
                    <td className="px-4 py-2 text-white/50">{lic.email}</td>
                    <td className="px-4 py-2 text-white/35">{lic.planName}</td>
                    <td className="px-4 py-2">
                      <StatusPill status={lic.status} />
                    </td>
                    <td className="px-4 py-2 text-white/30">
                      {new Date(lic.createdAt).toLocaleDateString()}
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

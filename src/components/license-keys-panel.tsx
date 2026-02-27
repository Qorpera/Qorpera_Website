"use client";

import { useEffect, useState } from "react";
import { kindLabel } from "@/lib/format";

interface LicenseKeyRow {
  id: string;
  agentKind: string;
  schedule: string;
  code: string;
  status: "ACTIVE" | "REDEEMED" | "REVOKED";
  redeemedBy: { email: string } | null;
  createdAt: string;
}

function statusBadge(status: LicenseKeyRow["status"]) {
  if (status === "ACTIVE") return "bg-emerald-500/15 text-emerald-300";
  if (status === "REDEEMED") return "bg-amber-500/15 text-amber-300";
  return "bg-white/[0.06] text-white/40";
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

const AGENT_KINDS = [
  "ASSISTANT", "SALES_REP", "CUSTOMER_SUCCESS", "MARKETING_COORDINATOR",
  "FINANCE_ANALYST", "OPERATIONS_MANAGER", "EXECUTIVE_ASSISTANT", "RESEARCH_ANALYST",
] as const;

const SCHEDULES = ["DAILY", "WEEKLY", "MONTHLY"] as const;

export function LicenseKeysPanel() {
  const [keys, setKeys] = useState<LicenseKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [genKind, setGenKind] = useState<string>(AGENT_KINDS[0]);
  const [genSchedule, setGenSchedule] = useState<string>(SCHEDULES[2]);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redeem section
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function fetchKeys() {
    const res = await fetch("/api/license-keys");
    if (!res.ok) return;
    const data = (await res.json()) as { keys: LicenseKeyRow[] };
    setKeys(data.keys);
  }

  useEffect(() => {
    fetchKeys().finally(() => setLoading(false));
  }, []);

  async function generate() {
    setError(null);
    setNewCode(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/license-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentKind: genKind, schedule: genSchedule }),
      });
      const data = (await res.json()) as { key?: LicenseKeyRow; error?: string };
      if (!res.ok || !data.key) throw new Error(data.error || "Failed to generate");
      setNewCode(data.key.code);
      setCopied(false);
      await fetchKeys();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate key");
    } finally {
      setGenerating(false);
    }
  }

  async function revoke(keyId: string) {
    setError(null);
    setRevoking(keyId);
    try {
      const res = await fetch("/api/license-keys/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to revoke");
      await fetchKeys();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to revoke");
    } finally {
      setRevoking(null);
    }
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function redeem() {
    setRedeemMsg(null);
    setRedeeming(true);
    try {
      const res = await fetch("/api/license-keys/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: redeemCode }),
      });
      const data = (await res.json()) as { ok?: boolean; agentKind?: string; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to redeem");
      setRedeemMsg({ ok: true, text: `${kindLabel(data.agentKind ?? "Agent")} agent added to your workforce.` });
      setRedeemCode("");
      await fetchKeys();
    } catch (e: unknown) {
      setRedeemMsg({ ok: false, text: e instanceof Error ? e.message : "Failed to redeem" });
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <div>
      <div className="text-sm font-medium mb-0.5">License keys</div>
      <p className="text-sm text-white/45 mb-5">Generate gift codes to grant agents to other users without payment.</p>

      {error ? (
        <div className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</div>
      ) : null}

      {/* Generate section */}
      <div className="border border-white/[0.08] rounded-lg p-4 mb-6">
        <div className="text-sm font-medium mb-3">Generate a new key</div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-white/40 mb-1">Agent type</label>
            <select
              value={genKind}
              onChange={(e) => setGenKind(e.target.value)}
              className="rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-sm text-white/80 outline-none focus:border-teal-500/50"
            >
              {AGENT_KINDS.map((k) => (
                <option key={k} value={k}>{kindLabel(k)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Schedule</label>
            <select
              value={genSchedule}
              onChange={(e) => setGenSchedule(e.target.value)}
              className="rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-sm text-white/80 outline-none focus:border-teal-500/50"
            >
              {SCHEDULES.map((s) => (
                <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="rounded-md border border-teal-500/40 bg-teal-500/10 px-4 py-1.5 text-sm text-teal-300 transition hover:bg-teal-500/20 disabled:opacity-40"
          >
            {generating ? "Generating…" : "Generate"}
          </button>
        </div>
        {newCode ? (
          <div className="mt-3 flex items-center gap-2">
            <code className="rounded-md border border-teal-500/30 bg-teal-500/10 px-3 py-1.5 text-sm font-mono text-teal-200 select-all">
              {newCode}
            </code>
            <button
              type="button"
              onClick={() => copyCode(newCode)}
              className="rounded-md border border-white/[0.1] px-3 py-1.5 text-xs text-white/50 hover:text-white/75 transition"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        ) : null}
      </div>

      {/* Redeem section */}
      <div className="border border-white/[0.08] rounded-lg p-4 mb-6">
        <div className="text-sm font-medium mb-3">Redeem a key</div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs text-white/40 mb-1">License code</label>
            <input
              type="text"
              placeholder="QP-XXXX-XXXX-XXXX"
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value)}
              className="w-full rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-sm font-mono text-white/80 placeholder:text-white/30 outline-none focus:border-teal-500/50"
            />
          </div>
          <button
            type="button"
            onClick={redeem}
            disabled={redeeming || !redeemCode.trim()}
            className="rounded-md border border-teal-500/40 bg-teal-500/10 px-4 py-1.5 text-sm text-teal-300 transition hover:bg-teal-500/20 disabled:opacity-40"
          >
            {redeeming ? "Redeeming…" : "Redeem"}
          </button>
        </div>
        {redeemMsg ? (
          <div className={`mt-2 text-sm ${redeemMsg.ok ? "text-emerald-300" : "text-rose-300"}`}>
            {redeemMsg.text}
          </div>
        ) : null}
      </div>

      {/* Keys table */}
      {loading ? (
        <div className="py-12 text-center text-sm text-white/30">Loading…</div>
      ) : keys.length === 0 ? (
        <div className="py-12 text-center text-sm text-white/30">No license keys created yet.</div>
      ) : (
        <div className="border border-white/[0.08] rounded-lg overflow-hidden divide-y divide-white/[0.06]">
          {keys.map((key) => (
            <div key={key.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition">
              <code className="shrink-0 text-xs font-mono text-white/60">{key.code}</code>
              <span className="text-sm text-white/70">{kindLabel(key.agentKind)}</span>
              <span className="text-xs text-white/40 capitalize">{key.schedule.toLowerCase()}</span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${statusBadge(key.status)}`}>
                {key.status}
              </span>
              {key.redeemedBy ? (
                <span className="text-xs text-white/40">{key.redeemedBy.email}</span>
              ) : null}
              <span className="ml-auto shrink-0 text-xs text-white/30">{relativeTime(key.createdAt)}</span>
              {key.status === "ACTIVE" ? (
                <button
                  type="button"
                  onClick={() => revoke(key.id)}
                  disabled={revoking === key.id}
                  className="shrink-0 rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300 transition hover:bg-rose-500/15 disabled:opacity-40"
                >
                  {revoking === key.id ? "…" : "Revoke"}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

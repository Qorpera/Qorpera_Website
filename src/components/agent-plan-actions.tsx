"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AgentInfo = { kind: string; name: string };

export function AgentPlanActions({
  availableAgents,
  hiredAgents,
  canAddMore,
  hiredCount,
  agentCap,
}: {
  availableAgents: AgentInfo[];
  hiredAgents: AgentInfo[];
  canAddMore: boolean;
  hiredCount: number;
  agentCap: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleAction(action: "hire" | "fire", agentKind: string) {
    setLoading(`${action}-${agentKind}`);
    setError("");
    try {
      const res = await fetch("/api/plans/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, agentKind }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Action failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="wf-panel rounded-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Manage agents</h2>
        <span className="text-sm text-zinc-400">
          {hiredCount}/{agentCap} slots used
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Available to hire */}
      {availableAgents.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Available to activate</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {availableAgents.map((a) => (
              <div
                key={a.kind}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2.5"
              >
                <span className="text-sm text-zinc-200">{a.name}</span>
                <button
                  onClick={() => handleAction("hire", a.kind)}
                  disabled={!canAddMore || loading !== null}
                  className="rounded-lg bg-teal-600/80 px-3 py-1 text-xs font-medium text-white hover:bg-teal-500 disabled:opacity-40"
                >
                  {loading === `hire-${a.kind}` ? "…" : "Activate"}
                </button>
              </div>
            ))}
          </div>
          {!canAddMore && (
            <p className="mt-2 text-xs text-amber-400/70">
              All agent slots are in use. Deactivate an agent to make room.
            </p>
          )}
        </div>
      )}

      {/* Currently hired — option to fire */}
      {hiredAgents.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Active agents</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {hiredAgents.map((a) => (
              <div
                key={a.kind}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2.5"
              >
                <span className="text-sm text-zinc-200">{a.name}</span>
                <button
                  onClick={() => handleAction("fire", a.kind)}
                  disabled={loading !== null}
                  className="rounded-lg border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:border-red-500/40 hover:text-red-300 disabled:opacity-40"
                >
                  {loading === `fire-${a.kind}` ? "…" : "Deactivate"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

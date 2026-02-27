"use client";

import { useState } from "react";

type HiredAgent = { id: string; agentKind: string; title: string; enabled: boolean };

type UserRow = {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  plan: { name: string; tier: string } | null;
  subscription: {
    id: string;
    status: string;
    source: string;
    currentPeriodEnd: string | null;
  } | null;
  hiredCount: number;
  agentCap: number;
  lastSessionAt: string | null;
  hiredAgents: HiredAgent[];
  businessLogCount: number;
};

type Props = { users: UserRow[] };

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

function TierBadge({ tier, source }: { tier: string; source?: string }) {
  const colors: Record<string, string> = {
    SOLO: "bg-teal-500/15 text-teal-300 border-teal-500/30",
    SMALL_BUSINESS: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    MID_SIZE: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  };
  const cls = colors[tier] ?? "bg-white/10 text-white/60 border-white/20";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {tier.replace("_", " ")}
      {source === "MANUAL" && (
        <span className="ml-0.5 rounded bg-amber-400/20 px-1 text-[10px] text-amber-300">MANUAL</span>
      )}
    </span>
  );
}

function ExpandedRow({ user }: { user: UserRow }) {
  return (
    <tr>
      <td colSpan={7} className="border-b border-white/5 bg-white/[0.02] px-8 py-3">
        <div className="flex gap-8 text-[12px]">
          <div>
            <div className="mb-1 font-medium text-white/50 uppercase tracking-wide text-[10px]">Hired Agents ({user.hiredAgents.length})</div>
            {user.hiredAgents.length === 0 ? (
              <div className="text-white/30">None</div>
            ) : (
              <ul className="space-y-0.5">
                {user.hiredAgents.map((a) => (
                  <li key={a.id} className="text-white/70">
                    {a.title} <span className="text-white/35">({a.agentKind})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div className="mb-1 font-medium text-white/50 uppercase tracking-wide text-[10px]">Business Logs</div>
            <div className="text-white/70">{user.businessLogCount}</div>
          </div>
          <div>
            <div className="mb-1 font-medium text-white/50 uppercase tracking-wide text-[10px]">User ID</div>
            <div className="font-mono text-white/40 text-[11px]">{user.id}</div>
          </div>
        </div>
      </td>
    </tr>
  );
}

export function DevCustomersTab({ users }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()),
  );

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-white/80">
          Customers <span className="ml-1 text-sm text-white/35">({users.length})</span>
        </h2>
        <input
          type="search"
          placeholder="Filter by email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 placeholder:text-white/30 outline-none focus:border-teal-500/40"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/8">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-white/8 bg-white/[0.02] text-left text-[11px] font-medium uppercase tracking-wide text-white/40">
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Joined</th>
              <th className="px-4 py-2.5">Verified</th>
              <th className="px-4 py-2.5">Plan</th>
              <th className="px-4 py-2.5">Agents</th>
              <th className="px-4 py-2.5">Last session</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-white/30">
                  No users found.
                </td>
              </tr>
            )}
            {filtered.map((user) => (
              <>
                <tr
                  key={user.id}
                  onClick={() => toggle(user.id)}
                  className="cursor-pointer border-b border-white/5 transition hover:bg-white/[0.025]"
                >
                  <td className="px-4 py-2.5 font-medium text-white/80">{user.email}</td>
                  <td className="px-4 py-2.5 text-white/45">{fmtDate(user.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    {user.emailVerified ? (
                      <span className="text-teal-400">✓</span>
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {user.plan ? (
                      <TierBadge tier={user.plan.tier} source={user.subscription?.source} />
                    ) : (
                      <span className="text-white/30">No plan</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-white/55">
                    {user.hiredCount}/{user.agentCap || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-white/45">{fmtDate(user.lastSessionAt)}</td>
                  <td className="px-4 py-2.5 text-white/30">
                    {expanded.has(user.id) ? "▲" : "▼"}
                  </td>
                </tr>
                {expanded.has(user.id) && <ExpandedRow key={`${user.id}-exp`} user={user} />}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

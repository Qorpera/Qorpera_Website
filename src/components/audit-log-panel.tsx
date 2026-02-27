"use client";

import { useEffect, useState } from "react";

interface AuditLogRow {
  id: string;
  scope: string;
  action: string;
  summary: string;
  entityId: string;
  createdAt: string;
}

const ALL_SCOPES = [
  "ADVISOR",
  "AGENT_AUTOMATION",
  "AGENT_FEEDBACK",
  "BUSINESS_FILE",
  "BUSINESS_LOG",
  "COMPANY_SOUL",
  "CONNECTOR",
  "DELEGATED_TASK",
  "EVENT",
  "INBOX",
  "LICENSE_KEY",
  "MODEL_ROUTE",
  "PROJECT",
  "RUNNER",
  "RUNNER_JOB",
  "RUNNER_POLICY",
  "SCHEDULER",
  "SKILL_CREDENTIAL",
];

function scopeBadgeClass(scope: string): string {
  switch (scope) {
    case "PROJECT":
      return "bg-teal-500/15 text-teal-300";
    case "CONNECTOR":
      return "bg-blue-500/15 text-blue-300";
    case "SKILL_CREDENTIAL":
      return "bg-amber-500/15 text-amber-300";
    case "RUNNER":
    case "RUNNER_JOB":
    case "RUNNER_POLICY":
      return "bg-violet-500/15 text-violet-300";
    case "INBOX":
      return "bg-emerald-500/15 text-emerald-300";
    case "LICENSE_KEY":
      return "bg-cyan-500/15 text-cyan-300";
    case "AGENT_FEEDBACK":
      return "bg-rose-500/15 text-rose-300";
    case "DELEGATED_TASK":
    case "SCHEDULER":
      return "bg-orange-500/15 text-orange-300";
    default:
      return "bg-white/[0.15] text-white/50";
  }
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

export function AuditLogPanel() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  async function fetchLogs(cursor?: string, append = false) {
    const params = new URLSearchParams({ limit: "50" });
    if (scopeFilter !== "ALL") params.set("scope", scopeFilter);
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`/api/audit-logs?${params}`);
    if (!res.ok) return;
    const data = (await res.json()) as { logs: AuditLogRow[]; nextCursor: string | null };

    setLogs((prev) => (append ? [...prev, ...data.logs] : data.logs));
    setNextCursor(data.nextCursor);
  }

  useEffect(() => {
    setLoading(true);
    fetchLogs().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeFilter]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    await fetchLogs(nextCursor, true);
    setLoadingMore(false);
  }

  const filtered = search
    ? logs.filter((l) => l.summary.toLowerCase().includes(search.toLowerCase()))
    : logs;

  return (
    <div>
      <div className="text-sm font-medium mb-0.5">Activity log</div>
      <p className="text-sm text-white/45 mb-5">A full audit trail of everything that has happened in your workspace.</p>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select
          value={scopeFilter}
          onChange={(e) => setScopeFilter(e.target.value)}
          className="rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-sm text-white/80 outline-none focus:border-teal-500/50"
        >
          <option value="ALL">All scopes</option>
          {ALL_SCOPES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>

        <input
          type="search"
          placeholder="Search summary…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-sm text-white/80 placeholder:text-white/30 outline-none focus:border-teal-500/50"
        />
      </div>

      {/* Log list */}
      {loading ? (
        <div className="py-12 text-center text-sm text-white/30">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-white/30">No activity recorded yet.</div>
      ) : (
        <div className="border border-white/[0.08] rounded-lg overflow-hidden divide-y divide-white/[0.06]">
          {filtered.map((log) => (
            <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition">
              <span
                className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${scopeBadgeClass(log.scope)}`}
              >
                {log.scope.replaceAll("_", " ")}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-white/80">{log.action}</span>
                {log.summary ? (
                  <span className="text-sm text-white/45 ml-2">· {log.summary}</span>
                ) : null}
              </div>
              <span className="shrink-0 text-xs text-white/30 mt-0.5">{relativeTime(log.createdAt)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {!loading && nextCursor && !search ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-md border border-white/[0.1] px-4 py-1.5 text-sm text-white/50 hover:text-white/75 transition disabled:opacity-40"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

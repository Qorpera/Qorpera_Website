import Link from "next/link";
import { getSession } from "@/lib/auth";
import {
  getAgentStatusSummary,
  type AgentLiveStatus,
  type AgentTone,
} from "@/lib/workforce-ui";

const toneDot: Record<AgentTone, string> = {
  teal: "bg-teal-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
  green: "bg-green-400",
  purple: "bg-purple-400",
  cyan: "bg-cyan-400",
  slate: "bg-slate-400",
  violet: "bg-violet-400",
};

const statusBadge: Record<
  AgentLiveStatus["status"],
  { label: string; cls: string }
> = {
  working: {
    label: "Working",
    cls: "text-teal-400 bg-teal-400/10 border-teal-400/20",
  },
  review: {
    label: "Needs review",
    cls: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  },
  idle: {
    label: "Idle",
    cls: "text-slate-400 bg-slate-400/10 border-slate-400/20",
  },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function OfficePage() {
  const session = await getSession();
  if (!session) return null;

  const agents = await getAgentStatusSummary(session.userId);

  const workingCount = agents.filter((a) => a.status === "working").length;
  const reviewCount = agents.filter((a) => a.status === "review").length;
  const idleCount = agents.filter((a) => a.status === "idle").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="wf-panel rounded-3xl p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Workforce
            </h1>
            <p className="mt-2 max-w-3xl text-sm wf-muted">
              Live status for every agent — current tasks, queue depth, and
              review items.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/inbox" className="wf-btn px-3 py-2 text-sm">
              Inbox
            </Link>
            <Link href="/metrics" className="wf-btn px-3 py-2 text-sm">
              Metrics
            </Link>
          </div>
        </div>
      </header>

      {/* KPI summary row */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          label="Working"
          count={workingCount}
          color="text-teal-400"
          bg="bg-teal-400/10"
        />
        <KpiCard
          label="Needs review"
          count={reviewCount}
          color="text-amber-400"
          bg="bg-amber-400/10"
        />
        <KpiCard
          label="Idle"
          count={idleCount}
          color="text-slate-400"
          bg="bg-slate-400/10"
        />
      </div>

      {/* Agent grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <AgentCard key={agent.kind} agent={agent} />
        ))}
      </div>
    </div>
  );
}

/* ── KPI card ─────────────────────────────────────────────── */

function KpiCard({
  label,
  count,
  color,
  bg,
}: {
  label: string;
  count: number;
  color: string;
  bg: string;
}) {
  return (
    <div className="wf-panel rounded-2xl p-4">
      <div className={`text-3xl font-bold ${color}`}>{count}</div>
      <div className="mt-1 text-sm wf-muted">{label}</div>
      <div className={`mt-2 h-1 rounded-full ${bg}`}>
        <div
          className={`h-1 rounded-full ${color.replace("text-", "bg-")}`}
          style={{ width: `${Math.min(count * 15, 100)}%` }}
        />
      </div>
    </div>
  );
}

/* ── Agent card ───────────────────────────────────────────── */

function AgentCard({ agent }: { agent: AgentLiveStatus }) {
  const badge = statusBadge[agent.status];

  return (
    <div className="wf-panel rounded-2xl p-4 space-y-3">
      {/* Name + role + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${toneDot[agent.tone]}`}
          />
          <span className="font-semibold truncate">
            {agent.name}{" "}
            <span className="font-normal wf-muted">· {agent.role}</span>
          </span>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${badge.cls}`}
        >
          {badge.label}
        </span>
      </div>

      {/* Active task (only when working) */}
      {agent.activeTask && (
        <div className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm">
          <div className="truncate">
            <span className="wf-muted mr-1">▸</span>
            &ldquo;{agent.activeTask.title}&rdquo;
          </div>
          <div className="mt-0.5 text-xs wf-muted">
            Started {timeAgo(agent.activeTask.startedAt)}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-3 text-xs wf-muted">
        <span>
          Queued: <span className="text-[var(--foreground)]">{agent.queuedTasks}</span>
        </span>
        <span className="text-[var(--border)]">|</span>
        <span>
          Inbox: <span className="text-[var(--foreground)]">{agent.inboxOpen}</span>
        </span>
        <span className="text-[var(--border)]">|</span>
        <span>
          Memory: <span className="text-[var(--foreground)]">{agent.memoryEntries}</span>
        </span>
      </div>

      {/* Submissions row */}
      <div className="flex items-center gap-3 text-xs wf-muted">
        <span>
          Submissions (7d):{" "}
          <span className="text-[var(--foreground)]">{agent.recentSubmissions}</span>
        </span>
        <span className="text-[var(--border)]">|</span>
        <span>
          Accepted:{" "}
          <span className="text-[var(--foreground)]">{agent.acceptanceRate}%</span>
        </span>
      </div>

      {/* Action links */}
      <div className="flex gap-2 pt-1">
        <Link
          href="/inbox"
          className="wf-btn rounded-lg px-2.5 py-1.5 text-xs"
        >
          View submissions
        </Link>
        <Link
          href="/agents/chief-advisor"
          className="wf-btn rounded-lg px-2.5 py-1.5 text-xs"
        >
          Delegate task
        </Link>
      </div>
    </div>
  );
}

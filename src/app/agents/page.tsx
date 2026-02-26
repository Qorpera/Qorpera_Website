import Link from "next/link";
import { prisma } from "@/lib/db";
import { ensureBaseAgents } from "@/lib/seed";
import { UI_AGENTS } from "@/lib/workforce-ui";
import { getAvailableModelCatalog, getModelRoutes } from "@/lib/model-routing-store";
import { ModelRouteSelector } from "@/components/model-route-selector";
import { getSession } from "@/lib/auth";
import { AgentCharacterFigure } from "@/components/agent-character-figure";

import type { AgentToneColor } from "@/components/agent-character-figure";

type ToneKey = AgentToneColor;

const cardTheme: Record<ToneKey, { gradient: string; glow: string; label: string; hoverBorder: string }> = {
  blue:   { gradient: "from-[#111d32] to-[#0d1724]", glow: "bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,rgba(99,131,209,0.28),transparent_68%)]",   label: "text-blue-300/60",   hoverBorder: "hover:border-blue-500/22"   },
  teal:   { gradient: "from-[#0d2422] to-[#091918]", glow: "bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,rgba(20,184,166,0.26),transparent_68%)]",    label: "text-teal-300/60",   hoverBorder: "hover:border-teal-500/22"   },
  amber:  { gradient: "from-[#20170c] to-[#130e07]", glow: "bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,rgba(245,158,11,0.22),transparent_68%)]",    label: "text-amber-300/60",  hoverBorder: "hover:border-amber-500/22"  },
  rose:   { gradient: "from-[#2a0d14] to-[#1a080d]", glow: "bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,rgba(244,63,94,0.24),transparent_68%)]",     label: "text-rose-300/60",   hoverBorder: "hover:border-rose-500/22"   },
  green:  { gradient: "from-[#0a1f12] to-[#07130c]", glow: "bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,rgba(34,197,94,0.22),transparent_68%)]",     label: "text-green-300/60",  hoverBorder: "hover:border-green-500/22"  },
  purple: { gradient: "from-[#1a0a2a] to-[#100618]", glow: "bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,rgba(168,85,247,0.24),transparent_68%)]",    label: "text-purple-300/60", hoverBorder: "hover:border-purple-500/22" },
  cyan:   { gradient: "from-[#091e26] to-[#061319]", glow: "bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,rgba(6,182,212,0.24),transparent_68%)]",     label: "text-cyan-300/60",   hoverBorder: "hover:border-cyan-500/22"   },
  slate:  { gradient: "from-[#111827] to-[#0d1117]", glow: "bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,rgba(100,116,139,0.26),transparent_68%)]",   label: "text-slate-300/60",  hoverBorder: "hover:border-slate-500/22"  },
  violet: { gradient: "from-[#170a2a] to-[#0e061a]", glow: "bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,rgba(139,92,246,0.24),transparent_68%)]",    label: "text-violet-300/60", hoverBorder: "hover:border-violet-500/22" },
};

export default async function AgentsPage() {
  const session = await getSession();
  if (!session) return null;
  await ensureBaseAgents();
  const [agents, hiredJobs, routes] = await Promise.all([
    prisma.agent.findMany({ orderBy: { kind: "asc" } }),
    prisma.hiredJob.findMany({ where: { userId: session.userId, enabled: true }, select: { agentKind: true }, distinct: ["agentKind"] }),
    getModelRoutes(session.userId),
  ]);
  const hiredKinds = new Set(hiredJobs.map((j) => j.agentKind));
  const visibleAgents = agents.filter((a) => hiredKinds.has(a.kind));
  const modelCatalog = getAvailableModelCatalog();

  const chiefAdvisor = {
    name: "Chief Advisor",
    username: "chief_advisor",
    kindLabel: "ADVISOR",
    role: "Primary Business Advisor",
    status: "Available",
    capabilities: [
      "Prioritize what matters most this week",
      "Recommend which agents to hire and onboard",
      "Design safe rollout plans with approvals",
    ],
  };

  return (
    <div className="space-y-6">
      <header className="wf-panel rounded-3xl p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Agents</h1>
            <p className="mt-1 text-sm wf-muted">Your workforce roster. Tap a card to open the agent profile.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/office" className="wf-btn-primary px-4 py-2 text-sm">
              Visit Office
            </Link>
          </div>
        </div>
      </header>

      <div className="wf-panel rounded-3xl p-4">
        <div className="flex gap-5 overflow-x-auto pb-2">

          {/* ── Chief Advisor Card ── */}
          <div className="w-[265px] shrink-0">
            <Link
              href="/agents/chief-advisor"
              className={`group block overflow-hidden rounded-[22px] border border-white/8 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${cardTheme.blue.hoverBorder}`}
            >
              {/* Colored portrait area */}
              <div className="relative h-[262px] overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-b ${cardTheme.blue.gradient}`} />
                <div className={`absolute inset-0 ${cardTheme.blue.glow}`} />
                <div className={`absolute top-3.5 left-3.5 text-[9px] font-semibold uppercase tracking-[0.22em] ${cardTheme.blue.label}`}>
                  {chiefAdvisor.kindLabel}
                </div>
                <span className="absolute top-3.5 right-3.5 rounded-full border border-emerald-300/35 bg-emerald-950/70 px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] text-emerald-300">
                  {chiefAdvisor.status}
                </span>
                <div className="absolute inset-0 flex items-end justify-center pb-2">
                  <AgentCharacterFigure variant="advisor" tone="blue" size="lg" />
                </div>
              </div>
              {/* Info panel */}
              <div className="border-t border-white/6 bg-[var(--card)] p-4">
                <div className="text-lg font-semibold tracking-tight">{chiefAdvisor.name}</div>
                <div className="mt-0.5 text-xs text-white/35">@{chiefAdvisor.username}</div>
                <div className="mt-1.5 text-sm wf-muted">{chiefAdvisor.role}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {chiefAdvisor.capabilities.slice(0, 2).map((cap) => (
                    <span key={cap} className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] wf-muted">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          </div>

          {/* ── Hired Agent Cards ── */}
          {visibleAgents.map((a) => {
            const ui = UI_AGENTS.find((item) => item.kind === a.kind);
            const tone: ToneKey = (ui?.tone ?? "teal") as ToneKey;
            const theme = cardTheme[tone];
            const status = ui?.status ?? a.status;
            const isNeedsApproval = status === "Needs approval";
            const statusBadge = isNeedsApproval ? "border-orange-300/35 bg-orange-950/70 text-orange-300" : theme.label.replace("text-", "border-").replace("/60", "/35") + " bg-opacity-70 " + theme.label.replace("/60", "/80");

            return (
              <div key={a.id} className="w-[265px] shrink-0">
                <Link
                  href={`/agents/${a.kind}`}
                  className={`group block overflow-hidden rounded-[22px] border border-white/8 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${theme.hoverBorder}`}
                >
                  {/* Colored portrait area */}
                  <div className="relative h-[262px] overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-b ${theme.gradient}`} />
                    <div className={`absolute inset-0 ${theme.glow}`} />
                    <div className={`absolute top-3.5 left-3.5 text-[9px] font-semibold uppercase tracking-[0.22em] ${theme.label}`}>
                      {a.kind.replaceAll("_", " ")}
                    </div>
                    <span className={`absolute top-3.5 right-3.5 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] ${statusBadge}`}>
                      {status}
                    </span>
                    <div className="absolute inset-0 flex items-end justify-center pb-2">
                      <AgentCharacterFigure
                        variant={ui?.figureVariant ?? "assistant"}
                        tone={tone}
                        size="lg"
                      />
                    </div>
                  </div>
                  {/* Info panel */}
                  <div className="border-t border-white/6 bg-[var(--card)] p-4">
                    <div className="text-lg font-semibold tracking-tight">{a.name}</div>
                    <div className="mt-0.5 text-xs text-white/35">@{a.username ?? ui?.username ?? "agent"}</div>
                    <div className="mt-1.5 text-sm wf-muted">{ui?.role ?? a.headline ?? "Generalist"}</div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(ui?.capabilities ?? []).slice(0, 2).map((cap) => (
                        <span key={cap} className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] wf-muted">
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
                <div className="mt-2.5">
                  <div className="mb-1 text-[10px] uppercase tracking-[0.14em] wf-muted">AI model</div>
                  <ModelRouteSelector
                    target="ASSISTANT"
                    initial={routes.ASSISTANT}
                    catalog={modelCatalog}
                    compact
                  />
                </div>
              </div>
            );
          })}

          {/* ── Empty state ── */}
          {visibleAgents.length === 0 ? (
            <div className="w-[265px] shrink-0">
              <div className="flex h-[415px] flex-col justify-between overflow-hidden rounded-[22px] border border-dashed border-[var(--border)] bg-[rgba(255,255,255,0.01)] p-5">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] wf-muted">Workers</div>
                  <div className="mt-2 text-xl font-semibold tracking-tight">No hired agents yet</div>
                  <p className="mt-2 text-sm wf-muted">
                    Chief Advisor is included by default. Hire workers to add execution specialists to your workforce.
                  </p>
                </div>
                <Link href="/agents/hire" className="wf-btn-primary px-4 py-2 text-sm text-center">
                  Hire Agents
                </Link>
              </div>
            </div>
          ) : null}

        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ensureBaseAgents } from "@/lib/seed";
import { UI_AGENTS } from "@/lib/workforce-ui";
import { getSession } from "@/lib/auth";
import { deriveAgentSoulHighlights, getAgentSoulPackForUser } from "@/lib/agent-soul";
import { getAgentAutomationConfig } from "@/lib/orchestration-store";
import { getIntegrationToToolMapping } from "@/lib/tool-registry";
import { AgentAutomationConfigPanel } from "@/components/agent-automation-config-panel";
import { AgentsSectionNav } from "@/components/agents-section-nav";

type SearchParams = Promise<{ view?: string }>;

function AutonomyOption({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={`rounded-2xl border px-3 py-3 text-sm ${active ? "border-teal-700 bg-teal-50" : "border-[var(--border)] bg-white/70"}`}>
      <div className="font-medium">{label}</div>
      <div className="mt-1 wf-muted">
        {label === "Draft only" && "No external actions"}
        {label === "Execute with approval" && "Recommended default"}
        {label === "Execute automatically" && "Admin-only"}
      </div>
    </div>
  );
}

export default async function AgentProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: SearchParams;
}) {
  const session = await getSession();
  await ensureBaseAgents();
  const { kind } = await params;
  const { view } = await searchParams;
  const isAdminView = view === "admin";

  const { UI_AGENTS } = await import("@/lib/workforce-ui");
  if (!UI_AGENTS.some((a) => a.kind === kind)) notFound();
  const agentKindKey = kind as import("@/lib/workforce-ui").AgentKindKey;
  const agentKindEnum = kind as import("@prisma/client").AgentKind;
  const agentTarget = kind as import("@/lib/orchestration-store").AgentTarget;

  if (!session) notFound();

  const hired = await prisma.hiredJob.findFirst({
    where: {
      userId: session.userId,
      agentKind: agentKindEnum,
      enabled: true,
    },
    select: { id: true },
  });
  if (!hired) {
    return (
      <div className="space-y-6">
        <header className="wf-panel rounded-3xl p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link className="text-sm wf-muted hover:text-[var(--foreground)]" href="/agents">
                Back to Agents
              </Link>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">{kind.replaceAll("_", " ")}</h1>
              <p className="mt-1 text-sm wf-muted">This role isn't active yet.</p>
            </div>
            <Link href="/pricing" className="wf-btn-primary px-4 py-2 text-sm">
              Activate this role
            </Link>
          </div>
          <AgentsSectionNav />
        </header>

        <section className="wf-panel rounded-3xl p-6">
          <div className="max-w-2xl">
            <div className="text-lg font-semibold tracking-tight">Chief Advisor is included by default</div>
            <p className="mt-2 text-sm wf-muted">
              Specialist roles like Assistant and Project Manager appear here after you activate them. Once active, you can configure
              their model, wake modes, integrations, and operating behavior.
            </p>
          </div>
        </section>
      </div>
    );
  }

  const [agent, submissions, soulPack, automationConfig] = await Promise.all([
    prisma.agent.findUnique({ where: { kind: agentKindEnum } }),
    prisma.submission.findMany({ where: { agentKind: agentKindEnum }, orderBy: { createdAt: "desc" }, take: 5 }),
    getAgentSoulPackForUser(session?.userId, agentKindKey),
    session?.userId ? getAgentAutomationConfig(session.userId, agentTarget) : Promise.resolve(null),
  ]);

  if (!agent) notFound();

  const ui = UI_AGENTS.find((a) => a.kind === kind);
  if (!ui) notFound();
  const soulHighlights = deriveAgentSoulHighlights(soulPack);

  return (
    <div className="space-y-6">
      <header className="wf-panel rounded-3xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link className="text-sm wf-muted hover:text-[var(--foreground)]" href="/agents">
              Back to Agents
            </Link>
            <div className="mt-3 text-xs uppercase tracking-[0.16em] wf-muted">Agent profile</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{agent.name}</h1>
            <p className="mt-1 text-xs text-white/70">@{agent.username ?? ui.username}</p>
            <p className="mt-1 text-sm wf-muted">{ui.role}</p>
          </div>
          <div className="wf-soft rounded-2xl p-4 text-sm">
            <div className="font-medium">{ui.status}</div>
            <div className="mt-1 wf-muted">Autonomy: {ui.autonomy}</div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={`/agents/${kind}`} className={`wf-btn px-3 py-1.5 text-sm ${!isAdminView ? "ring-2 ring-teal-700/15" : ""}`}>
            Non-technical view
          </Link>
          <Link
            href={`/agents/${kind}?view=admin`}
            className={`wf-btn px-3 py-1.5 text-sm ${isAdminView ? "ring-2 ring-teal-700/15" : ""}`}
          >
            Developer / admin tab
          </Link>
        </div>
        <AgentsSectionNav />
      </header>

      {!isAdminView ? (
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="wf-panel rounded-3xl p-5">
            <h2 className="text-lg font-semibold tracking-tight">Layer 1: Non-technical</h2>
            <div className="mt-4 space-y-4">
              <div className="wf-soft rounded-2xl p-4">
                <div className="text-xs uppercase tracking-[0.16em] wf-muted">Role description</div>
                <div className="mt-2 text-sm">{agent.headline ?? `${ui.role} focused on dependable execution and clear review points.`}</div>
              </div>

              <div className="wf-soft rounded-2xl p-4">
                <div className="text-xs uppercase tracking-[0.16em] wf-muted">Permissions (plain English)</div>
                <ul className="mt-2 space-y-1 text-sm">
                  {ui.permissions.map((permission) => (
                    <li key={permission}>• {permission}</li>
                  ))}
                </ul>
              </div>

              <div className="wf-soft rounded-2xl p-4">
                <div className="text-xs uppercase tracking-[0.16em] wf-muted">Autonomy (safety slider)</div>
                <div className="mt-3 grid gap-2">
                  <AutonomyOption label="Draft only" active={ui.autonomy === "Draft only"} />
                  <AutonomyOption label="Execute with approval" active={ui.autonomy === "Execute with approval"} />
                  <AutonomyOption label="Execute automatically" active={ui.autonomy === "Execute automatically"} />
                </div>
                <div className="mt-3 rounded-2xl border border-[var(--border)] bg-white/75 p-3 text-sm">
                  <div className="font-medium">External action preview</div>
                  <div className="mt-1 wf-muted">
                    Preview: &quot;Email 12 delayed-shipment customers with approved template A&quot;
                  </div>
                  <div className="mt-1 wf-muted">Rollback: available for email sends and CRM note updates</div>
                  <div className="mt-1 wf-muted">Audit trail: always on</div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="wf-panel rounded-3xl p-5">
              <h2 className="text-lg font-semibold tracking-tight">Recent outcomes (wins + failures)</h2>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="wf-soft rounded-2xl p-4">
                  <div className="text-xs uppercase tracking-[0.16em] wf-muted">Wins</div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {ui.wins.map((win) => (
                      <li key={win}>• {win}</li>
                    ))}
                  </ul>
                </div>
                <div className="wf-soft rounded-2xl p-4">
                  <div className="text-xs uppercase tracking-[0.16em] wf-muted">Failures</div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {ui.failures.map((failure) => (
                      <li key={failure}>• {failure}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="wf-panel rounded-3xl p-5">
              <h2 className="text-lg font-semibold tracking-tight">Knowledge sources connected</h2>
              <div className="mt-3 space-y-2">
                {ui.knowledgeSources.map((source) => (
                  <div key={source} className="wf-soft rounded-2xl p-3 text-sm">
                    {source}
                  </div>
                ))}
              </div>
            </div>

            <div className="wf-panel rounded-3xl p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold tracking-tight">Agent Soul (shared operating context)</h2>
                <Link href="/company-soul" className="wf-btn px-3 py-1 text-xs">Company Soul</Link>
              </div>
              <div className="mt-3 grid gap-2 text-sm">
                {soulHighlights.length ? (
                  soulHighlights.map((line) => (
                    <div key={line} className="wf-soft rounded-2xl p-3">{line}</div>
                  ))
                ) : (
                  <div className="wf-soft rounded-2xl p-3 wf-muted">
                    Add Company Soul details to anchor this agent to your mission, rules, and operating model.
                  </div>
                )}
              </div>
            </div>

            <div className="wf-panel rounded-3xl p-5">
              <h2 className="text-lg font-semibold tracking-tight">Recent work history</h2>
              <div className="mt-3 space-y-2 text-sm">
                {submissions.length === 0 ? (
                  <div className="wf-soft rounded-2xl p-3 wf-muted">No recorded submissions yet.</div>
                ) : (
                  submissions.map((s) => (
                    <div key={s.id} className="wf-soft rounded-2xl p-3">
                      <div className="font-medium">{s.title}</div>
                      <div className="mt-1 wf-muted">
                        {s.status} · {s.createdAt.toISOString().slice(0, 10)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <section className="wf-panel rounded-3xl p-5">
            <h2 className="text-lg font-semibold tracking-tight">Layer 2: Developer / admin</h2>
            <div className="mt-4 space-y-4 text-sm">
              <div className="wf-soft rounded-2xl p-4">
                <div className="text-xs uppercase tracking-[0.16em] wf-muted">Prompt / versioning</div>
                <div className="mt-2 font-medium">{ui.dev.promptVersion}</div>
                <div className="mt-1 wf-muted">Prompts versioned separately for staging and production evals.</div>
              </div>

              <div className="wf-soft rounded-2xl p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs uppercase tracking-[0.16em] wf-muted">Agent soul pack (OpenClaw-style layering)</div>
                  <Link href="/company-soul" className="wf-btn px-3 py-1 text-xs">Edit Company Soul</Link>
                </div>
                <div className="mt-2 text-xs wf-muted">
                  Layered as: core truths + boundaries + role identity + shared company soul + recent memory.
                </div>
                <pre className="mt-3 max-h-72 overflow-auto rounded-2xl border border-[var(--border)] bg-white/75 p-3 text-xs whitespace-pre-wrap">
                  {soulPack?.promptText ?? "Company Soul not set yet. Add company context to generate agent soul packs."}
                </pre>
              </div>

              <div className="wf-soft rounded-2xl p-4">
                <div className="text-xs uppercase tracking-[0.16em] wf-muted">Tools & API connectors</div>
                <div className="mt-2">Tools: {ui.dev.tools.join(" · ")}</div>
                <div className="mt-1 wf-muted">Connectors: {ui.dev.connectors.join(" · ")}</div>
              </div>

              <div className="wf-soft rounded-2xl p-4">
                <div className="text-xs uppercase tracking-[0.16em] wf-muted">Evaluation / test runs</div>
                <div className="mt-3 space-y-2">
                  {ui.dev.evals.map((evalRun) => (
                    <div key={`${evalRun.name}-${evalRun.env}`} className="rounded-xl border border-[var(--border)] bg-white/85 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{evalRun.name}</div>
                        <span className="wf-chip rounded-full px-2 py-1 text-xs">{evalRun.env}</span>
                      </div>
                      <div className="mt-1 wf-muted">
                        Score {evalRun.score} · {evalRun.lastRun}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="space-y-4">
          {automationConfig ? <AgentAutomationConfigPanel target={agentTarget} initial={automationConfig} integrationOptions={Object.keys(getIntegrationToToolMapping())} /> : null}
          <section className="wf-panel rounded-3xl p-5">
            <h2 className="text-lg font-semibold tracking-tight">Logs (tool calls, errors, latency)</h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)]">
              <div className="grid grid-cols-12 bg-white/80 px-3 py-2 text-xs uppercase tracking-[0.12em] wf-muted">
                <div className="col-span-2">Time</div>
                <div className="col-span-6">Event</div>
                <div className="col-span-2">Latency</div>
                <div className="col-span-2">Status</div>
              </div>
              {ui.dev.logs.map((log) => (
                <div key={`${log.time}-${log.event}`} className="grid grid-cols-12 border-t border-[var(--border)] bg-white/65 px-3 py-2 text-sm">
                  <div className="col-span-2">{log.time}</div>
                  <div className="col-span-6">{log.event}</div>
                  <div className="col-span-2 wf-muted">{log.latencyMs}ms</div>
                  <div className="col-span-2">
                    <span className={`wf-chip rounded-full px-2 py-1 text-xs ${log.status === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                      {log.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
          </div>
        </div>
      )}
    </div>
  );
}

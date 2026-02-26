import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { REQUEST_PATTERN } from "@/lib/workforce-ui";
import { ensureWorkspaceSeeded, getProjectForUser, getProjectRunContextSummary } from "@/lib/workspace-store";
import { createRunForProject } from "@/lib/workspace-store";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return null;
  await ensureWorkspaceSeeded(session.userId);
  const { id } = await params;
  const [project] = await Promise.all([getProjectForUser(session.userId, id)]);

  if (!project) notFound();
  const runContext = await getProjectRunContextSummary(session.userId, project.id);

  const taskCount = project.board.reduce((sum, column) => sum + column.cards.length, 0);

  return (
    <div className="space-y-6">
      <header className="wf-panel rounded-3xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href="/projects" className="text-sm wf-muted hover:text-[var(--foreground)]">
              Back to Projects
            </Link>
            <div className="mt-3 text-xs uppercase tracking-[0.16em] wf-muted">{project.status}</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{project.name}</h1>
            <p className="mt-2 max-w-4xl text-sm wf-muted">Goal: {project.goal}</p>
          </div>
          <div className="wf-soft rounded-2xl p-4 text-sm">
            <div className="font-medium">Health: {project.workforceHealth}</div>
            <div className="mt-1 wf-muted">
              {taskCount} tasks · {project.artifacts.length} artifacts · {project.timeline.length} recent events
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/inbox" className="wf-btn px-3 py-1.5 text-sm">
                Inbox
              </Link>
              <form
                action={async () => {
                  "use server";
                  await createRunForProject(session.userId, project.id, `${project.name} run`);
                }}
              >
                <button className="wf-btn-primary px-3 py-1.5 text-sm">Run</button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <section className="wf-panel rounded-3xl p-5">
        <div className="text-xs uppercase tracking-[0.16em] wf-muted">Task board (Kanban)</div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
          {project.board.map((column) => (
            <div key={column.title} className="wf-soft rounded-2xl p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">{column.title}</div>
                <span className="wf-chip rounded-full px-2 py-1 text-xs">{column.cards.length}</span>
              </div>
              <div className="mt-3 space-y-2">
                {column.cards.map((card) => (
                  <div key={card.id} className="rounded-xl border border-[var(--border)] bg-white/80 p-3">
                    <div className="text-sm">{card.title}</div>
                    <div className="mt-1 text-xs wf-muted">
                      {card.owner} · {card.eta}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <section id="artifacts" className="wf-panel scroll-mt-28 rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Artifacts</h2>
                <p className="text-sm wf-muted">Docs, spreadsheets, drafts, snippets, and outputs.</p>
              </div>
              <Link href="#artifacts" className="wf-btn-info px-3 py-1.5 text-sm">Add artifact</Link>
            </div>
            <div className="mt-4 space-y-2">
              {project.artifacts.map((artifact) => (
                <div key={artifact} className="wf-soft rounded-xl p-3 text-sm">
                  {artifact}
                </div>
              ))}
            </div>
          </section>

          <section className="wf-panel rounded-3xl p-5">
            <h2 className="text-lg font-semibold tracking-tight">Request / Plan / Execute / Review</h2>
            <p className="mt-1 text-sm wf-muted">Reusable execution pattern for every new task.</p>
            <div className="mt-4 space-y-3">
              <div className="wf-soft rounded-2xl p-4">
                <div className="text-xs uppercase tracking-[0.16em] wf-muted">Request</div>
                <div className="mt-1 text-sm">{REQUEST_PATTERN.request}</div>
              </div>
              <div className="wf-soft rounded-2xl p-4">
                <div className="text-xs uppercase tracking-[0.16em] wf-muted">Plan</div>
                <ul className="mt-2 space-y-1 text-sm">
                  {REQUEST_PATTERN.plan.map((step) => (
                    <li key={step}>• {step}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="wf-panel rounded-3xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Run context</h2>
                <p className="text-sm wf-muted">Company + agent soul snapshot used for the latest run, with diffs vs previous.</p>
              </div>
              {runContext.latest ? (
                <a
                  href={`/api/runs/${runContext.latest.runId}/soul`}
                  target="_blank"
                  rel="noreferrer"
                  className="wf-btn-info px-3 py-1.5 text-sm"
                >
                  Raw snapshot JSON
                </a>
              ) : null}
            </div>

            {runContext.latest ? (
              <div className="mt-4 space-y-4">
                <div className="wf-soft rounded-2xl p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="wf-chip rounded-full px-2 py-1 text-xs">{runContext.latest.soulSnapshotVersion ?? "unknown snapshot"}</span>
                    <span className="wf-chip rounded-full px-2 py-1 text-xs">
                      {new Date(runContext.latest.createdAt).toLocaleString()}
                    </span>
                    {runContext.latest.companySoulCompleteness != null ? (
                      <span className="wf-chip rounded-full px-2 py-1 text-xs">
                        Company Soul {runContext.latest.companySoulCompleteness}%
                      </span>
                    ) : null}
                    {runContext.latest.autonomy ? (
                      <span className="wf-chip rounded-full px-2 py-1 text-xs">Autonomy {runContext.latest.autonomy}</span>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-[var(--border)] bg-white/75 p-3">
                      <div className="text-xs uppercase tracking-[0.16em] wf-muted">Connectors at run time</div>
                      <div className="mt-2 space-y-2 text-sm">
                        {runContext.latest.connectors.map((c) => (
                          <div key={c.provider} className="flex items-center justify-between gap-2">
                            <span>{c.provider}</span>
                            <span className="wf-chip rounded-full px-2 py-1 text-xs">
                              {c.mode.toLowerCase()} · {c.status.toLowerCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-white/75 p-3">
                      <div className="text-xs uppercase tracking-[0.16em] wf-muted">Agent soul packs in run</div>
                      <div className="mt-2 space-y-2 text-sm">
                        {runContext.latest.agents.map((a) => (
                          <div key={a.kind} className="flex items-center justify-between gap-2">
                            <span>{a.role}</span>
                            <span className="wf-chip rounded-full px-2 py-1 text-xs">
                              {a.anchorCount} anchors · {a.memoryCount} memory
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="wf-soft rounded-2xl p-4">
                  <div className="text-xs uppercase tracking-[0.16em] wf-muted">What changed since previous run</div>
                  <div className="mt-2 space-y-2 text-sm">
                    {runContext.diffLines.map((line, index) => (
                      <div key={`${index}:${line}`} className="rounded-xl border border-[var(--border)] bg-white/70 px-3 py-2">
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 wf-soft rounded-2xl p-4 text-sm wf-muted">
                No run snapshots yet. Start a run to capture the exact company and agent soul context used for execution.
              </div>
            )}
          </section>
        </div>

        <section id="activity" className="wf-panel scroll-mt-28 rounded-3xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Activity timeline</h2>
              <p className="text-sm wf-muted">Audit-friendly project activity.</p>
            </div>
            <Link href={`/api/projects/${project.id}/activity`} className="wf-btn-info px-3 py-1.5 text-sm">
              Export log
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {project.timeline.map((event, index) => (
              <div key={`${index}:${event}`} className="wf-soft rounded-xl p-3 text-sm">
                {event}
              </div>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}

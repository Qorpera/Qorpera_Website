import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureWorkspaceSeeded, getProjectsForUser, getTemplates } from "@/lib/workspace-store";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string | string[] | undefined }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const resolved = (await searchParams) ?? {};
  const tabRaw = Array.isArray(resolved.tab) ? resolved.tab[0] : resolved.tab;
  const tab = tabRaw === "templates" || tabRaw === "flow" ? tabRaw : "projects";
  await ensureWorkspaceSeeded(session.userId);
  const [projects, templates, waitingReviewCount] = await Promise.all([
    getProjectsForUser(session.userId),
    getTemplates(),
    prisma.submission.count({ where: { userId: session.userId, status: "SUBMITTED" } }),
  ]);

  return (
    <div className="space-y-6">
      <header className="wf-panel rounded-3xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
            <p className="mt-2 max-w-3xl text-base wf-muted">Visual workspace: boards, artifacts, and audit trails with obvious next actions.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/projects?tab=projects" className={`wf-btn px-5 py-2.5 text-sm ${tab === "projects" ? "border-teal-400/40 bg-teal-500/15 text-teal-200" : ""}`}>Projects</Link>
            <Link href="/projects?tab=templates" className={`wf-btn px-5 py-2.5 text-sm ${tab === "templates" ? "border-blue-400/40 bg-blue-500/10 text-blue-200" : ""}`}>Templates</Link>
            <Link href="/projects?tab=flow" className={`wf-btn px-5 py-2.5 text-sm ${tab === "flow" ? "border-violet-400/40 bg-violet-500/10 text-violet-200" : ""}`}>Flow</Link>
            <Link href="/projects/new" className="wf-btn-primary px-5 py-2.5 text-sm">New Project</Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="wf-panel rounded-3xl p-5">
          <div className="text-sm wf-muted">Active</div>
          <div className="mt-2 text-3xl font-semibold">{projects.length}</div>
          <div className="mt-2 h-2 rounded-full bg-zinc-200"><div className="h-2 w-4/5 rounded-full bg-teal-500" /></div>
        </div>
        <div className="wf-panel rounded-3xl p-5">
          <div className="text-sm wf-muted">Waiting Review</div>
          <div className="mt-2 text-3xl font-semibold">{waitingReviewCount}</div>
          <div className="mt-2 h-2 rounded-full bg-zinc-200"><div className={`h-2 rounded-full bg-orange-600`} style={{ width: `${Math.min(100, Math.max(5, waitingReviewCount * 20))}%` }} /></div>
        </div>
        <div className="wf-panel rounded-3xl p-5">
          <div className="text-sm wf-muted">Templates</div>
          <div className="mt-2 text-3xl font-semibold">{templates.length}</div>
          <div className="mt-2 h-2 rounded-full bg-zinc-200"><div className="h-2 w-3/4 rounded-full bg-blue-600" /></div>
        </div>
      </section>

      {tab === "projects" ? (
      <section className="space-y-4">
          {projects.map((project) => (
            <article key={project.id} className="wf-panel rounded-3xl p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm wf-muted">{project.status}</div>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">{project.name}</h2>
                  <div className="mt-2 text-sm wf-muted">{project.goal}</div>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {project.board.map((col) => (
                      <div key={`${project.id}-${col.title}`} className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.05)] p-3 text-center">
                        <div className="text-xs wf-muted">{col.title}</div>
                        <div className="mt-1 text-base font-semibold">{col.cards.length}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <span className="wf-chip rounded-full">
                  Health: {project.workforceHealth}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/projects/${project.slug}`} className="wf-btn-primary px-4 py-2.5 text-sm">
                  Open project
                </Link>
                <Link href={`/projects/${project.slug}#artifacts`} className="wf-btn px-4 py-2.5 text-sm">
                  Artifacts
                </Link>
                <Link href={`/projects/${project.slug}#activity`} className="wf-btn px-4 py-2.5 text-sm">
                  Activity
                </Link>
              </div>
            </article>
          ))}
      </section>
      ) : null}

      {tab === "templates" ? (
        <section className="wf-panel rounded-3xl p-7">
          <h2 className="text-xl font-semibold tracking-tight">Templates are now in New Project</h2>
          <p className="mt-3 text-base wf-muted">
            Open the setup flow and expand the Template Gallery there so you can compare templates while the advisor helps orchestrate the project.
          </p>
          <div className="mt-4">
            <Link href="/projects/new" className="wf-btn-primary px-5 py-2.5 text-sm">Open New Project</Link>
          </div>
        </section>
      ) : null}

      {tab === "flow" ? (
        <section className="wf-panel rounded-3xl p-7">
          <h2 className="text-xl font-semibold tracking-tight">Flow lives inside each project</h2>
          <p className="mt-3 text-base wf-muted">
            Request/plan/execute/review and workspace previews are now shown where the work actually happens: in `New Project` and individual project pages.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/projects/new" className="wf-btn-primary px-5 py-2.5 text-sm">Open New Project</Link>
            {projects[0] ? <Link href={`/projects/${projects[0].slug}`} className="wf-btn px-5 py-2.5 text-sm">Open a Project</Link> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

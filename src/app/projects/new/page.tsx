import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ensureWorkspaceSeeded, getProjectsForUser, getTemplates } from "@/lib/workspace-store";
import { AdvisorChat } from "@/components/advisor-chat";
export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const { template } = await searchParams;
  const session = await getSession();
  if (!session) return null;
  await ensureWorkspaceSeeded(session.userId);
  const [templates, projects] = await Promise.all([
    getTemplates(),
    getProjectsForUser(session.userId),
  ]);

  const picked = template ? templates.find((t) => t.slug === template) : templates[0];

  if (!picked) notFound();

  const suggestedProject = projects.find((p) => p.name.toLowerCase().includes(picked.name.split(" ")[0].toLowerCase())) ?? projects[0];

  return (
    <div className="space-y-6">
      <header className="wf-panel rounded-3xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href="/projects" className="text-sm wf-muted hover:text-[var(--foreground)]">
              Back to Projects
            </Link>
            <div className="mt-3 text-xs uppercase tracking-[0.16em] wf-muted">Template setup</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{picked.name}</h1>
            <p className="mt-2 max-w-3xl text-sm wf-muted">{picked.outcome}</p>
          </div>
          <div className="flex gap-2">
            <Link href={suggestedProject ? `/projects/${suggestedProject.slug}` : "/projects"} className="wf-btn px-4 py-2 text-sm">
              Preview workspace
            </Link>
            <form action="/api/projects/from-template" method="post">
              <input type="hidden" name="templateSlug" value={picked.slug} />
              <button className="wf-btn-primary px-4 py-2 text-sm">Create project</button>
            </form>
          </div>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="wf-panel rounded-3xl p-5">
          <div className="text-xs uppercase tracking-[0.16em] wf-muted">What gets created</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="wf-soft rounded-2xl p-4">
              <div className="font-medium">Project</div>
              <div className="mt-1 text-sm wf-muted">{picked.name}</div>
            </div>
            <div className="wf-soft rounded-2xl p-4">
              <div className="font-medium">Agents (2-6)</div>
              <div className="mt-1 text-sm wf-muted">{picked.agents.join(" · ")}</div>
            </div>
            <div className="wf-soft rounded-2xl p-4">
              <div className="font-medium">Workflow</div>
              <div className="mt-1 text-sm wf-muted">{picked.workflow}</div>
            </div>
            <div className="wf-soft rounded-2xl p-4">
              <div className="font-medium">Permissions</div>
              <div className="mt-1 text-sm wf-muted">{picked.permissions}</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <AdvisorChat
            mode="new_project"
            title="Project orchestration advisor"
            subtitle="Describe the project and get recommendations for workflow design, agent roles, delegation, and safe onboarding."
            seedQuestion={`I want to launch a project similar to "${picked.name}". What agents should I hire and how should I stage rollout?`}
            showProjectBrief
          />
        </div>
      </section>

      <details className="wf-panel rounded-3xl p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Template Gallery</h2>
            <p className="mt-1 text-sm wf-muted">Switch templates without leaving the setup flow.</p>
          </div>
          <span className="wf-btn px-3 py-1.5 text-sm">Expand</span>
        </summary>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <Link
              key={t.id}
              href={`/projects/new?template=${t.slug}`}
              className={`wf-soft rounded-2xl p-4 ${picked.slug === t.slug ? "ring-2 ring-teal-400/30" : ""}`}
            >
              <div className="font-medium">{t.name}</div>
              <div className="mt-1 text-sm wf-muted">{t.outcome}</div>
              <div className="mt-3 flex flex-wrap gap-1">
                {t.agents.slice(0, 3).map((agent) => (
                  <span key={`${t.id}-${agent}`} className="wf-chip rounded-full px-2 py-1 text-[10px]">{agent}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </details>
    </div>
  );
}

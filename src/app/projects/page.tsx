import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session) return null;

  const projects = await prisma.project.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  const taskCounts = await prisma.delegatedTask.groupBy({
    by: ["projectRef"],
    where: { userId: session.userId, projectRef: { in: projects.map((p) => p.id) } },
    _count: { id: true },
  });
  const countMap = new Map(taskCounts.map((r) => [r.projectRef, r._count.id]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-white/50">Group agent work under named goals.</p>
        </div>
        <Link href="/projects/new" className="wf-btn-primary px-4 py-2 text-sm">New project</Link>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-12 text-center">
          <div className="text-white/40 text-sm">No projects yet.</div>
          <Link href="/projects/new" className="mt-4 inline-block wf-btn-primary px-4 py-2 text-sm">Create your first project</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const taskCount = countMap.get(project.id) ?? 0;
            return (
              <div key={project.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium">{project.name}</div>
                    <div className="mt-0.5 text-sm text-white/50 truncate">{project.goal}</div>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-xs text-white/50">
                    {taskCount} {taskCount === 1 ? "task" : "tasks"}
                  </span>
                </div>
                <div className="mt-3">
                  <Link href={`/projects/${project.slug}`} className="wf-btn px-3 py-1.5 text-sm">Open</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

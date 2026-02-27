import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const STATUS_COLORS: Record<string, string> = {
  QUEUED:  "border-white/10 text-white/40",
  RUNNING: "border-teal-500/40 text-teal-300",
  REVIEW:  "border-amber-500/40 text-amber-300",
  DONE:    "border-emerald-500/40 text-emerald-300",
  FAILED:  "border-rose-500/40 text-rose-300",
  PAUSED:  "border-white/10 text-white/40",
};

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return null;

  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { userId: session.userId, OR: [{ id }, { slug: id }] },
  });
  if (!project) notFound();

  const tasks = await prisma.delegatedTask.findMany({
    where: { userId: session.userId, projectRef: project.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const byStatus = tasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/projects" className="text-sm text-white/40 hover:text-white/70">← Projects</Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{project.name}</h1>
          {project.goal && <p className="mt-1 text-sm text-white/50">{project.goal}</p>}
        </div>
      </div>

      {/* Stats row */}
      {tasks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byStatus).map(([status, count]) => (
            <span key={status} className={`rounded-full border px-2.5 py-0.5 text-xs ${STATUS_COLORS[status] ?? "border-white/10 text-white/40"}`}>
              {status.toLowerCase()} · {count}
            </span>
          ))}
        </div>
      )}

      {/* Tasks */}
      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-10 text-center text-sm text-white/40">
          No agent tasks assigned to this project yet.
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium text-sm">{task.title}</div>
                  <div className="mt-0.5 text-xs text-white/40 truncate">{task.toAgentTarget} · {task.fromAgent}</div>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${STATUS_COLORS[task.status] ?? "border-white/10 text-white/40"}`}>
                  {task.status.toLowerCase()}
                </span>
              </div>
              {task.instructions && (
                <p className="mt-2 text-xs text-white/40 line-clamp-2">{task.instructions}</p>
              )}
              <div className="mt-2 text-[11px] text-white/28">
                {new Date(task.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

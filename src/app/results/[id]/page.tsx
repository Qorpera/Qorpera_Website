import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link className="text-sm text-zinc-400 hover:text-white" href={href}>
      {children}
    </Link>
  );
}

export default async function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return null;

  const { id } = await params;
  const sub = await prisma.submission.findFirst({
    where: { id, userId: session.userId },
  });

  if (!sub) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto max-w-3xl px-6 py-10">Not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        <BackLink href="/results">← Back to results</BackLink>

        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-zinc-400">Submission</div>
              <div className="text-2xl font-semibold">{sub.title}</div>
              <div className="text-sm text-zinc-500 mt-1">
                {sub.agentKind.replaceAll("_", " ")} • {sub.createdAt.toISOString()}
              </div>
            </div>
            <div className="text-xs rounded-full border border-zinc-800 px-2 py-1 text-zinc-300">
              {sub.status}
            </div>
          </div>

          <div>
            <div className="text-sm text-zinc-300">Output</div>
            <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-zinc-900 bg-zinc-950/40 p-4 text-sm text-zinc-200">
{sub.output}
            </pre>
          </div>

          <form action={`/api/submissions/${sub.id}/review`} method="post" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-zinc-300">Status</label>
                <select
                  name="status"
                  defaultValue={sub.status}
                  className="mt-1 w-full rounded-lg bg-zinc-950/60 border border-zinc-800 px-3 py-2 text-sm"
                >
                  <option value="SUBMITTED">Submitted</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="NEEDS_REVISION">Needs revision</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-zinc-300">Rating (1–5)</label>
                <input
                  name="rating"
                  type="number"
                  min={1}
                  max={5}
                  defaultValue={sub.rating ?? ""}
                  className="mt-1 w-full rounded-lg bg-zinc-950/60 border border-zinc-800 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-zinc-300">Correction (edit output)</label>
              <textarea
                name="correction"
                defaultValue={sub.correction ?? sub.output}
                rows={8}
                className="mt-1 w-full rounded-lg bg-zinc-950/60 border border-zinc-800 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-300">Notes</label>
              <textarea
                name="notes"
                defaultValue={sub.notes ?? ""}
                rows={3}
                className="mt-1 w-full rounded-lg bg-zinc-950/60 border border-zinc-800 px-3 py-2 text-sm"
              />
            </div>

            <button className="rounded-lg bg-white text-zinc-900 font-medium px-4 py-2">
              Save review
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

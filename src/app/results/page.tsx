import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export default async function ResultsPage() {
  const session = await getSession();
  if (!session) return null;

  const subs = await prisma.submission.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Results</h1>
          <p className="text-zinc-400">Inspect, evaluate, and correct submitted work.</p>
        </header>

        {subs.length === 0 ? (
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-6">
            <div className="text-zinc-300">No submissions yet.</div>
            <p className="text-sm text-zinc-400 mt-1">
              Seed some fake work by visiting <code className="text-zinc-200">/api/dev/seed</code>.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-900 overflow-hidden">
            <div className="grid grid-cols-12 bg-zinc-900/30 text-xs text-zinc-400 px-4 py-2">
              <div className="col-span-6">Title</div>
              <div className="col-span-2">Agent</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Created</div>
            </div>
            {subs.map((s) => (
              <Link
                key={s.id}
                href={`/results/${s.id}`}
                className="grid grid-cols-12 px-4 py-3 border-t border-zinc-900 text-sm hover:bg-zinc-900/10"
              >
                <div className="col-span-6">{s.title}</div>
                <div className="col-span-2 text-zinc-300">{s.agentKind.replaceAll("_", " ")}</div>
                <div className="col-span-2 text-zinc-300">{s.status}</div>
                <div className="col-span-2 text-zinc-500">{s.createdAt.toISOString().slice(0, 10)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

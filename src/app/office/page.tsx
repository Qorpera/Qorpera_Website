import Link from "next/link";
import { getSession } from "@/lib/auth";
import { DEPARTMENTS } from "@/lib/workforce-ui";

export default async function OfficePage() {
  const session = await getSession();
  if (!session) return null;

  return (
    <div className="space-y-6">
      <header className="wf-panel rounded-3xl p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">The Office</h1>
            <p className="mt-2 max-w-3xl text-sm wf-muted">
              Lightweight 2D office view: departments as rooms, each showing agents, active work, and inbox items.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/inbox" className="wf-btn px-3 py-2 text-sm">
              Inbox
            </Link>
          </div>
        </div>
      </header>

      <section className="wf-panel rounded-3xl p-4">
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(14,20,24,0.9),rgba(20,28,34,0.85))]">
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          {DEPARTMENTS.map((room) => (
            <div
              key={room.id}
              className="absolute rounded-2xl border border-[rgba(148,163,184,0.22)] bg-[linear-gradient(180deg,rgba(24,32,40,0.92),rgba(18,24,31,0.92))] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
              style={{
                left: `${room.pos.x}%`,
                top: `${room.pos.y}%`,
                width: `${room.pos.w}%`,
                height: `${room.pos.h}%`,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{room.name}</div>
                  <div className="text-xs wf-muted">{room.agents.length} agent{room.agents.length > 1 ? "s" : ""}</div>
                </div>
                <span className="wf-chip rounded-full px-2 py-1 text-xs">{room.inboxCount} inbox</span>
              </div>

              <div className="mt-2 text-xs wf-muted">Active work</div>
              <div className="mt-1 rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.05)] px-2 py-2 text-xs">
                {room.activeWork}
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {room.agents.map((agent) => (
                  <span key={`${room.id}-${agent}`} className="wf-chip rounded-full px-2 py-1 text-xs">
                    {agent}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-sm wf-muted">Think Slack channels plus a dashboard, not a game.</div>
      </section>
    </div>
  );
}

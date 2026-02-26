import { getSession } from "@/lib/auth";
import { getInboxItems } from "@/lib/inbox-store";
import { InboxList } from "@/components/inbox-list";

export default async function InboxPage() {
  const session = await getSession();
  if (!session) return null;

  const items = await getInboxItems(session.userId);
  const approvals = items.filter((i) => i.type === "approval" && i.state !== "approved");
  const incidents = items.filter((i) => i.type === "incident" && i.state !== "paused");
  const drafts = items.filter((i) => i.type === "draft");

  return (
    <div className="space-y-0">
      <header className="pb-5 border-b border-white/[0.07]">
        <h1 className="text-xl font-semibold tracking-tight">Review</h1>
        <p className="mt-1 text-sm text-white/55">Review queue and approvals. The next action should be obvious.</p>
        <div className="mt-5 flex items-stretch divide-x divide-white/[0.07]">
          <div className="pr-8">
            <div className="text-xs uppercase tracking-wider text-white/40">Needs approval</div>
            <div className={`mt-1 text-2xl font-semibold tabular-nums ${approvals.length > 0 ? "text-amber-300" : ""}`}>
              {approvals.length}
            </div>
          </div>
          <div className="px-8">
            <div className="text-xs uppercase tracking-wider text-white/40">Issues / retry</div>
            <div className={`mt-1 text-2xl font-semibold tabular-nums ${incidents.length > 0 ? "text-rose-300" : ""}`}>
              {incidents.length}
            </div>
          </div>
          <div className="pl-8">
            <div className="text-xs uppercase tracking-wider text-white/40">Drafts ready</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{drafts.length}</div>
          </div>
        </div>
      </header>

      <section className="pt-6">
        <InboxList initialItems={items} />
      </section>
    </div>
  );
}

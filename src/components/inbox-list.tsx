"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import type { InboxItem } from "@/lib/workforce-ui";
import { ReportIssueButton } from "@/components/report-issue-button";

type InboxAction = "approve" | "edit" | "ask_agent" | "pause" | "terminate";

function itemTone(type: InboxItem["type"]) {
  if (type === "approval") return "border-orange-300 bg-orange-100 text-orange-900";
  if (type === "incident") return "border-rose-300 bg-rose-100 text-rose-900";
  if (type === "system_update") return "border-teal-400/40 bg-teal-500/10 text-teal-300";
  return "border-emerald-200 bg-emerald-50";
}

function itemLabel(type: InboxItem["type"]) {
  if (type === "approval") return "Needs approval";
  if (type === "incident") return "Issue / retry";
  if (type === "system_update") return "System update";
  return "Draft ready";
}

function stateTone(state: InboxItem["state"]) {
  if (state === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (state === "needs_changes") return "border-amber-200 bg-amber-50 text-amber-800";
  if (state === "agent_followup") return "border-sky-200 bg-sky-50 text-sky-800";
  if (state === "paused") return "border-zinc-300 bg-zinc-100 text-zinc-700";
  return "border-[var(--border)] bg-white/70 text-[var(--foreground)]";
}

async function postInboxAction(id: string, action: InboxAction) {
  const res = await fetch(`/api/inbox/${id}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });

  const payload = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(payload.error || "Action failed");
}

export function InboxList({ initialItems }: { initialItems: InboxItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiReviews, setAiReviews] = useState<Record<string, { model: string; text: string }>>({});

  async function runAction(id: string, action: InboxAction) {
    setError(null);
    setPending(`${id}:${action}`);
    try {
      await postInboxAction(id, action);

      const now = new Date().toISOString();
      setItems((curr) =>
        curr.map((item) => {
          if (item.id !== id) return item;
          if (action === "approve") return { ...item, state: "approved", stateLabel: "Approved", updatedAt: now };
          if (action === "edit") return { ...item, state: "needs_changes", stateLabel: "Changes requested", updatedAt: now };
          if (action === "ask_agent") return { ...item, state: "agent_followup", stateLabel: "Asked agent for follow-up", updatedAt: now };
          if (action === "terminate") return { ...item, state: "paused", stateLabel: "Terminated", updatedAt: now };
          return { ...item, state: "paused", stateLabel: "Paused", updatedAt: now };
        }),
      );
      startTransition(() => router.refresh());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setPending(null);
    }
  }

  async function runAiReview(item: InboxItem) {
    setError(null);
    setPending(`${item.id}:ai_review`);
    try {
      const res = await fetch(`/api/inbox/${item.id}/ai-review`, { method: "POST" });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        review?: string;
        model?: string;
        item?: InboxItem;
      };
      if (!res.ok || !payload.review) throw new Error(payload.error || "AI review failed");
      const reviewText = payload.review;
      const reviewModel = payload.model ?? "ai";
      setAiReviews((curr) => ({
        ...curr,
        [item.id]: { model: reviewModel, text: reviewText },
      }));
      if (payload.item) {
        const updatedItem = payload.item;
        setItems((curr) => curr.map((row) => (row.id === item.id ? updatedItem : row)));
      }
      startTransition(() => router.refresh());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "AI review failed");
    } finally {
      setPending(null);
    }
  }

  return (
    <section>
      {error ? (
        <div className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</div>
      ) : null}

      <div className="divide-y divide-white/[0.07]">
        {items.map((item) => (
          <article key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs ${itemTone(item.type)}`}>
                  {itemLabel(item.type)}
                </span>
                <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs ${stateTone(item.state)}`}>{item.stateLabel ?? "Open"}</span>
              </div>

              <p className="text-sm font-medium">{item.summary}</p>
              <p className="text-xs wf-muted">{item.impact}</p>

              <div className="flex flex-wrap gap-1.5 text-xs wf-muted">
                <span>{item.owner}</span>
                <span>·</span>
                <span>{item.department}</span>
                {item.updatedAt ? (
                  <>
                    <span>·</span>
                    <span>{new Date(item.updatedAt).toLocaleTimeString()}</span>
                  </>
                ) : null}
              </div>

              {aiReviews[item.id] ? (
                <div className="mt-1 max-w-md rounded-lg border border-violet-400/20 bg-violet-500/8 px-3 py-2">
                  <div className="text-xs text-violet-300/80">AI Review · {aiReviews[item.id].model}</div>
                  <pre className="mt-1 whitespace-pre-wrap text-xs text-violet-100/85">{aiReviews[item.id].text}</pre>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-1.5 shrink-0">
              {item.type === "system_update" ? (
                <>
                  {(() => {
                    try {
                      const actions = item.pendingActionsJson ? JSON.parse(item.pendingActionsJson) as Array<{ type: string; provider: string; providerLabel: string; connectUrl: string }> : [];
                      return actions
                        .filter((a) => a.type === "connect_integration")
                        .map((a) => (
                          <a
                            key={a.provider}
                            href={a.connectUrl}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-400/30 bg-teal-500/10 px-3 py-1.5 text-xs text-teal-300 transition hover:bg-teal-500/20"
                          >
                            Connect {a.providerLabel}
                          </a>
                        ));
                    } catch {
                      return null;
                    }
                  })()}
                  <button
                    className="wf-btn-muted px-3 py-1.5 text-xs disabled:opacity-60"
                    disabled={pending !== null}
                    onClick={() => runAction(item.id, "approve")}
                  >
                    {pending === `${item.id}:approve` ? "…" : "Dismiss"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="wf-btn-success px-3 py-1.5 text-xs disabled:opacity-60"
                    disabled={pending !== null}
                    onClick={() => runAction(item.id, "approve")}
                  >
                    {pending === `${item.id}:approve` ? "…" : "Approve"}
                  </button>
                  <Link href="/projects" className="wf-btn-info grid place-items-center px-3 py-1.5 text-xs text-center">
                    Open
                  </Link>
                  <button
                    className="wf-btn-purple px-3 py-1.5 text-xs disabled:opacity-60"
                    disabled={pending !== null}
                    onClick={() => runAiReview(item)}
                  >
                    {pending === `${item.id}:ai_review` ? "…" : "AI review"}
                  </button>
                  <button
                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 transition hover:bg-rose-500/15 disabled:opacity-60"
                    disabled={pending !== null}
                    onClick={() => runAction(item.id, "terminate")}
                  >
                    {pending === `${item.id}:terminate` ? "…" : "Terminate"}
                  </button>
                  <button
                    className="wf-btn-muted px-3 py-1.5 text-xs disabled:opacity-60"
                    disabled={pending !== null}
                    onClick={() => runAction(item.id, "ask_agent")}
                  >
                    {pending === `${item.id}:ask_agent` ? "…" : "Ask agent"}
                  </button>
                  <ReportIssueButton agentKind={item.owner} sourceRef={item.id} />
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

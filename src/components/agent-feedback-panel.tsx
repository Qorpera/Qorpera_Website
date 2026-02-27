"use client";

import { useEffect, useState } from "react";
import { kindLabel } from "@/lib/format";

interface FeedbackRow {
  id: string;
  agentKind: string;
  message: string;
  sourceRef: string | null;
  createdAt: string;
  user: { email: string };
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function AgentFeedbackPanel() {
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  async function fetchFeedback(cursor?: string, append = false) {
    const params = new URLSearchParams({ limit: "50" });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`/api/agent-feedback?${params}`);
    if (!res.ok) return;
    const data = (await res.json()) as { items: FeedbackRow[]; nextCursor: string | null };

    setItems((prev) => (append ? [...prev, ...data.items] : data.items));
    setNextCursor(data.nextCursor);
  }

  useEffect(() => {
    fetchFeedback().finally(() => setLoading(false));
  }, []);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    await fetchFeedback(nextCursor, true);
    setLoadingMore(false);
  }

  return (
    <div>
      <div className="text-sm font-medium mb-0.5">Agent feedback</div>
      <p className="text-sm text-white/45 mb-5">Issues and feedback reported by users about agent behaviour.</p>

      {loading ? (
        <div className="py-12 text-center text-sm text-white/30">Loading…</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-sm text-white/30">No feedback submitted yet.</div>
      ) : (
        <div className="border border-white/[0.08] rounded-lg overflow-hidden divide-y divide-white/[0.06]">
          {items.map((item) => (
            <div key={item.id} className="px-4 py-3 hover:bg-white/[0.02] transition">
              <div className="flex items-center gap-2 mb-1">
                <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-teal-500/15 text-teal-300">
                  {kindLabel(item.agentKind)}
                </span>
                <span className="text-xs text-white/40">{item.user.email}</span>
                <span className="ml-auto shrink-0 text-xs text-white/30">{relativeTime(item.createdAt)}</span>
              </div>
              <p className="text-sm text-white/70 whitespace-pre-wrap">{item.message}</p>
              {item.sourceRef ? (
                <div className="mt-1 text-xs text-white/30">ref: {item.sourceRef}</div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {!loading && nextCursor ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-md border border-white/[0.1] px-4 py-1.5 text-sm text-white/50 hover:text-white/75 transition disabled:opacity-40"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

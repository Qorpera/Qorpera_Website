"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { DataAppView } from "@/lib/data-app-types";

const TYPE_CONFIG: Record<string, { label: string; tone: string }> = {
  "rack-map": { label: "Rack Map", tone: "bg-teal-500/15 text-teal-300 border-teal-400/25" },
  "table": { label: "Data Table", tone: "bg-purple-500/15 text-purple-300 border-purple-400/25" },
  "kpi-grid": { label: "KPI Dashboard", tone: "bg-amber-500/15 text-amber-300 border-amber-400/25" },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function DataAppsListPanel({ initialApps }: { initialApps: DataAppView[] }) {
  const [apps, setApps] = useState(initialApps);
  const [pending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    if (!confirm("Delete this data app?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/data-apps/${id}`, { method: "DELETE" });
      if (res.ok) {
        setApps((prev) => prev.filter((a) => a.id !== id));
      }
    });
  };

  if (apps.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold text-white/90 mb-6">Data Apps</h1>
        <div className="wf-panel rounded-2xl p-12 text-center">
          <div className="text-4xl mb-4">&#128202;</div>
          <h2 className="text-lg font-medium text-white/70 mb-2">No data apps yet</h2>
          <p className="text-sm text-white/40 max-w-md mx-auto">
            Ask your advisor to visualize your business data. Try: &ldquo;Map my server infrastructure&rdquo;
            or &ldquo;Create a KPI dashboard from my financial data&rdquo;
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold text-white/90 mb-6">Data Apps</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {apps.map((app) => {
          const cfg = TYPE_CONFIG[app.appType] ?? { label: app.appType, tone: "bg-white/10 text-white/70" };
          return (
            <div key={app.id} className="wf-panel rounded-2xl p-5 flex flex-col gap-3 group">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/data-apps/${app.id}`}
                  className="text-base font-medium text-white/80 hover:text-white transition-colors leading-snug"
                >
                  {app.title}
                </Link>
                <button
                  onClick={() => handleDelete(app.id)}
                  disabled={pending}
                  className="opacity-0 group-hover:opacity-100 text-xs text-white/30 hover:text-rose-400 transition-all flex-shrink-0"
                >
                  Delete
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${cfg.tone}`}>
                  {cfg.label}
                </span>
                <span className="text-xs text-white/30">{formatDate(app.createdAt)}</span>
              </div>
              {app.sourceContext && (
                <div className="text-xs text-white/30 truncate">Source: {app.sourceContext}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

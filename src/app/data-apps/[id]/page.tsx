import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getDataApp } from "@/lib/data-app-store";
import { DataAppRenderer } from "@/components/data-app-renderer";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  "rack-map": "Rack Map",
  "table": "Data Table",
  "kpi-grid": "KPI Dashboard",
};

export default async function DataAppDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return notFound();

  const { id } = await params;
  const app = await getDataApp(session.userId, id);
  if (!app) return notFound();

  const typeLabel = TYPE_LABELS[app.appType] ?? app.appType;
  const created = new Date(app.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/data-apps"
          className="text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          &larr; Data Apps
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white/90">{app.title}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-white/40">
            <span className="inline-block rounded bg-white/8 px-2 py-0.5 text-xs font-medium text-white/60">
              {typeLabel}
            </span>
            <span>{created}</span>
            {app.sourceContext && <span>Source: {app.sourceContext}</span>}
          </div>
        </div>
      </div>

      <DataAppRenderer app={app} />
    </div>
  );
}

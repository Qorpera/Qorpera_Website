"use client";

import type { DataAppView } from "@/lib/data-app-types";
import type { RackMapData, TableData, KpiGridData } from "@/lib/data-app-types";
import { DataAppRackMap } from "@/components/data-app-rack-map";
import { DataAppTable } from "@/components/data-app-table";
import { DataAppKpiGrid } from "@/components/data-app-kpi-grid";

export function DataAppRenderer({ app }: { app: DataAppView }) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(app.dataJson);
  } catch {
    return (
      <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 p-6 text-sm text-rose-300">
        Failed to parse data app JSON. The data may be corrupted.
      </div>
    );
  }

  switch (app.appType) {
    case "rack-map":
      return <DataAppRackMap data={parsed as RackMapData} />;
    case "table":
      return <DataAppTable data={parsed as TableData} />;
    case "kpi-grid":
      return <DataAppKpiGrid data={parsed as KpiGridData} />;
    default:
      return (
        <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-6 text-sm text-amber-300">
          Unsupported data app type: &ldquo;{app.appType}&rdquo;
        </div>
      );
  }
}

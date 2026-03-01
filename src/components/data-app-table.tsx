"use client";

import { Fragment, useMemo, useState } from "react";
import type { TableData } from "@/lib/data-app-types";

function formatCell(value: unknown, format?: string): string {
  if (value == null) return "—";
  if (format === "currency") {
    const n = typeof value === "number" ? value : parseFloat(String(value));
    return isNaN(n) ? String(value) : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (format === "number") {
    const n = typeof value === "number" ? value : parseFloat(String(value));
    return isNaN(n) ? String(value) : n.toLocaleString("en-US");
  }
  if (format === "date") {
    const d = new Date(String(value));
    return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  return String(value);
}

function BadgeCell({ value }: { value: unknown }) {
  const str = String(value ?? "");
  const toneMap: Record<string, string> = {
    active: "bg-teal-500/15 text-teal-300",
    online: "bg-teal-500/15 text-teal-300",
    healthy: "bg-green-500/15 text-green-300",
    warning: "bg-amber-500/15 text-amber-300",
    error: "bg-rose-500/15 text-rose-300",
    offline: "bg-slate-500/15 text-slate-300",
    maintenance: "bg-rose-500/15 text-rose-300",
    inactive: "bg-slate-500/15 text-slate-300",
  };
  const cls = toneMap[str.toLowerCase()] ?? "bg-white/10 text-white/70";
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{str}</span>;
}

export function DataAppTable({ data }: { data: TableData }) {
  const [sortKey, setSortKey] = useState<string | null>(data.sortByKey ?? null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedRows = useMemo(() => {
    if (!sortKey) return data.rows;
    return [...data.rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data.rows, sortKey, sortDir]);

  const grouped = useMemo(() => {
    if (!data.groupByKey) return null;
    const groups = new Map<string, Record<string, unknown>[]>();
    for (const row of sortedRows) {
      const key = String(row[data.groupByKey] ?? "Other");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
    return groups;
  }, [sortedRows, data.groupByKey]);

  if (!data.columns || data.columns.length === 0) {
    return <div className="wf-muted text-sm py-8 text-center">No columns defined.</div>;
  }

  const alignClass = (a?: string) =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  const renderRows = (rows: Record<string, unknown>[]) =>
    rows.map((row, i) => (
      <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
        {data.columns.map((col) => (
          <td key={col.key} className={`px-3 py-2 text-sm ${alignClass(col.align)}`}>
            {col.format === "badge"
              ? <BadgeCell value={row[col.key]} />
              : <span className="text-white/70">{formatCell(row[col.key], col.format)}</span>}
          </td>
        ))}
      </tr>
    ));

  return (
    <div className="overflow-auto rounded-lg border border-white/[0.06]">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-[rgba(8,12,16,0.9)] backdrop-blur">
          <tr>
            {data.columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2.5 text-xs font-medium text-white/50 uppercase tracking-wider cursor-pointer select-none hover:text-white/70 transition-colors ${alignClass(col.align)}`}
                onClick={() => handleSort(col.key)}
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="ml-1 text-teal-400">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grouped
            ? Array.from(grouped.entries()).map(([group, rows]) => (
                <Fragment key={group}>
                  <tr>
                    <td colSpan={data.columns.length} className="px-3 py-2 text-xs font-semibold text-white/40 bg-white/[0.03] uppercase tracking-wider">
                      {group}
                    </td>
                  </tr>
                  {renderRows(rows)}
                </Fragment>
              ))
            : renderRows(sortedRows)}
        </tbody>
      </table>
    </div>
  );
}


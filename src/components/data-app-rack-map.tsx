"use client";

import { useState } from "react";
import type { RackMapData, RackMapNode } from "@/lib/data-app-types";

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  online: { bg: "bg-teal-500/20", border: "border-teal-400/40", text: "text-teal-300" },
  offline: { bg: "bg-slate-500/20", border: "border-slate-400/30", text: "text-slate-400" },
  warning: { bg: "bg-amber-500/20", border: "border-amber-400/40", text: "text-amber-300" },
  maintenance: { bg: "bg-rose-500/20", border: "border-rose-400/40", text: "text-rose-300" },
};

const U_HEIGHT = 24;

function NodeBlock({ node, totalUnits }: { node: RackMapNode; totalUnits: number }) {
  const [hovered, setHovered] = useState(false);
  const colors = STATUS_COLORS[node.status] ?? STATUS_COLORS.offline;
  const top = (totalUnits - node.rackUnit - node.heightUnits + 1) * U_HEIGHT;
  const height = node.heightUnits * U_HEIGHT;

  return (
    <div
      className={`absolute left-8 right-1 ${colors.bg} ${colors.border} border rounded transition-all ${hovered ? "z-10 ring-1 ring-white/20" : ""}`}
      style={{ top, height }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`px-2 py-0.5 text-xs font-medium truncate ${colors.text}`}>
        {node.label}
      </div>
      {hovered && node.specs && (
        <div className="absolute left-full top-0 ml-2 z-20 rounded-lg border border-white/10 bg-[rgba(8,12,16,0.95)] px-3 py-2 text-xs text-white/70 whitespace-nowrap shadow-xl">
          <div className="font-medium text-white/90 mb-1">{node.label}</div>
          <div>{node.specs}</div>
          <div className="mt-1">
            <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${colors.bg} ${colors.text}`}>
              {node.status}
            </span>
            {node.tags?.map((tag) => (
              <span key={tag} className="ml-1 inline-block rounded bg-white/8 px-1.5 py-0.5 text-[10px] text-white/50">
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-1 text-white/40">U{node.rackUnit}{node.heightUnits > 1 ? `–U${node.rackUnit + node.heightUnits - 1}` : ""}</div>
        </div>
      )}
    </div>
  );
}

export function DataAppRackMap({ data }: { data: RackMapData }) {
  if (!data.racks || data.racks.length === 0) {
    return <div className="wf-muted text-sm py-8 text-center">No racks to display.</div>;
  }

  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {data.racks.map((rack) => (
        <div key={rack.id} className="flex-shrink-0">
          <div className="text-sm font-medium text-white/80 mb-2">{rack.label}</div>
          <div
            className="relative border border-white/10 rounded-lg bg-white/[0.02] overflow-hidden"
            style={{ width: 260, height: rack.totalUnits * U_HEIGHT }}
          >
            {/* U slot grid lines */}
            {Array.from({ length: rack.totalUnits }, (_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 border-b border-white/[0.04] flex items-center"
                style={{ top: i * U_HEIGHT, height: U_HEIGHT }}
              >
                <span className="w-7 text-right pr-1 text-[9px] tabular-nums text-white/20 select-none">
                  {rack.totalUnits - i}
                </span>
              </div>
            ))}
            {/* Nodes */}
            {rack.nodes.map((node) => (
              <NodeBlock key={node.id} node={node} totalUnits={rack.totalUnits} />
            ))}
          </div>
          <div className="mt-2 flex gap-3 text-[10px] text-white/40">
            <span>{rack.nodes.length} devices</span>
            <span>{rack.totalUnits}U total</span>
          </div>
        </div>
      ))}
    </div>
  );
}

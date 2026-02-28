"use client";

import type { WorkflowNodeType } from "@/lib/workflow-types";
import { NODE_TYPE_META } from "@/lib/workflow-types";

type NodeInfo = {
  id: string;
  type: WorkflowNodeType;
  label: string;
  config: Record<string, unknown>;
};

type Props = {
  node: NodeInfo;
  onUpdate: (updates: { label?: string; config?: Record<string, unknown> }) => void;
  onClose: () => void;
  onDelete: () => void;
};

const AGENT_KINDS = [
  "ASSISTANT", "SALES_REP", "CUSTOMER_SUCCESS", "MARKETING_COORDINATOR",
  "FINANCE_ANALYST", "OPERATIONS_MANAGER", "EXECUTIVE_ASSISTANT",
  "RESEARCH_ANALYST", "SEO_SPECIALIST",
];

export function WorkflowNodeConfig({ node, onUpdate, onClose, onDelete }: Props) {
  const meta = NODE_TYPE_META[node.type];

  function updateConfig(key: string, value: unknown) {
    onUpdate({ config: { ...node.config, [key]: value } });
  }

  return (
    <div className="w-80 border-l border-white/[0.07] bg-[rgba(10,14,20,0.98)] p-5 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color }} />
          <h3 className="text-sm font-semibold text-white/90">{meta.label}</h3>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white/60 text-xs">
          Close
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-white/40 block mb-1">Label</label>
          <input
            type="text"
            value={node.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white/80 outline-none focus:border-teal-500/40"
          />
        </div>

        {node.type === "agent_action" && (
          <>
            <div>
              <label className="text-xs text-white/40 block mb-1">Agent</label>
              <select
                value={String(node.config.agentKind ?? "ASSISTANT")}
                onChange={(e) => updateConfig("agentKind", e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white/80 outline-none"
              >
                {AGENT_KINDS.map((k) => (
                  <option key={k} value={k}>{k.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">Task Title</label>
              <input
                type="text"
                value={String(node.config.title ?? "")}
                onChange={(e) => updateConfig("title", e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white/80 outline-none focus:border-teal-500/40"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">Instructions</label>
              <textarea
                value={String(node.config.instructions ?? "")}
                onChange={(e) => updateConfig("instructions", e.target.value)}
                rows={5}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white/80 outline-none focus:border-teal-500/40 resize-y"
              />
            </div>
          </>
        )}

        {node.type === "condition" && (
          <>
            <div>
              <label className="text-xs text-white/40 block mb-1">Field (JSON key, leave blank for full output)</label>
              <input
                type="text"
                value={String(node.config.field ?? "")}
                onChange={(e) => updateConfig("field", e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white/80 outline-none focus:border-teal-500/40"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">Operator</label>
              <select
                value={String(node.config.operator ?? "equals")}
                onChange={(e) => updateConfig("operator", e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white/80 outline-none"
              >
                <option value="equals">Equals</option>
                <option value="not_equals">Not Equals</option>
                <option value="contains">Contains</option>
                <option value="not_contains">Not Contains</option>
                <option value="greater_than">Greater Than</option>
                <option value="less_than">Less Than</option>
                <option value="is_empty">Is Empty</option>
                <option value="is_not_empty">Is Not Empty</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">Value</label>
              <input
                type="text"
                value={String(node.config.value ?? "")}
                onChange={(e) => updateConfig("value", e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white/80 outline-none focus:border-teal-500/40"
              />
            </div>
          </>
        )}

        {node.type === "delay" && (
          <div>
            <label className="text-xs text-white/40 block mb-1">Delay (seconds)</label>
            <input
              type="number"
              value={Math.round(Number(node.config.delayMs ?? 0) / 1000)}
              onChange={(e) => updateConfig("delayMs", Number(e.target.value) * 1000)}
              min={0}
              max={86400}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white/80 outline-none focus:border-teal-500/40"
            />
          </div>
        )}

        {node.type === "output" && (
          <>
            <div>
              <label className="text-xs text-white/40 block mb-1">Format</label>
              <select
                value={String(node.config.format ?? "text")}
                onChange={(e) => updateConfig("format", e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white/80 outline-none"
              >
                <option value="text">Plain Text</option>
                <option value="json">JSON</option>
                <option value="pdf">PDF Report</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">Destination</label>
              <select
                value={String(node.config.destination ?? "log")}
                onChange={(e) => updateConfig("destination", e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white/80 outline-none"
              >
                <option value="log">Business Log</option>
                <option value="email">Email</option>
                <option value="slack">Slack</option>
              </select>
            </div>
          </>
        )}

        <div className="pt-4 border-t border-white/[0.06]">
          <button
            onClick={onDelete}
            className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
          >
            Delete Node
          </button>
        </div>
      </div>
    </div>
  );
}

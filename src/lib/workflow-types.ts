/**
 * Workflow graph types for the visual workflow builder.
 * Nodes represent steps (triggers, actions, conditions, etc.)
 * Edges represent transitions between steps.
 */

export type WorkflowNodeType =
  | "trigger_schedule"
  | "trigger_webhook"
  | "trigger_manual"
  | "trigger_event"
  | "agent_action"
  | "condition"
  | "delay"
  | "output"
  | "parallel_split"
  | "parallel_join";

export type WorkflowNode = {
  id: string;
  type: WorkflowNodeType;
  label: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
};

export type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  conditionBranch?: "true" | "false";
};

export type WorkflowGraph = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export type NodeRunState = {
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  startedAt?: string;
  completedAt?: string;
  output?: string;
  error?: string;
  taskId?: string;
};

export type WorkflowView = {
  id: string;
  name: string;
  description: string;
  status: string;
  version: number;
  templateSlug: string | null;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowRunView = {
  id: string;
  workflowId: string;
  status: string;
  nodeStates: Record<string, NodeRunState>;
  triggerPayload: unknown;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
};

export const NODE_TYPE_META: Record<WorkflowNodeType, { label: string; color: string; category: "trigger" | "action" | "control" }> = {
  trigger_schedule: { label: "Schedule Trigger", color: "#6366f1", category: "trigger" },
  trigger_webhook: { label: "Webhook Trigger", color: "#6366f1", category: "trigger" },
  trigger_manual: { label: "Manual Trigger", color: "#6366f1", category: "trigger" },
  trigger_event: { label: "Event Trigger", color: "#6366f1", category: "trigger" },
  agent_action: { label: "Agent Action", color: "#14b8a6", category: "action" },
  condition: { label: "Condition", color: "#f59e0b", category: "control" },
  delay: { label: "Delay", color: "#8b5cf6", category: "control" },
  output: { label: "Output", color: "#10b981", category: "action" },
  parallel_split: { label: "Parallel Split", color: "#ec4899", category: "control" },
  parallel_join: { label: "Parallel Join", color: "#ec4899", category: "control" },
};

// Shared types for the agent optimizer system

export const AGENT_ROTATION = [
  "CHIEF_ADVISOR",
  "ASSISTANT",
  "SALES_REP",
  "CUSTOMER_SUCCESS",
  "MARKETING_COORDINATOR",
  "FINANCE_ANALYST",
  "OPERATIONS_MANAGER",
  "EXECUTIVE_ASSISTANT",
  "RESEARCH_ANALYST",
] as const;

export type RotationAgent = (typeof AGENT_ROTATION)[number];

export type ResearchFinding = {
  topic: string;
  technique: string;
  source: string;
  keyInsights: string[];
  applicability: "high" | "medium" | "low";
  url?: string;
};

export type ScoreDimension = {
  name: string;
  label: string;
  score: number; // 0–100
  rationale: string;
  evidence?: string;
};

// ── Action types ────────────────────────────────────────────────

export type PromptPatchAction = {
  type: "prompt_patch";
  id: string;
  priority: "high" | "medium" | "low";
  dimension: string;
  issue: string;
  researchBasis: string;
  sectionHeader: string; // e.g. "REASONING_PROTOCOL"
  content: string;       // body of the patch (appended after header)
};

export type SoulAdditionAction = {
  type: "soul_addition";
  id: string;
  priority: "high" | "medium" | "low";
  field: "coreTruth" | "boundary";
  issue: string;
  researchBasis: string;
  content: string; // the truth or boundary text to add
};

export type AutomationConfigAction = {
  type: "automation_config";
  id: string;
  priority: "high" | "medium" | "low";
  field:
    | "maxLoopIterations"
    | "maxRuntimeSeconds"
    | "maxAgentCallsPerRun"
    | "requireApprovalForExternalActions"
    | "allowAgentDelegation"
    | "maxToolRetries";
  recommendedValue: number | boolean;
  issue: string;
  researchBasis: string;
};

export type MemorySeedAction = {
  type: "memory_seed";
  id: string;
  priority: "high" | "medium" | "low";
  topic: string;
  title: string;
  content: string;
  importance: number; // 1–10
  issue: string;
  researchBasis: string;
};

export type OptimizationAction =
  | PromptPatchAction
  | SoulAdditionAction
  | AutomationConfigAction
  | MemorySeedAction;

// ── Cycle result ─────────────────────────────────────────────────

export type OptimizationCycleResult = {
  research: ResearchFinding[];
  synthesis: string;
  overallScore: number;
  dimensions: ScoreDimension[];
  actions: OptimizationAction[];
};

export const SCORE_DIMENSIONS = [
  { name: "reasoning_chain",      label: "Reasoning Chain" },
  { name: "uncertainty_handling", label: "Uncertainty Handling" },
  { name: "context_utilization",  label: "Context Utilization" },
  { name: "delegation_precision", label: "Delegation Precision" },
  { name: "grounding_strength",   label: "Grounding Strength" },
  { name: "output_quality",       label: "Output Quality" },
  { name: "tool_guidance",        label: "Tool Guidance" },
  { name: "communication_style",  label: "Communication Style" },
] as const;

// Agent-specific context for the analyzer
export type AgentContext = {
  agentKind: RotationAgent;
  agentName: string;
  role: string;
  currentSoulTruths: string[];
  currentBoundaries: string[];
  currentConfig: {
    maxLoopIterations: number;
    maxRuntimeSeconds: number;
    maxAgentCallsPerRun: number;
    requireApprovalForExternalActions: boolean;
    allowAgentDelegation: boolean;
    maxToolRetries: number;
  };
};

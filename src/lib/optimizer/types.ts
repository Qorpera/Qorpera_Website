// Shared types for the agent optimizer system

export type ResearchFinding = {
  topic: string;
  technique: string;
  source: string; // paper/article citation
  keyInsights: string[];
  applicability: "high" | "medium" | "low";
  url?: string;
};

export type ScoreDimension = {
  name: string;
  label: string;
  score: number; // 0–100
  rationale: string;
  evidence?: string; // quote from current prompt
};

export type OptimizationImprovement = {
  id: string;
  dimension: string;
  priority: "high" | "medium" | "low";
  issue: string;
  recommendation: string;
  researchBasis: string;
  promptPatch: string; // exact text to append to system prompt
};

export type OptimizationCycleResult = {
  research: ResearchFinding[];
  synthesis: string;
  overallScore: number;
  dimensions: ScoreDimension[];
  improvements: OptimizationImprovement[];
};

export const SCORE_DIMENSIONS = [
  { name: "reasoning_chain", label: "Reasoning Chain" },
  { name: "uncertainty_handling", label: "Uncertainty Handling" },
  { name: "context_utilization", label: "Context Utilization" },
  { name: "delegation_precision", label: "Delegation Precision" },
  { name: "grounding_strength", label: "Grounding Strength" },
  { name: "output_quality", label: "Output Quality" },
  { name: "tool_guidance", label: "Tool Guidance" },
  { name: "communication_style", label: "Communication Style" },
] as const;

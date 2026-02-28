// Client-safe — no server/Node.js imports.
// Hardcoded catalog of feature flag keys and their human-readable labels.

export type FlagCatalogEntry = {
  key: string;
  label: string;
  description?: string;
};

export const FLAG_CATALOG: FlagCatalogEntry[] = [
  {
    key: "BETA_OPTIMIZER",
    label: "Agent Optimizer (Beta)",
    description: "Enable the AI agent optimizer with research + prompt patching.",
  },
  {
    key: "RUNNER_ENABLED",
    label: "Local Runner Nodes",
    description: "Show the runner node registration and approval workflow.",
  },
  {
    key: "METRICS_CLOUD_SAVINGS",
    label: "Metrics: Cloud Savings Panel",
    description: "Show the hero savings panel on the metrics dashboard.",
  },
  {
    key: "EARLY_ACCESS_FEATURES",
    label: "Early Access",
    description: "Grant access to unreleased features for beta testers.",
  },
  {
    key: "MULTI_AGENT_PROJECTS",
    label: "Multi-agent Projects",
    description: "Enable the multi-agent project orchestration UI.",
  },
];

export function getFlagLabel(key: string): string {
  return FLAG_CATALOG.find((f) => f.key === key)?.label ?? key;
}

/**
 * Memory categories for the agent memory system.
 * Each category helps with relevance-based retrieval.
 */

export type MemoryCategory =
  | "preference"
  | "decision"
  | "relationship"
  | "process"
  | "feedback"
  | "task_outcome"
  | "general";

export const MEMORY_CATEGORIES: Record<MemoryCategory, { label: string; description: string }> = {
  preference: { label: "Preference", description: "User preferences, style guidelines, and recurring instructions" },
  decision: { label: "Decision", description: "Key decisions made, rationale, and outcomes" },
  relationship: { label: "Relationship", description: "Contact details, interaction history, key stakeholders" },
  process: { label: "Process", description: "Standard operating procedures, workflows, recurring patterns" },
  feedback: { label: "Feedback", description: "User feedback on submissions, corrections, and quality signals" },
  task_outcome: { label: "Task Outcome", description: "Results and learnings from completed tasks" },
  general: { label: "General", description: "Miscellaneous memories that don't fit other categories" },
};

export function isValidCategory(cat: string): cat is MemoryCategory {
  return cat in MEMORY_CATEGORIES;
}

export function inferCategory(topic: string, content: string): MemoryCategory {
  const text = `${topic} ${content}`.toLowerCase();
  if (text.includes("feedback") || text.includes("revision") || text.includes("correction") || text.includes("rating")) return "feedback";
  if (text.includes("decision") || text.includes("decided") || text.includes("chose") || text.includes("approved")) return "decision";
  if (text.includes("prefer") || text.includes("always") || text.includes("never") || text.includes("style")) return "preference";
  if (text.includes("contact") || text.includes("stakeholder") || text.includes("client") || text.includes("relationship")) return "relationship";
  if (text.includes("process") || text.includes("workflow") || text.includes("procedure") || text.includes("sop")) return "process";
  if (text.includes("completed") || text.includes("outcome") || text.includes("result") || text.includes("task")) return "task_outcome";
  return "general";
}

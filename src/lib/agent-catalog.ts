// Client-safe catalog — no server/Node.js imports.
// Keep this file free of Prisma, fs, or any server-only dependencies.

export type HireAgentKind = "ASSISTANT" | "PROJECT_MANAGER";
export type HireSchedule = "DAILY" | "WEEKLY" | "MONTHLY";

export type AgentHireCatalogItem = {
  kind: HireAgentKind;
  title: string;
  subtitle: string;
  summary: string;
  recurringCents: Record<HireSchedule, number>;
  recurringPrices: Record<HireSchedule, string>;
};

export const AGENT_HIRE_CATALOG: AgentHireCatalogItem[] = [
  {
    kind: "ASSISTANT",
    title: "Assistant Agent",
    subtitle: "Support + operations execution",
    summary: "Handles triage, drafts outbound communication, and keeps routine work moving with approval gates.",
    recurringCents: { DAILY: 1500, WEEKLY: 9000, MONTHLY: 25000 },
    recurringPrices: { DAILY: "15 kr/day", WEEKLY: "90 kr/wk", MONTHLY: "250 kr/mo" },
  },
  {
    kind: "PROJECT_MANAGER",
    title: "Project Manager Agent",
    subtitle: "Planning + tracking + reporting",
    summary: "Plans work, tracks deliverables, prepares updates, and keeps projects unblocked across teams.",
    recurringCents: { DAILY: 2500, WEEKLY: 15000, MONTHLY: 42000 },
    recurringPrices: { DAILY: "TBD", WEEKLY: "TBD", MONTHLY: "TBD" },
  },
];

export function getHireCatalogItem(kind: HireAgentKind) {
  return AGENT_HIRE_CATALOG.find((item) => item.kind === kind) ?? null;
}

export function getHiredJobTitle(kind: HireAgentKind) {
  const item = getHireCatalogItem(kind);
  return item ? `${item.title} (Purchased)` : `${kind.replaceAll("_", " ")} (Purchased)`;
}

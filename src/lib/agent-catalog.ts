// Client-safe catalog — no server/Node.js imports.
// Keep this file free of Prisma, fs, or any server-only dependencies.

export type HireAgentKind =
  | "ASSISTANT"
  | "PROJECT_MANAGER"
  | "SALES_REP"
  | "CUSTOMER_SUCCESS"
  | "MARKETING_COORDINATOR"
  | "FINANCE_ANALYST"
  | "OPERATIONS_MANAGER"
  | "EXECUTIVE_ASSISTANT";

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
  {
    kind: "SALES_REP",
    title: "Sales Rep Agent",
    subtitle: "Prospecting + outreach + pipeline",
    summary: "Researches and qualifies prospects, drafts personalized outreach sequences, and keeps your CRM updated — all with approval before sending.",
    recurringCents: { DAILY: 1800, WEEKLY: 11000, MONTHLY: 35000 },
    recurringPrices: { DAILY: "18 kr/day", WEEKLY: "110 kr/wk", MONTHLY: "350 kr/mo" },
  },
  {
    kind: "CUSTOMER_SUCCESS",
    title: "Customer Success Agent",
    subtitle: "Health monitoring + renewals + check-ins",
    summary: "Monitors customer health signals, drafts check-in and renewal outreach, and flags at-risk accounts before they churn.",
    recurringCents: { DAILY: 1600, WEEKLY: 10000, MONTHLY: 30000 },
    recurringPrices: { DAILY: "16 kr/day", WEEKLY: "100 kr/wk", MONTHLY: "300 kr/mo" },
  },
  {
    kind: "MARKETING_COORDINATOR",
    title: "Marketing Coordinator Agent",
    subtitle: "Content + campaigns + performance",
    summary: "Drafts content and email campaigns, summarizes performance data, and manages your content calendar — ready for your approval before anything goes live.",
    recurringCents: { DAILY: 1600, WEEKLY: 10000, MONTHLY: 30000 },
    recurringPrices: { DAILY: "16 kr/day", WEEKLY: "100 kr/wk", MONTHLY: "300 kr/mo" },
  },
  {
    kind: "FINANCE_ANALYST",
    title: "Finance Analyst Agent",
    subtitle: "Reports + reconciliation + invoicing",
    summary: "Prepares financial reports, categorizes expenses, flags anomalies, and drafts invoices — everything reviewed before it leaves the system.",
    recurringCents: { DAILY: 2000, WEEKLY: 12000, MONTHLY: 38000 },
    recurringPrices: { DAILY: "20 kr/day", WEEKLY: "120 kr/wk", MONTHLY: "380 kr/mo" },
  },
  {
    kind: "OPERATIONS_MANAGER",
    title: "Operations Manager Agent",
    subtitle: "SOPs + vendor comms + process ops",
    summary: "Maintains process documentation, coordinates vendor communications, and surfaces operational blockers before they become problems.",
    recurringCents: { DAILY: 1700, WEEKLY: 10500, MONTHLY: 32000 },
    recurringPrices: { DAILY: "17 kr/day", WEEKLY: "105 kr/wk", MONTHLY: "320 kr/mo" },
  },
  {
    kind: "EXECUTIVE_ASSISTANT",
    title: "Executive Assistant Agent",
    subtitle: "Inbox + briefings + action tracking",
    summary: "Triages your inbox, prepares meeting briefs and agendas, and tracks open action items — so nothing falls through the cracks.",
    recurringCents: { DAILY: 1500, WEEKLY: 9000, MONTHLY: 25000 },
    recurringPrices: { DAILY: "15 kr/day", WEEKLY: "90 kr/wk", MONTHLY: "250 kr/mo" },
  },
];

export function getHireCatalogItem(kind: HireAgentKind) {
  return AGENT_HIRE_CATALOG.find((item) => item.kind === kind) ?? null;
}

export function getHiredJobTitle(kind: HireAgentKind) {
  const item = getHireCatalogItem(kind);
  return item ? `${item.title} (Purchased)` : `${kind.replaceAll("_", " ")} (Purchased)`;
}

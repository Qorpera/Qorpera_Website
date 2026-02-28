// Client-safe catalog — no server/Node.js imports.
// Keep this file free of Prisma, fs, or any server-only dependencies.

export type HireAgentKind =
  | "ASSISTANT"
  | "SALES_REP"
  | "CUSTOMER_SUCCESS"
  | "MARKETING_COORDINATOR"
  | "FINANCE_ANALYST"
  | "OPERATIONS_MANAGER"
  | "EXECUTIVE_ASSISTANT"
  | "RESEARCH_ANALYST"
  | "SEO_SPECIALIST";

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
    title: "Support Team",
    subtitle: "Triage + drafts + customer communications",
    summary: "A coordinated support team that handles inbound triage, drafts outbound communications, and keeps routine work moving — with approval gates before anything goes out.",
    recurringCents: { DAILY: 1500, WEEKLY: 9000, MONTHLY: 25000 },
    recurringPrices: { DAILY: "15 kr/day", WEEKLY: "90 kr/wk", MONTHLY: "250 kr/mo" },
  },
  {
    kind: "SALES_REP",
    title: "Sales Team",
    subtitle: "Prospecting + outreach + pipeline",
    summary: "A dedicated sales team that researches and qualifies prospects, drafts personalized outreach sequences, and keeps your CRM updated — all with approval before sending.",
    recurringCents: { DAILY: 1800, WEEKLY: 11000, MONTHLY: 35000 },
    recurringPrices: { DAILY: "18 kr/day", WEEKLY: "110 kr/wk", MONTHLY: "350 kr/mo" },
  },
  {
    kind: "CUSTOMER_SUCCESS",
    title: "Customer Success Team",
    subtitle: "Health monitoring + renewals + check-ins",
    summary: "A customer success team that monitors health signals, drafts check-in and renewal outreach, and flags at-risk accounts before they churn.",
    recurringCents: { DAILY: 1600, WEEKLY: 10000, MONTHLY: 30000 },
    recurringPrices: { DAILY: "16 kr/day", WEEKLY: "100 kr/wk", MONTHLY: "300 kr/mo" },
  },
  {
    kind: "MARKETING_COORDINATOR",
    title: "Marketing Team",
    subtitle: "Content + campaigns + performance",
    summary: "A marketing team that drafts content and email campaigns, summarizes performance data, and manages your content calendar — ready for your approval before anything goes live.",
    recurringCents: { DAILY: 1600, WEEKLY: 10000, MONTHLY: 30000 },
    recurringPrices: { DAILY: "16 kr/day", WEEKLY: "100 kr/wk", MONTHLY: "300 kr/mo" },
  },
  {
    kind: "FINANCE_ANALYST",
    title: "Finance Team",
    subtitle: "Reports + reconciliation + invoicing",
    summary: "A finance team that prepares financial reports, categorizes expenses, flags anomalies, and drafts invoices — everything reviewed before it leaves the system.",
    recurringCents: { DAILY: 2000, WEEKLY: 12000, MONTHLY: 38000 },
    recurringPrices: { DAILY: "20 kr/day", WEEKLY: "120 kr/wk", MONTHLY: "380 kr/mo" },
  },
  {
    kind: "OPERATIONS_MANAGER",
    title: "Operations Team",
    subtitle: "SOPs + vendor comms + process ops",
    summary: "An operations team that maintains process documentation, coordinates vendor communications, and surfaces blockers before they become problems.",
    recurringCents: { DAILY: 1700, WEEKLY: 10500, MONTHLY: 32000 },
    recurringPrices: { DAILY: "17 kr/day", WEEKLY: "105 kr/wk", MONTHLY: "320 kr/mo" },
  },
  {
    kind: "EXECUTIVE_ASSISTANT",
    title: "Executive Support Team",
    subtitle: "Inbox + briefings + action tracking",
    summary: "A dedicated executive support team that triages your inbox, prepares meeting briefs and agendas, and tracks open action items — so nothing falls through the cracks.",
    recurringCents: { DAILY: 1500, WEEKLY: 9000, MONTHLY: 25000 },
    recurringPrices: { DAILY: "15 kr/day", WEEKLY: "90 kr/wk", MONTHLY: "250 kr/mo" },
  },
  {
    kind: "RESEARCH_ANALYST",
    title: "Research Team",
    subtitle: "Deep research + validation + reports",
    summary: "A research team that searches the web, cross-validates findings, and produces structured reports — with cloud-model quality checks before anything is finalized.",
    recurringCents: { DAILY: 2000, WEEKLY: 12000, MONTHLY: 38000 },
    recurringPrices: { DAILY: "20 kr/day", WEEKLY: "120 kr/wk", MONTHLY: "380 kr/mo" },
  },
  {
    kind: "SEO_SPECIALIST",
    title: "SEO Team",
    subtitle: "Audits + keyword research + content briefs",
    summary: "An SEO team that audits pages, researches keywords, monitors rankings, and produces optimized content briefs — everything reviewed before publishing.",
    recurringCents: { DAILY: 1800, WEEKLY: 11000, MONTHLY: 35000 },
    recurringPrices: { DAILY: "18 kr/day", WEEKLY: "110 kr/wk", MONTHLY: "350 kr/mo" },
  },
];

export function getHireCatalogItem(kind: HireAgentKind) {
  return AGENT_HIRE_CATALOG.find((item) => item.kind === kind) ?? null;
}

export function getHiredJobTitle(kind: HireAgentKind) {
  const item = getHireCatalogItem(kind);
  return item ? `${item.title} (Purchased)` : `${kind.replaceAll("_", " ")} (Purchased)`;
}

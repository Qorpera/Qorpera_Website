import type { BusinessFileCategory } from "@prisma/client";

export type ExpectedFileEntry = {
  id: string;
  label: string;
  description: string;
  category: BusinessFileCategory;
  impact: "critical" | "high" | "medium";
  exampleFormats: string[];
  matchKeywords: string[];
};

export const EXPECTED_BUSINESS_FILES: ExpectedFileEntry[] = [
  {
    id: "team-roster",
    label: "Team roster / org chart",
    description: "Who works here, their roles, and how teams are structured.",
    category: "OPERATIONS",
    impact: "critical",
    exampleFormats: ["CSV", "XLSX", "PDF"],
    matchKeywords: ["team", "roster", "org", "chart", "employee", "staff", "directory", "headcount", "personnel"],
  },
  {
    id: "pricing",
    label: "Pricing / rate card",
    description: "Current pricing, packages, and rate structures.",
    category: "SALES",
    impact: "critical",
    exampleFormats: ["PDF", "XLSX", "DOCX"],
    matchKeywords: ["pricing", "price", "rate", "card", "tariff", "fee", "package", "tier"],
  },
  {
    id: "customer-list",
    label: "Customer list / CRM export",
    description: "Active customers, segments, and contact information.",
    category: "SALES",
    impact: "critical",
    exampleFormats: ["CSV", "XLSX"],
    matchKeywords: ["customer", "client", "crm", "account", "contact", "lead"],
  },
  {
    id: "sops",
    label: "Standard operating procedures",
    description: "Step-by-step processes agents can follow as instructions.",
    category: "OPERATIONS",
    impact: "high",
    exampleFormats: ["PDF", "DOCX", "MD"],
    matchKeywords: ["sop", "procedure", "process", "playbook", "runbook", "workflow", "guideline"],
  },
  {
    id: "financials",
    label: "Financial summary / P&L",
    description: "Profit & loss, budget, or financial overview for agent reference.",
    category: "FINANCIAL",
    impact: "high",
    exampleFormats: ["XLSX", "PDF", "CSV"],
    matchKeywords: ["financial", "finance", "p&l", "profit", "loss", "budget", "revenue", "income", "expense", "balance"],
  },
  {
    id: "product-catalog",
    label: "Product / service catalog",
    description: "What you sell, features, and descriptions agents can reference.",
    category: "SALES",
    impact: "high",
    exampleFormats: ["PDF", "XLSX", "DOCX"],
    matchKeywords: ["product", "service", "catalog", "catalogue", "offering", "menu", "inventory"],
  },
  {
    id: "brand-guidelines",
    label: "Brand & messaging guidelines",
    description: "Voice, tone, and messaging rules for customer-facing content.",
    category: "MARKETING",
    impact: "high",
    exampleFormats: ["PDF", "DOCX"],
    matchKeywords: ["brand", "messaging", "guideline", "voice", "tone", "style", "identity"],
  },
  {
    id: "contracts",
    label: "Contract / agreement templates",
    description: "Standard contracts and agreements for legal reference.",
    category: "LEGAL",
    impact: "medium",
    exampleFormats: ["PDF", "DOCX"],
    matchKeywords: ["contract", "agreement", "template", "terms", "nda", "msa", "sla", "legal"],
  },
  {
    id: "meeting-notes",
    label: "Recent meeting notes / decisions",
    description: "Key decisions and action items from recent meetings.",
    category: "COLLABORATION",
    impact: "medium",
    exampleFormats: ["PDF", "DOCX", "MD", "TXT"],
    matchKeywords: ["meeting", "notes", "minutes", "decision", "action", "recap", "standup", "retro"],
  },
  {
    id: "kpi-metrics",
    label: "KPI tracking / metrics export",
    description: "Performance data agents can reference in reports.",
    category: "OPERATIONS",
    impact: "medium",
    exampleFormats: ["CSV", "XLSX", "PDF"],
    matchKeywords: ["kpi", "metric", "dashboard", "tracking", "performance", "analytics", "report", "scorecard"],
  },
];

export type ExpectedFileStatus = {
  entry: ExpectedFileEntry;
  satisfied: boolean;
  matchedFile: { id: string; name: string } | null;
};

export function checkExpectedFiles(
  existingFiles: Array<{ id: string; name: string; category: string }>,
): ExpectedFileStatus[] {
  return EXPECTED_BUSINESS_FILES.map((entry) => {
    const match = existingFiles.find((file) => {
      if (file.category === entry.category) {
        const lower = file.name.toLowerCase();
        return entry.matchKeywords.some((kw) => lower.includes(kw));
      }
      return false;
    });

    return {
      entry,
      satisfied: !!match,
      matchedFile: match ? { id: match.id, name: match.name } : null,
    };
  });
}

export function getExpectedFileSummary(statuses: ExpectedFileStatus[]) {
  const total = statuses.length;
  const satisfied = statuses.filter((s) => s.satisfied).length;
  const missing = total - satisfied;
  const criticalMissing = statuses.filter((s) => !s.satisfied && s.entry.impact === "critical").length;
  return { total, satisfied, missing, criticalMissing };
}

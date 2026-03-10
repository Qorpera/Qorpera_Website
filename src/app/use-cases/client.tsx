"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const SilentChurn = dynamic(
  () => import("@/components/use-cases/silent-churn"),
  { ssr: false },
);
const QuietDeadline = dynamic(
  () => import("@/components/use-cases/quiet-deadline"),
  { ssr: false },
);
const KnowledgeSilo = dynamic(
  () => import("@/components/use-cases/knowledge-silo"),
  { ssr: false },
);
const SalesApproach = dynamic(
  () => import("@/components/use-cases/sales-approach"),
  { ssr: false },
);
const BudgetBlindspot = dynamic(
  () => import("@/components/use-cases/budget-blindspot"),
  { ssr: false },
);
const UnnecessaryMeeting = dynamic(
  () => import("@/components/use-cases/unnecessary-meeting"),
  { ssr: false },
);
const DuplicateInitiative = dynamic(
  () => import("@/components/use-cases/duplicate-initiative"),
  { ssr: false },
);
const ReportNobodyReads = dynamic(
  () => import("@/components/use-cases/report-nobody-reads"),
  { ssr: false },
);
const ProposalContext = dynamic(
  () => import("@/components/use-cases/proposal-context"),
  { ssr: false },
);
const QuarterlyReview = dynamic(
  () => import("@/components/use-cases/quarterly-review"),
  { ssr: false },
);
const Handoff = dynamic(
  () => import("@/components/use-cases/handoff"),
  { ssr: false },
);
const Bottleneck = dynamic(
  () => import("@/components/use-cases/bottleneck"),
  { ssr: false },
);
const PerfectBrief = dynamic(
  () => import("@/components/use-cases/perfect-brief"),
  { ssr: false },
);

const USE_CASES = [
  {
    id: "unnecessary-meeting",
    label: "Unnecessary Meeting",
    category: "Collaboration",
    color: "#f59e0b",
    summary:
      "6 people, 1 hour — for a decision that was already made in a Slack thread nobody remembered to share.",
  },
  {
    id: "budget-blindspot",
    label: "Budget Blindspot",
    category: "Finance",
    color: "#f59e0b",
    summary:
      "Q2 budget is locked and approved. But commitments are being made in emails and docs that haven't hit the books.",
  },
  {
    id: "silent-churn",
    label: "Silent Churn",
    category: "Customer Success",
    color: "#ef4444",
    summary:
      "A customer walking away — detected by reading the signals humans miss across email, meetings, support, and billing.",
  },
  {
    id: "bottleneck",
    label: "Hidden Bottleneck",
    category: "Operations",
    color: "#ef4444",
    summary:
      "One person is the approval gate on 12 workflows. Everything waits. Nobody knows why things are slow.",
  },
  {
    id: "perfect-brief",
    label: "The Perfect Brief",
    category: "Meeting Quality",
    color: "#22c55e",
    summary:
      "Before every important meeting, the AI prepares a brief with everything you need to know — in 30 seconds.",
  },
  {
    id: "report-nobody-reads",
    label: "Report Nobody Reads",
    category: "Workflow",
    color: "#ef4444",
    summary:
      "4 hours every Friday. Beautifully formatted report. Opened by one person: the author.",
  },
  {
    id: "duplicate-initiative",
    label: "Duplicate Initiative",
    category: "Cross-Team",
    color: "#6366f1",
    summary:
      "Two teams building the same thing. Neither knows the other exists. Tens of thousands about to be wasted.",
  },
  {
    id: "quiet-deadline",
    label: "Quiet Deadline Miss",
    category: "Project Management",
    color: "#f59e0b",
    summary:
      "The status board says on track. The activity says otherwise. Zero blocked tickets, zero active contributors.",
  },
  {
    id: "knowledge-silo",
    label: "Knowledge Silo",
    category: "Engineering",
    color: "#6366f1",
    summary:
      "One person holds all the context on a critical system. The bus factor is 1 — and the bus is about to leave.",
  },
  {
    id: "sales-approach",
    label: "Wrong Sales Approach",
    category: "Sales",
    color: "#3b82f6",
    summary:
      "The rep is working hard. High activity, low conversion. The problem isn't effort — it's strategy.",
  },
  {
    id: "proposal-context",
    label: "Missed Proposal Context",
    category: "Work Quality",
    color: "#22c55e",
    summary:
      "Sales is drafting a proposal highlighting a feature Engineering is deprecating. The AI knows — the author doesn't.",
  },
  {
    id: "handoff",
    label: "Project Handoff",
    category: "Handoff",
    color: "#3b82f6",
    summary:
      "Projects change hands. Context is lost. The AI has every document, decision, and conversation — the handoff brief writes itself.",
  },
  {
    id: "quarterly-review",
    label: "Quarterly Review",
    category: "Leadership",
    color: "#a855f7",
    summary:
      "Usually takes a week to assemble. The AI already has all the data. From 5 days of gathering to 30 seconds of reviewing.",
  },
] as const;

type UseCaseId = (typeof USE_CASES)[number]["id"];

const COMPONENTS: Record<UseCaseId, React.ComponentType> = {
  "silent-churn": SilentChurn,
  "quiet-deadline": QuietDeadline,
  "knowledge-silo": KnowledgeSilo,
  "sales-approach": SalesApproach,
  "budget-blindspot": BudgetBlindspot,
  "unnecessary-meeting": UnnecessaryMeeting,
  "duplicate-initiative": DuplicateInitiative,
  "report-nobody-reads": ReportNobodyReads,
  "proposal-context": ProposalContext,
  "quarterly-review": QuarterlyReview,
  "handoff": Handoff,
  "bottleneck": Bottleneck,
  "perfect-brief": PerfectBrief,
};

export function UseCasesClient() {
  const [active, setActive] = useState<UseCaseId>("silent-churn");
  const ActiveComponent = COMPONENTS[active];
  const activeCase = USE_CASES.find((u) => u.id === active)!;

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#0a0a1a",
      }}
    >
      {/* Left panel */}
      <div
        style={{
          width: 300,
          flexShrink: 0,
          background: "#08080f",
          borderRight: "1px solid rgba(255,255,255,0.12)",
          display: "flex",
          flexDirection: "column",
          padding: "32px 0",
          overflowY: "auto",
        }}
      >
        {/* Panel header */}
        <div style={{ padding: "0 24px", marginBottom: 28 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#94a3b8",
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 6,
            }}
          >
            Use Cases
          </div>
          <div style={{ fontSize: 14, color: "#e2e8f0", lineHeight: 1.5 }}>
            Select a scenario to see how Qorpera would detect it.
          </div>
        </div>

        {/* Category list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {USE_CASES.map((uc) => {
            const isActive = active === uc.id;
            return (
              <button
                key={uc.id}
                onClick={() => setActive(uc.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  padding: "14px 24px",
                  background: isActive ? "#2563eb10" : "transparent",
                  borderLeft: isActive
                    ? "3px solid #2563eb"
                    : "3px solid transparent",
                  border: "none",
                  borderLeftStyle: "solid",
                  borderLeftWidth: 3,
                  borderLeftColor: isActive ? "#2563eb" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "'JetBrains Mono', monospace",
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                    color: isActive ? "#2563eb" : "#64748b",
                  }}
                >
                  {uc.category}
                </span>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "#ffffff" : "#e2e8f0",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {uc.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active case summary */}
        <div
          style={{
            margin: "auto 24px 0",
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: "#f1f5f9",
              lineHeight: 1.65,
            }}
          >
            {activeCase.summary}
          </div>
        </div>
      </div>

      {/* Video area */}
      <div style={{ flex: 1, position: "relative" }}>
        <div key={active}>
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}

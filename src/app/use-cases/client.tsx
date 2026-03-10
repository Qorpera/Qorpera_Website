"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

/* ── Dynamic imports ── Sales ───────────────────────────────────────── */
const ForgottenFollowup = dynamic(() => import("@/components/use-cases/forgotten-followup"), { ssr: false });
const BrokenPromise = dynamic(() => import("@/components/use-cases/broken-promise"), { ssr: false });
const DealAcceleration = dynamic(() => import("@/components/use-cases/deal-acceleration"), { ssr: false });
const SalesApproach = dynamic(() => import("@/components/use-cases/sales-approach"), { ssr: false });
const ProposalContext = dynamic(() => import("@/components/use-cases/proposal-context"), { ssr: false });
const PhoneSales = dynamic(() => import("@/components/use-cases/phone-sales"), { ssr: false });

/* ── Marketing ──────────────────────────────────────────────────────── */
const CampaignMisfire = dynamic(() => import("@/components/use-cases/campaign-misfire"), { ssr: false });
const BrandDrift = dynamic(() => import("@/components/use-cases/brand-drift"), { ssr: false });
const ContentGap = dynamic(() => import("@/components/use-cases/content-gap"), { ssr: false });
const AttributionBlind = dynamic(() => import("@/components/use-cases/attribution-blind"), { ssr: false });
const LaunchMisalignment = dynamic(() => import("@/components/use-cases/launch-misalignment"), { ssr: false });

/* ── Operations / Production ────────────────────────────────────────── */
const Bottleneck = dynamic(() => import("@/components/use-cases/bottleneck"), { ssr: false });
const ProductReturns = dynamic(() => import("@/components/use-cases/product-returns"), { ssr: false });
const MovingCrew = dynamic(() => import("@/components/use-cases/moving-crew"), { ssr: false });
const ShiftCoverage = dynamic(() => import("@/components/use-cases/shift-coverage"), { ssr: false });
const ProcessDrift = dynamic(() => import("@/components/use-cases/process-drift"), { ssr: false });

/* ── Supply Chain ───────────────────────────────────────────────────── */
const VendorOvercharge = dynamic(() => import("@/components/use-cases/vendor-overcharge"), { ssr: false });
const DeliveryDelay = dynamic(() => import("@/components/use-cases/delivery-delay"), { ssr: false });
const InventoryBlindspot = dynamic(() => import("@/components/use-cases/inventory-blindspot"), { ssr: false });
const SupplierRisk = dynamic(() => import("@/components/use-cases/supplier-risk"), { ssr: false });
const ProcurementDelay = dynamic(() => import("@/components/use-cases/procurement-delay"), { ssr: false });
const WarehouseChaos = dynamic(() => import("@/components/use-cases/warehouse-chaos"), { ssr: false });

/* ── Finance ────────────────────────────────────────────────────────── */
const BudgetBlindspot = dynamic(() => import("@/components/use-cases/budget-blindspot"), { ssr: false });
const InvoiceMismatch = dynamic(() => import("@/components/use-cases/invoice-mismatch"), { ssr: false });
const ExpenseCreep = dynamic(() => import("@/components/use-cases/expense-creep"), { ssr: false });
const CashFlowGap = dynamic(() => import("@/components/use-cases/cash-flow-gap"), { ssr: false });
const AuditSurprise = dynamic(() => import("@/components/use-cases/audit-surprise"), { ssr: false });

/* ── HR ─────────────────────────────────────────────────────────────── */
const EmployeeLeaving = dynamic(() => import("@/components/use-cases/employee-leaving"), { ssr: false });
const OnboardingGap = dynamic(() => import("@/components/use-cases/onboarding-gap"), { ssr: false });
const SkillShortage = dynamic(() => import("@/components/use-cases/skill-shortage"), { ssr: false });
const CultureDrift = dynamic(() => import("@/components/use-cases/culture-drift"), { ssr: false });
const BurnoutSignal = dynamic(() => import("@/components/use-cases/burnout-signal"), { ssr: false });

/* ── IT ─────────────────────────────────────────────────────────────── */
const SystemOutage = dynamic(() => import("@/components/use-cases/system-outage"), { ssr: false });
const ShadowIt = dynamic(() => import("@/components/use-cases/shadow-it"), { ssr: false });
const MigrationRisk = dynamic(() => import("@/components/use-cases/migration-risk"), { ssr: false });
const SecurityGap = dynamic(() => import("@/components/use-cases/security-gap"), { ssr: false });
const LicenseWaste = dynamic(() => import("@/components/use-cases/license-waste"), { ssr: false });

/* ── Customer Support ───────────────────────────────────────────────── */
const RecurringComplaint = dynamic(() => import("@/components/use-cases/recurring-complaint"), { ssr: false });
const SilentChurn = dynamic(() => import("@/components/use-cases/silent-churn"), { ssr: false });
const EscalationLoop = dynamic(() => import("@/components/use-cases/escalation-loop"), { ssr: false });
const ResponseDelay = dynamic(() => import("@/components/use-cases/response-delay"), { ssr: false });
const FeedbackBlackhole = dynamic(() => import("@/components/use-cases/feedback-blackhole"), { ssr: false });

/* ── Legal / Compliance ─────────────────────────────────────────────── */
const ComplianceGap = dynamic(() => import("@/components/use-cases/compliance-gap"), { ssr: false });
const ContractRisk = dynamic(() => import("@/components/use-cases/contract-risk"), { ssr: false });
const RegulatoryChange = dynamic(() => import("@/components/use-cases/regulatory-change"), { ssr: false });
const IpExposure = dynamic(() => import("@/components/use-cases/ip-exposure"), { ssr: false });
const PolicyDrift = dynamic(() => import("@/components/use-cases/policy-drift"), { ssr: false });

/* ── Strategy / Management ──────────────────────────────────────────── */
const QuarterlyReview = dynamic(() => import("@/components/use-cases/quarterly-review"), { ssr: false });
const InvisiblePivot = dynamic(() => import("@/components/use-cases/invisible-pivot"), { ssr: false });
const StrategicMisalignment = dynamic(() => import("@/components/use-cases/strategic-misalignment"), { ssr: false });
const MarketSignal = dynamic(() => import("@/components/use-cases/market-signal"), { ssr: false });
const DecisionLag = dynamic(() => import("@/components/use-cases/decision-lag"), { ssr: false });
const KpiTheater = dynamic(() => import("@/components/use-cases/kpi-theater"), { ssr: false });

/* ── General (cross-functional) ─────────────────────────────────────── */
const UnnecessaryMeeting = dynamic(() => import("@/components/use-cases/unnecessary-meeting"), { ssr: false });
const KnowledgeSilo = dynamic(() => import("@/components/use-cases/knowledge-silo"), { ssr: false });
const Handoff = dynamic(() => import("@/components/use-cases/handoff"), { ssr: false });
const DuplicateInitiative = dynamic(() => import("@/components/use-cases/duplicate-initiative"), { ssr: false });
const QuietDeadline = dynamic(() => import("@/components/use-cases/quiet-deadline"), { ssr: false });
const ReportNobodyReads = dynamic(() => import("@/components/use-cases/report-nobody-reads"), { ssr: false });
const PerfectBrief = dynamic(() => import("@/components/use-cases/perfect-brief"), { ssr: false });

/* ── Data ───────────────────────────────────────────────────────────── */

interface UseCase {
  id: string;
  label: string;
  category: string;
  color: string;
  summary: string;
}

const CATEGORIES = [
  { key: "sales", label: "Sales" },
  { key: "marketing", label: "Marketing" },
  { key: "operations", label: "Operations" },
  { key: "supply-chain", label: "Supply Chain" },
  { key: "finance", label: "Finance" },
  { key: "hr", label: "HR" },
  { key: "it", label: "IT" },
  { key: "support", label: "Customer Support" },
  { key: "legal", label: "Legal / Compliance" },
  { key: "strategy", label: "Strategy" },
] as const;

type DeptKey = (typeof CATEGORIES)[number]["key"];
type CategoryKey = "all" | DeptKey;

const CATEGORY_CASES: Record<DeptKey, UseCase[]> = {
  sales: [
    { id: "sales-approach", label: "Wrong Sales Approach", category: "Sales Strategy", color: "#3b82f6", summary: "The rep is working hard. High activity, low conversion. The problem isn\u2019t effort \u2014 it\u2019s strategy." },
    { id: "deal-acceleration", label: "Deal Acceleration", category: "Sales Intelligence", color: "#22c55e", summary: "The CRM says this deal is stalled. 21 days without a stage change. But the activity tells a completely different story \u2014 it\u2019s about to close." },
    { id: "forgotten-followup", label: "The Lead That Went Cold", category: "Sales", color: "#3b82f6", summary: "A prospect asked for a quote. They replied with a question. Nobody answered. The competitor did. \u20ac85K lost to one unanswered email." },
    { id: "broken-promise", label: "The Broken Promise", category: "Client Relations", color: "#f59e0b", summary: "Your team promised free installation in an email. It never made it into the project plan. The client remembers. Your systems don\u2019t." },
    { id: "proposal-context", label: "Missed Proposal Context", category: "Work Quality", color: "#22c55e", summary: "Sales is drafting a proposal highlighting a feature Engineering is deprecating. The AI knows \u2014 the author doesn\u2019t." },
    { id: "phone-sales", label: "Script That Stopped Converting", category: "Telephone Sales", color: "#3b82f6", summary: "200 calls a day. Conversion dropped from 12% to 4%. Everyone follows the script. One rep deviated \u2014 her numbers went up 3.5x." },
  ],
  marketing: [
    { id: "content-gap", label: "The Question Nobody Answered", category: "Content", color: "#8b5cf6", summary: "Prospects keep asking about implementation timelines. Sales answers manually every time. Marketing\u2019s website doesn\u2019t mention it." },
    { id: "attribution-blind", label: "The Invisible ROI", category: "Analytics", color: "#8b5cf6", summary: "You\u2019re spending \u20ac120K a quarter on marketing. Some of it works. Some of it doesn\u2019t. But because the data lives in four different tools, nobody can tell you which is which." },
    { id: "campaign-misfire", label: "The Campaign That Backfired", category: "Campaigns", color: "#8b5cf6", summary: "Marketing launches a campaign promising fast delivery. Operations just extended lead times by 2 weeks. \u20ac40K in ad spend driving customers to a promise you can\u2019t keep." },
    { id: "brand-drift", label: "The Brand Nobody Recognized", category: "Brand", color: "#8b5cf6", summary: "Sales uses last year\u2019s pitch deck. Support sends outdated PDFs. The website says one thing, proposals say another. Same company, four different stories." },
    { id: "wasted-leads", label: "The Leads That Went Nowhere", category: "Lead Management", color: "#8b5cf6", summary: "Marketing spent \u20ac8K on a campaign that generated 140 leads. Sales contacted 40. The other 100 were never followed up. Marketing thinks the campaign failed. Sales says the leads were bad. The answer is in the CRM \u2014 nobody looked." },
  ],
  operations: [
    { id: "bottleneck", label: "Hidden Bottleneck", category: "Process", color: "#ef4444", summary: "One person is the approval gate on 12 workflows. Everything waits. Nobody knows why things are slow." },
    { id: "product-returns", label: "Return Rate Nobody Investigated", category: "Quality", color: "#f59e0b", summary: "Returns on the Nordic Floor Lamp tripled this quarter. Each one processed individually. They all trace back to one supplier change." },
    { id: "moving-crew", label: "Crew Getting Complaints", category: "Field Ops", color: "#ef4444", summary: "Three damage claims in two months. Different customers, different addresses. Same crew. Nobody connected the dots." },
    { id: "shift-coverage", label: "The Shift Nobody Covered", category: "Workforce", color: "#f59e0b", summary: "Monday mornings and Friday afternoons. Same roles, same gaps. Each one costs 4 hours of scrambling. The pattern has been there for 6 months." },
    { id: "process-drift", label: "The Process Nobody Follows", category: "Quality", color: "#f59e0b", summary: "The SOP says one thing. The team does another. Quality is fine \u2014 until it isn\u2019t. The workaround became the process." },
  ],
  "supply-chain": [
    { id: "vendor-overcharge", label: "Vendor Overcharge", category: "Procurement", color: "#f59e0b", summary: "Your cleaning contract auto-renewed at last year\u2019s rate. Market prices dropped 20%. You\u2019re overpaying \u20ac18K a year \u2014 and nobody knows." },
    { id: "delivery-delay", label: "The Late Delivery Chain", category: "Logistics", color: "#06b6d4", summary: "One supplier started shipping 3 days late. It cascades through 4 production steps. Final product ships a week late. Each team blames the next." },
    { id: "inventory-blindspot", label: "The Stockroom Surprise", category: "Inventory", color: "#06b6d4", summary: "\u20ac80K in dead stock gathering dust. Meanwhile, the bestseller is on backorder. The data is in two systems that don\u2019t talk." },
    { id: "supplier-risk", label: "The Supplier About to Fail", category: "Supplier Mgmt", color: "#06b6d4", summary: "Payment terms changed. Delivery windows stretched. Quality complaints up 40%. Your key supplier is in trouble \u2014 the signals are in three departments." },
    { id: "procurement-delay", label: "The Approval That Took 3 Weeks", category: "Procurement", color: "#06b6d4", summary: "Urgent material order needs 4 signatures. Two approvers are traveling. Production line waits. \u20ac12K per day in idle capacity." },
    { id: "warehouse-chaos", label: "The Warehouse That Slowed Down", category: "Fulfillment", color: "#06b6d4", summary: "Fulfillment times doubled. Everyone blames shipping. Real cause: one packing station is down, routing all orders through a single lane." },
  ],
  finance: [
    { id: "budget-blindspot", label: "Budget Blindspot", category: "Budgeting", color: "#f59e0b", summary: "Q2 budget is locked and approved. But commitments are being made in emails and docs that haven\u2019t hit the books." },
    { id: "invoice-mismatch", label: "The Invoice Nobody Checked", category: "Accounts Payable", color: "#f59e0b", summary: "Vendor invoices \u20ac4,200/month. Contract says \u20ac3,800. The difference is small enough to slip past \u2014 but adds up to \u20ac4,800/year." },
    { id: "expense-creep", label: "The Subscriptions That Grew", category: "Cost Mgmt", color: "#f59e0b", summary: "14 SaaS tools across departments. 3 are duplicates. 2 have unused seats. Total waste: \u20ac2,400/month \u2014 each one approved by a different person." },
    { id: "cash-flow-gap", label: "The Cash Flow Cliff", category: "Cash Flow", color: "#ef4444", summary: "Three major client payments due next month. Two are showing signs of delay. Payroll is in 12 days. The forecast doesn\u2019t reflect reality." },
    { id: "audit-surprise", label: "The Audit Finding", category: "Compliance", color: "#ef4444", summary: "Annual audit reveals 340 expense reports missing receipts. Same 5 employees. Same category. Same issue every quarter." },
  ],
  hr: [
    { id: "employee-leaving", label: "Employee About to Leave", category: "Retention", color: "#ef4444", summary: "Performance reviews say everything\u2019s fine. But email replies got shorter, ideas stopped, and optional meetings are being declined." },
    { id: "onboarding-gap", label: "The 90-Day Dropout", category: "Onboarding", color: "#ef4444", summary: "New hires keep leaving at the 3-month mark. Exit interviews say \u2018not what I expected.\u2019 The gap is between what was promised and what was delivered." },
    { id: "skill-shortage", label: "The Knowledge That\u2019s About to Leave", category: "Succession", color: "#ef4444", summary: "Senior engineer retires in 6 months. She\u2019s the only one who knows the billing system. No training plan. No documentation. No succession." },
    { id: "culture-drift", label: "The Team That Went Quiet", category: "Engagement", color: "#ef4444", summary: "Team of 8 used to generate 20+ ideas per quarter. Last quarter: 2. Meeting participation down. Engagement survey says \u2018fine.\u2019" },
    { id: "burnout-signal", label: "The Burnout Before the Breakdown", category: "Wellbeing", color: "#ef4444", summary: "Top performer. Works late, responds instantly, never says no. Login hours up 40%. Vacation days: zero. Medical leave: 4 weeks away." },
  ],
  it: [
    { id: "system-outage", label: "The Outage That Keeps Happening", category: "Infrastructure", color: "#6366f1", summary: "Third time this quarter the order system crashed at 9 AM. Each time, a different team investigates. Nobody connected it to the backup job at 8:55." },
    { id: "shadow-it", label: "The Tool Nobody Approved", category: "Security", color: "#6366f1", summary: "Sales team signed up for a file-sharing service. Customer data is in an unencrypted third-party system. Security doesn\u2019t know. 400 files uploaded." },
    { id: "migration-risk", label: "The Migration That Broke Everything", category: "Systems", color: "#6366f1", summary: "ERP migration planned for Q3. 12 integrations depend on the old system. Three are undocumented. The migration team found out when they went live." },
    { id: "security-gap", label: "The Access Nobody Revoked", category: "Access Mgmt", color: "#6366f1", summary: "23 former employees still have active credentials. Average time to revoke: 11 days after departure. The risk compounds daily." },
    { id: "license-waste", label: "The Licenses Nobody Uses", category: "Asset Mgmt", color: "#6366f1", summary: "200 software licenses at \u20ac45/seat/month. 68 haven\u2019t been used in 90 days. That\u2019s \u20ac36K/year in unused seats." },
  ],
  support: [
    { id: "recurring-complaint", label: "The Pattern Nobody Connected", category: "Root Cause", color: "#ef4444", summary: "Three customers complained about late Friday deliveries. Three different reps handled them. Nobody realized it\u2019s the same root cause." },
    { id: "silent-churn", label: "Silent Churn", category: "Customer Success", color: "#ef4444", summary: "A customer walking away \u2014 detected by reading the signals humans miss across email, meetings, support, and billing." },
    { id: "escalation-loop", label: "The Ticket That Won\u2019t Die", category: "Escalation", color: "#ef4444", summary: "Same customer. Same issue. 4 tickets over 6 months. Each time escalated. Each time \u2018resolved.\u2019 Root cause never addressed." },
    { id: "response-delay", label: "The SLA Nobody Hit", category: "Service Levels", color: "#ef4444", summary: "Average response time: 4 hours. SLA target: 2 hours. 40% of tickets breach. The bottleneck isn\u2019t staffing \u2014 it\u2019s routing." },
    { id: "feedback-blackhole", label: "The Feedback Nobody Read", category: "Voice of Customer", color: "#ef4444", summary: "2,000 survey responses per quarter. NPS declining. Three recurring complaints. Product team hasn\u2019t seen them." },
  ],
  legal: [
    { id: "compliance-gap", label: "The Compliance Gap", category: "Regulatory", color: "#ef4444", summary: "The legal team knows about the new regulation. They updated some contracts. They missed four. 22 days to enforcement." },
    { id: "contract-risk", label: "The Clause That Bit Back", category: "Contracts", color: "#ef4444", summary: "Standard contract has a 60-day termination clause. Sales promised 30 days. 14 contracts signed with the wrong terms." },
    { id: "regulatory-change", label: "The Regulation Nobody Coordinated", category: "Compliance", color: "#ef4444", summary: "New data privacy regulation in 90 days. Legal drafted the update. Operations hasn\u2019t changed the process. Marketing still collects data the old way." },
    { id: "ip-exposure", label: "The IP That Walked Out", category: "IP Protection", color: "#ef4444", summary: "Departing employee downloads 4,000 files in their last week. Product roadmaps, pricing, client lists. IT sees the spike. Nobody else knows." },
    { id: "policy-drift", label: "The Policy Nobody Updated", category: "Policy", color: "#ef4444", summary: "Handbook says 3 remote days. Team leads allow 4. One department is fully remote. When HR enforces the written policy, 12 people file complaints." },
  ],
  strategy: [
    { id: "invisible-pivot", label: "The Invisible Pivot", category: "Alignment", color: "#f59e0b", summary: "Marketing is overhauling the company\u2019s positioning. Sales is still pitching last quarter\u2019s value props. The CRM knows nothing." },
    { id: "strategic-misalignment", label: "The Teams Going Opposite Ways", category: "Strategy", color: "#a855f7", summary: "Sales targets enterprise. Marketing targets SMB. Product builds for mid-market. Three strategies, one company." },
    { id: "market-signal", label: "The Shift Nobody Saw", category: "Market Intel", color: "#a855f7", summary: "Competitor dropped prices 30%. Three customers asked about it. Sales mentioned it in Slack. Leadership found out 8 weeks late." },
    { id: "decision-lag", label: "The Decision That Took 6 Weeks", category: "Decision Making", color: "#a855f7", summary: "Expansion into new region needs data from 5 reports and 3 spreadsheets. Nobody has the full picture. The meeting keeps getting rescheduled." },
    { id: "kpi-theater", label: "The Dashboard That Lied", category: "Performance", color: "#a855f7", summary: "Green across the board. Every KPI on target. But the leading indicators tell a different story \u2014 the lag metrics just haven\u2019t caught up yet." },
    { id: "quarterly-review", label: "Quarterly Review", category: "Leadership", color: "#a855f7", summary: "Usually takes a week to assemble. The AI already has all the data. From 5 days of gathering to 30 seconds of reviewing." },
  ],
};

const GENERAL_CASES: UseCase[] = [
  { id: "unnecessary-meeting", label: "Unnecessary Meeting", category: "Collaboration", color: "#f59e0b", summary: "6 people, 1 hour \u2014 for a decision that was already made in a Slack thread nobody remembered to share." },
  { id: "knowledge-silo", label: "Knowledge Silo", category: "Knowledge", color: "#6366f1", summary: "One person holds all the context on a critical system. The bus factor is 1 \u2014 and the bus is about to leave." },
  { id: "duplicate-initiative", label: "Duplicate Initiative", category: "Cross-Team", color: "#6366f1", summary: "Two teams building the same thing. Neither knows the other exists. Tens of thousands about to be wasted." },
  { id: "quiet-deadline", label: "Quiet Deadline Miss", category: "Project Mgmt", color: "#f59e0b", summary: "The status board says on track. The activity says otherwise. Zero blocked tickets, zero active contributors." },
  { id: "report-nobody-reads", label: "Report Nobody Reads", category: "Workflow", color: "#ef4444", summary: "4 hours every Friday. Beautifully formatted report. Opened by one person: the author." },
  { id: "handoff", label: "Project Handoff", category: "Transitions", color: "#3b82f6", summary: "Projects change hands. Context is lost. The AI has every document, decision, and conversation \u2014 the handoff brief writes itself." },
  { id: "perfect-brief", label: "The Perfect Brief", category: "Meetings", color: "#22c55e", summary: "Before every important meeting, the AI prepares a brief with everything you need to know \u2014 in 30 seconds." },
];

/* ── Component map ──────────────────────────────────────────────────── */

const COMPONENTS: Record<string, React.ComponentType> = {
  "forgotten-followup": ForgottenFollowup,
  "broken-promise": BrokenPromise,
  "deal-acceleration": DealAcceleration,
  "sales-approach": SalesApproach,
  "proposal-context": ProposalContext,
  "phone-sales": PhoneSales,
  "campaign-misfire": CampaignMisfire,
  "brand-drift": BrandDrift,
  "content-gap": ContentGap,
  "attribution-blind": AttributionBlind,
  "launch-misalignment": LaunchMisalignment,
  "bottleneck": Bottleneck,
  "product-returns": ProductReturns,
  "moving-crew": MovingCrew,
  "shift-coverage": ShiftCoverage,
  "process-drift": ProcessDrift,
  "vendor-overcharge": VendorOvercharge,
  "delivery-delay": DeliveryDelay,
  "inventory-blindspot": InventoryBlindspot,
  "supplier-risk": SupplierRisk,
  "procurement-delay": ProcurementDelay,
  "warehouse-chaos": WarehouseChaos,
  "budget-blindspot": BudgetBlindspot,
  "invoice-mismatch": InvoiceMismatch,
  "expense-creep": ExpenseCreep,
  "cash-flow-gap": CashFlowGap,
  "audit-surprise": AuditSurprise,
  "employee-leaving": EmployeeLeaving,
  "onboarding-gap": OnboardingGap,
  "skill-shortage": SkillShortage,
  "culture-drift": CultureDrift,
  "burnout-signal": BurnoutSignal,
  "system-outage": SystemOutage,
  "shadow-it": ShadowIt,
  "migration-risk": MigrationRisk,
  "security-gap": SecurityGap,
  "license-waste": LicenseWaste,
  "recurring-complaint": RecurringComplaint,
  "silent-churn": SilentChurn,
  "escalation-loop": EscalationLoop,
  "response-delay": ResponseDelay,
  "feedback-blackhole": FeedbackBlackhole,
  "compliance-gap": ComplianceGap,
  "contract-risk": ContractRisk,
  "regulatory-change": RegulatoryChange,
  "ip-exposure": IpExposure,
  "policy-drift": PolicyDrift,
  "quarterly-review": QuarterlyReview,
  "invisible-pivot": InvisiblePivot,
  "strategic-misalignment": StrategicMisalignment,
  "market-signal": MarketSignal,
  "decision-lag": DecisionLag,
  "kpi-theater": KpiTheater,
  "unnecessary-meeting": UnnecessaryMeeting,
  "knowledge-silo": KnowledgeSilo,
  "handoff": Handoff,
  "duplicate-initiative": DuplicateInitiative,
  "quiet-deadline": QuietDeadline,
  "report-nobody-reads": ReportNobodyReads,
  "perfect-brief": PerfectBrief,
};

/* ── Component ──────────────────────────────────────────────────────── */

const ALL_SPECIFIC_CASES = CATEGORIES.flatMap((cat) => CATEGORY_CASES[cat.key as DeptKey]);

export function UseCasesClient() {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");
  const [active, setActive] = useState<string>("forgotten-followup");

  const categoryCases =
    activeCategory === "all"
      ? ALL_SPECIFIC_CASES
      : CATEGORY_CASES[activeCategory as DeptKey];
  const allVisible = [...categoryCases, ...GENERAL_CASES];
  const activeCase = allVisible.find((u) => u.id === active);
  const ActiveComponent = COMPONENTS[active];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a1a" }}>
      <style>{`.uc-scroll::-webkit-scrollbar{width:4px}.uc-scroll::-webkit-scrollbar-track{background:transparent}.uc-scroll::-webkit-scrollbar-thumb{background:#2a2a4a;border-radius:4px}.uc-scroll::-webkit-scrollbar-thumb:hover{background:#3a3a5a}.uc-scroll{scrollbar-width:thin;scrollbar-color:#2a2a4a transparent}`}</style>

      {/* Left panel */}
      <div
        style={{
          width: 300,
          flexShrink: 0,
          height: "85vh",
          background: "#08080f",
          borderRight: "1px solid rgba(255,255,255,0.12)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header — pinned */}
        <div style={{ padding: "20px 20px 0", flexShrink: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#e2e8f0",
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 6,
            }}
          >
            Use Cases
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#e2e8f0",
              lineHeight: 1.5,
              marginBottom: 12,
            }}
          >
            Select a department to explore scenarios.
          </div>

          {/* Category dropdown */}
          <select
            value={activeCategory}
            onChange={(e) => {
              const key = e.target.value as CategoryKey;
              setActiveCategory(key);
              if (key === "all") {
                setActive(ALL_SPECIFIC_CASES[0].id);
              } else {
                setActive(CATEGORY_CASES[key as DeptKey][0].id);
              }
            }}
            style={{
              width: "100%",
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #1e1e3a",
              background: "#0f0f1a",
              color: "#e2e8f0",
              fontSize: 15,
              fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
              cursor: "pointer",
              outline: "none",
              marginBottom: 12,
              appearance: "none",
              WebkitAppearance: "none",
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
              paddingRight: 28,
            }}
          >
            <option value="all" style={{ background: "#0f0f1a" }}>All Departments</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.key} value={cat.key} style={{ background: "#0f0f1a" }}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Scrollable list */}
        <div
          className="uc-scroll"
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Category-specific cases */}
          {categoryCases.map((uc) => {
            const isActive = active === uc.id;
            return (
              <button
                key={uc.id}
                onClick={() => setActive(uc.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  padding: "7px 20px",
                  flexShrink: 0,
                  background: isActive ? "#2563eb10" : "transparent",
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
                    fontSize: 14,
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

          {/* General Usages divider */}
          <div
            style={{
              padding: "14px 20px 6px",
              flexShrink: 0,
              borderTop: "1px solid rgba(255,255,255,0.06)",
              marginTop: 4,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#475569",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              General Usages
            </span>
          </div>

          {/* General cases */}
          {GENERAL_CASES.map((uc) => {
            const isActive = active === uc.id;
            return (
              <button
                key={uc.id}
                onClick={() => setActive(uc.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  padding: "7px 20px",
                  flexShrink: 0,
                  background: isActive ? "#2563eb10" : "transparent",
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
                    color: isActive ? "#2563eb" : "#4a5568",
                  }}
                >
                  {uc.category}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "#ffffff" : "#94a3b8",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {uc.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Summary — pinned at bottom */}
        <div
          style={{
            flexShrink: 0,
            padding: "12px 24px 16px",
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
            {activeCase?.summary}
          </div>
        </div>
      </div>

      {/* Animation area */}
      <div style={{ flex: 1, position: "relative" }}>
        <div key={active}>
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}

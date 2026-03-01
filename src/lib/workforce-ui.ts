export type AgentKindKey =
  | "ASSISTANT"
  | "SALES_REP"
  | "CUSTOMER_SUCCESS"
  | "MARKETING_COORDINATOR"
  | "FINANCE_ANALYST"
  | "OPERATIONS_MANAGER"
  | "EXECUTIVE_ASSISTANT"
  | "RESEARCH_ANALYST"
  | "SEO_SPECIALIST";

export type AgentTone = "teal" | "amber" | "rose" | "green" | "purple" | "cyan" | "slate" | "violet" | "emerald";
export type AgentFigureVariant = "assistant" | "manager";

export type UiAgent = {
  kind: AgentKindKey;
  name: string;
  username: string;
  role: string;
  tone: AgentTone;
  figureVariant: AgentFigureVariant;
  status: "Available" | "Busy" | "Needs approval" | "Offline";
  autonomy: "Draft only" | "Execute with approval" | "Execute automatically";
  capabilities: string[];
  permissions: string[];
  knowledgeSources: string[];
  wins: string[];
  failures: string[];
  dev: {
    promptVersion: string;
    tools: string[];
    connectors: string[];
    logs: { time: string; event: string; latencyMs: number; status: "ok" | "error" }[];
    evals: { name: string; env: "staging" | "production"; score: string; lastRun: string }[];
  };
};

export type InboxItem = {
  id: string;
  summary: string;
  impact: string;
  type: "approval" | "draft" | "incident" | "system_update";
  owner: string;
  department: string;
  state?: "open" | "approved" | "needs_changes" | "agent_followup" | "paused";
  stateLabel?: string;
  updatedAt?: string;
  pendingActionsJson?: string | null;
};

export type ProjectBoardColumn = {
  title: string;
  cards: { id: string; title: string; owner: string; eta: string }[];
};

export type ProjectTemplate = {
  name: string;
  outcome: string;
  agents: string[];
  workflow: string;
  permissions: string;
};

export type UiProject = {
  id: string;
  name: string;
  goal: string;
  status: string;
  workforceHealth: "green" | "yellow" | "red";
  board: ProjectBoardColumn[];
  artifacts: string[];
  timeline: string[];
};

export const UI_AGENTS: UiAgent[] = [
  {
    kind: "ASSISTANT",
    name: "Mara",
    username: "mara",
    role: "Support Rep",
    tone: "teal",
    figureVariant: "assistant",
    status: "Needs approval",
    autonomy: "Execute with approval",
    capabilities: ["Triage inbound requests", "Draft customer emails", "Update CRM notes"],
    permissions: ["Can draft email replies", "Can send emails only after approval", "Can update ticket tags"],
    knowledgeSources: ["Help Center (website)", "Notion SOPs", "Google Drive playbooks"],
    wins: ["Reduced first-response time by 28% this week", "Auto-categorized 142 tickets with 96% agreement"],
    failures: ["Misread refund exception policy on 2 orders"],
    dev: {
      promptVersion: "support-rep@v12",
      tools: ["Email Draft", "Ticket Queue", "CRM Notes"],
      connectors: ["Gmail", "Zendesk", "HubSpot"],
      logs: [
        { time: "09:21", event: "Drafted 12 replies", latencyMs: 1320, status: "ok" },
        { time: "09:25", event: "CRM sync timeout", latencyMs: 5030, status: "error" },
        { time: "09:29", event: "Retry CRM sync", latencyMs: 1840, status: "ok" },
      ],
      evals: [
        { name: "Refund policy routing", env: "staging", score: "92%", lastRun: "Today 08:10" },
        { name: "Tone + de-escalation", env: "production", score: "89%", lastRun: "Yesterday" },
      ],
    },
  },
  {
    kind: "SALES_REP",
    name: "Kai",
    username: "kai",
    role: "Sales Rep",
    tone: "rose",
    figureVariant: "assistant",
    status: "Available",
    autonomy: "Execute with approval",
    capabilities: ["Research and qualify prospects", "Draft outbound outreach sequences", "Update pipeline and CRM notes"],
    permissions: ["Can draft emails and messages", "Can send outreach only after approval", "Can read and update CRM records"],
    knowledgeSources: ["ICP and personas doc", "Approved messaging playbook", "CRM pipeline"],
    wins: ["Researched and qualified 40 accounts in one morning", "Outreach open rate 38% above baseline"],
    failures: ["Sent a follow-up without waiting for approval on one thread"],
    dev: {
      promptVersion: "sales-rep@v3",
      tools: ["Email Draft", "CRM Notes", "Web Research"],
      connectors: ["HubSpot", "Gmail", "Apollo"],
      logs: [
        { time: "09:10", event: "Enriched 15 prospect records", latencyMs: 2100, status: "ok" },
        { time: "09:14", event: "Drafted 8 outreach emails", latencyMs: 1740, status: "ok" },
      ],
      evals: [
        { name: "ICP fit scoring accuracy", env: "staging", score: "88%", lastRun: "Today 08:30" },
        { name: "Outreach tone + personalization", env: "production", score: "91%", lastRun: "Yesterday" },
      ],
    },
  },
  {
    kind: "CUSTOMER_SUCCESS",
    name: "Zoe",
    username: "zoe",
    role: "Customer Success Manager",
    tone: "green",
    figureVariant: "assistant",
    status: "Available",
    autonomy: "Execute with approval",
    capabilities: ["Monitor customer health and usage signals", "Draft check-in and renewal outreach", "Escalate at-risk accounts"],
    permissions: ["Can read customer records and usage data", "Can draft emails and summaries", "Cannot send renewal offers without approval"],
    knowledgeSources: ["Customer health dashboard", "Renewal calendar", "Onboarding playbook"],
    wins: ["Flagged 3 churn-risk accounts 2 weeks before renewal", "Automated 80% of routine check-in drafts"],
    failures: ["Missed a health score threshold update on one enterprise account"],
    dev: {
      promptVersion: "customer-success@v4",
      tools: ["CRM Notes", "Email Draft", "Business Logs"],
      connectors: ["HubSpot", "Gmail", "Intercom"],
      logs: [
        { time: "09:00", event: "Health score review — 22 accounts", latencyMs: 1890, status: "ok" },
        { time: "09:05", event: "Drafted 6 renewal prep briefs", latencyMs: 2340, status: "ok" },
      ],
      evals: [
        { name: "Churn risk detection", env: "staging", score: "90%", lastRun: "Today 08:00" },
        { name: "Check-in email tone", env: "production", score: "93%", lastRun: "Yesterday" },
      ],
    },
  },
  {
    kind: "MARKETING_COORDINATOR",
    name: "Ava",
    username: "ava",
    role: "Marketing Coordinator",
    tone: "purple",
    figureVariant: "manager",
    status: "Available",
    autonomy: "Execute with approval",
    capabilities: ["Draft content and email campaigns", "Summarize campaign performance", "Manage content calendar entries"],
    permissions: ["Can draft all content for review", "Can read analytics and ad dashboards", "Cannot publish or send without approval"],
    knowledgeSources: ["Brand guidelines", "Content calendar", "Campaign performance dashboard"],
    wins: ["Produced a full week of social drafts in 90 minutes", "Campaign recap delivered 2 hours before the review meeting"],
    failures: ["Used an off-brand tone in one product launch draft"],
    dev: {
      promptVersion: "marketing-coordinator@v3",
      tools: ["Email Draft", "Web Fetch", "Business Logs"],
      connectors: ["Mailchimp", "Meta Ads", "Notion"],
      logs: [
        { time: "09:30", event: "Drafted 5 social posts", latencyMs: 1560, status: "ok" },
        { time: "09:35", event: "Pulled campaign stats", latencyMs: 980, status: "ok" },
      ],
      evals: [
        { name: "Brand voice adherence", env: "staging", score: "87%", lastRun: "Today 09:00" },
        { name: "Campaign brief quality", env: "production", score: "91%", lastRun: "Yesterday" },
      ],
    },
  },
  {
    kind: "FINANCE_ANALYST",
    name: "Max",
    username: "max",
    role: "Finance Analyst",
    tone: "cyan",
    figureVariant: "manager",
    status: "Available",
    autonomy: "Execute with approval",
    capabilities: ["Prepare financial reports and summaries", "Categorize expenses and flag anomalies", "Draft invoices and payment reminders"],
    permissions: ["Can read all financial files and logs", "Can draft reports and invoices", "Cannot initiate payments or send docs without approval"],
    knowledgeSources: ["Chart of accounts", "Monthly P&L spreadsheet", "Invoice log"],
    wins: ["Monthly close report delivered 1 day early for 2 consecutive months", "Flagged a duplicate vendor charge worth $4,200"],
    failures: ["Used prior-period exchange rate in one foreign currency summary"],
    dev: {
      promptVersion: "finance-analyst@v5",
      tools: ["Business Logs", "File Reader", "Spreadsheet"],
      connectors: ["QuickBooks", "Google Sheets", "Xero"],
      logs: [
        { time: "08:05", event: "Run monthly expense categorization", latencyMs: 3120, status: "ok" },
        { time: "08:11", event: "Draft P&L summary", latencyMs: 2040, status: "ok" },
      ],
      evals: [
        { name: "Expense categorization accuracy", env: "staging", score: "96%", lastRun: "Today 07:30" },
        { name: "Report narrative quality", env: "production", score: "88%", lastRun: "Yesterday" },
      ],
    },
  },
  {
    kind: "OPERATIONS_MANAGER",
    name: "Jordan",
    username: "jordan",
    role: "Operations Manager",
    tone: "slate",
    figureVariant: "manager",
    status: "Available",
    autonomy: "Execute with approval",
    capabilities: ["Maintain SOPs and process documentation", "Coordinate vendor communications", "Surface operational blockers and risks"],
    permissions: ["Can read all business files and logs", "Can draft comms and doc updates", "Cannot sign contracts or send external comms without approval"],
    knowledgeSources: ["Process documentation library", "Vendor contracts folder", "Ops dashboard"],
    wins: ["Consolidated 14 SOPs into a single indexed library", "Identified a vendor SLA breach 3 days before deadline"],
    failures: ["Proposed a workflow change that conflicted with an undocumented team agreement"],
    dev: {
      promptVersion: "operations-manager@v4",
      tools: ["File Reader", "Business Logs", "Web Fetch"],
      connectors: ["Notion", "Slack", "Google Drive"],
      logs: [
        { time: "08:30", event: "Review open vendor items", latencyMs: 1430, status: "ok" },
        { time: "08:35", event: "Update SOP index", latencyMs: 870, status: "ok" },
      ],
      evals: [
        { name: "SOP accuracy vs source docs", env: "staging", score: "94%", lastRun: "Today 08:00" },
        { name: "Blocker identification", env: "production", score: "86%", lastRun: "Yesterday" },
      ],
    },
  },
  {
    kind: "EXECUTIVE_ASSISTANT",
    name: "Sam",
    username: "sam",
    role: "Executive Assistant",
    tone: "violet",
    figureVariant: "assistant",
    status: "Available",
    autonomy: "Execute with approval",
    capabilities: ["Triage and summarize inbox", "Prepare meeting briefs and agendas", "Track open action items across the team"],
    permissions: ["Can read emails and calendar", "Can draft replies and summaries", "Cannot send emails or book meetings without approval"],
    knowledgeSources: ["Email inbox", "Calendar", "Action item tracker"],
    wins: ["Morning briefing ready before 7:45am every day this week", "Tracked 23 open action items with zero misses"],
    failures: ["Included a confidential figure in a meeting summary draft"],
    dev: {
      promptVersion: "executive-assistant@v3",
      tools: ["Email Draft", "Business Logs", "Inbox Review"],
      connectors: ["Gmail", "Google Calendar", "Notion"],
      logs: [
        { time: "07:45", event: "Morning inbox triage — 34 items", latencyMs: 2210, status: "ok" },
        { time: "07:52", event: "Draft daily briefing", latencyMs: 1380, status: "ok" },
      ],
      evals: [
        { name: "Action item recall accuracy", env: "staging", score: "95%", lastRun: "Today 07:00" },
        { name: "Briefing completeness", env: "production", score: "92%", lastRun: "Yesterday" },
      ],
    },
  },
  {
    kind: "RESEARCH_ANALYST",
    name: "Nova",
    username: "nova",
    role: "Research Analyst",
    tone: "amber",
    figureVariant: "manager",
    status: "Available",
    autonomy: "Execute with approval",
    capabilities: ["Deep web research and source validation", "Cross-reference claims against multiple sources", "Synthesize findings into structured reports", "Quality-review outputs via cloud model critique"],
    permissions: ["Can search the web and extract content", "Can create business logs with findings", "Cannot send emails or external comms", "All reports require human review"],
    knowledgeSources: ["Web search (Tavily API)", "Business logs", "Business files"],
    wins: ["Cross-validated 12 market claims across 5 independent sources", "Research report saved 6 hours of manual desk research"],
    failures: ["Initial draft missed a key competitor — caught by quality review"],
    dev: {
      promptVersion: "research-analyst@v1",
      tools: ["Web Search", "Extract Content", "Quality Review", "Business Logs"],
      connectors: ["Tavily", "Business Logs"],
      logs: [
        { time: "10:00", event: "Searched 5 topics, extracted 8 pages", latencyMs: 4200, status: "ok" },
        { time: "10:15", event: "Quality review passed (confidence: 87%)", latencyMs: 3100, status: "ok" },
      ],
      evals: [
        { name: "Source citation accuracy", env: "staging", score: "91%", lastRun: "Today 09:00" },
        { name: "Report completeness", env: "production", score: "88%", lastRun: "Yesterday" },
      ],
    },
  },
  {
    kind: "SEO_SPECIALIST",
    name: "Sage",
    username: "sage",
    role: "SEO Specialist",
    tone: "emerald",
    figureVariant: "manager",
    status: "Available",
    autonomy: "Execute with approval",
    capabilities: ["Crawl and audit web pages for SEO issues", "Keyword research and opportunity analysis", "Competitor SEO analysis and benchmarking", "Produce optimization recommendations"],
    permissions: ["Can search the web and extract content", "Can create business logs with findings", "Cannot publish changes without approval", "All recommendations require human review"],
    knowledgeSources: ["Web search (Tavily API)", "Business logs", "Business files"],
    wins: ["Identified 14 missing meta descriptions across the site", "Keyword gap analysis uncovered 8 high-intent terms competitors rank for"],
    failures: ["Initial audit missed a noindex tag on a key landing page — caught by quality review"],
    dev: {
      promptVersion: "seo-specialist@v1",
      tools: ["Web Search", "Extract Content", "Quality Review", "Business Logs"],
      connectors: ["Tavily", "Business Logs"],
      logs: [
        { time: "10:30", event: "Crawled 12 pages, flagged 6 SEO issues", latencyMs: 3800, status: "ok" },
        { time: "10:45", event: "Quality review passed (confidence: 89%)", latencyMs: 2900, status: "ok" },
      ],
      evals: [
        { name: "Audit issue detection accuracy", env: "staging", score: "90%", lastRun: "Today 09:30" },
        { name: "Recommendation actionability", env: "production", score: "87%", lastRun: "Yesterday" },
      ],
    },
  },
];

export const INBOX_ITEMS: InboxItem[] = [
  {
    id: "ibx-1",
    summary: "Agent needs approval to email 12 customers about delayed shipments.",
    impact: "Affects 12 open support tickets and CSAT recovery today.",
    type: "approval",
    owner: "Mara",
    department: "Support",
  },
  {
    id: "ibx-2",
    summary: "Draft campaign recap is ready. Approve or request changes.",
    impact: "Used by Sales + Marketing standup at 3pm.",
    type: "draft",
    owner: "Ilan",
    department: "Sales",
  },
  {
    id: "ibx-3",
    summary: "HubSpot integration failed during contact enrichment. Click to retry.",
    impact: "Blocks 47 outbound prospect records from being scored.",
    type: "incident",
    owner: "Mara",
    department: "Sales",
  },
  {
    id: "ibx-4",
    summary: "Finance agent prepared contract redlines for legal review.",
    impact: "Unblocks vendor renewal before February 26.",
    type: "draft",
    owner: "Ilan",
    department: "Finance",
  },
];

export const PROJECTS: UiProject[] = [
  {
    id: "proj-support",
    name: "Customer Support Triage",
    goal: "Resolve urgent tickets faster while keeping approvals for outbound customer communication.",
    status: "Active",
    workforceHealth: "green",
    board: [
      {
        title: "To Do",
        cards: [
          { id: "c1", title: "Re-train refund edge cases", owner: "Mara", eta: "Today" },
          { id: "c2", title: "Import VIP customer list", owner: "Ops", eta: "Today" },
        ],
      },
      {
        title: "In Progress",
        cards: [{ id: "c3", title: "Batch draft delay notices", owner: "Mara", eta: "45 min" }],
      },
      {
        title: "Review",
        cards: [{ id: "c4", title: "Approve 12 outbound emails", owner: "You", eta: "Now" }],
      },
      {
        title: "Done",
        cards: [{ id: "c5", title: "Tag and prioritize morning queue", owner: "Mara", eta: "Done" }],
      },
    ] satisfies ProjectBoardColumn[],
    artifacts: ["Delay notice draft (doc)", "Refund exceptions sheet", "Support SLA snapshot"],
    timeline: [
      "10:10 AM: Drafted 12 customer emails for approval",
      "9:32 AM: Retry after CRM sync timeout succeeded",
      "9:05 AM: Morning ticket triage completed",
    ],
  },
  {
    id: "proj-kpi",
    name: "Weekly KPI Report",
    goal: "Generate a weekly KPI brief with sources, confidence, and recommended actions by Monday morning.",
    status: "Active",
    workforceHealth: "yellow",
    board: [
      {
        title: "To Do",
        cards: [{ id: "k1", title: "Add CAC by channel breakdown", owner: "Ilan", eta: "Today" }],
      },
      {
        title: "In Progress",
        cards: [{ id: "k2", title: "Draft executive summary", owner: "Ilan", eta: "20 min" }],
      },
      {
        title: "Review",
        cards: [{ id: "k3", title: "Approve report distribution list", owner: "You", eta: "Today" }],
      },
      {
        title: "Done",
        cards: [{ id: "k4", title: "Run anomaly checks", owner: "Ilan", eta: "Done" }],
      },
    ] satisfies ProjectBoardColumn[],
    artifacts: ["KPI brief draft", "Channel performance CSV", "Exec summary slides"],
    timeline: [
      "9:58 AM: Anomaly note added for conversion dip",
      "9:41 AM: KPI data pull completed",
      "8:55 AM: Scheduled run started",
    ],
  },
];

export const TEMPLATE_GALLERY: ProjectTemplate[] = [
  {
    name: "Customer Support Triage",
    outcome: "Triage, draft replies, and route tickets with approval gates.",
    agents: ["Support Rep", "QA Reviewer", "Escalation Coordinator"],
    workflow: "intake -> classify -> draft -> approve -> send",
    permissions: "Safe defaults (draft/send approval required)",
  },
  {
    name: "Weekly KPI Report",
    outcome: "Pull metrics, summarize, cite sources, and produce exec-ready updates.",
    agents: ["Analyst", "Report Writer", "Ops Reviewer"],
    workflow: "query -> analyze -> draft -> review -> distribute",
    permissions: "Read-only data access + approval to distribute",
  },
  {
    name: "Outbound Sales Research",
    outcome: "Research target accounts and prepare outreach-ready briefs.",
    agents: ["Researcher", "Prospector", "Sales Ops"],
    workflow: "source -> enrich -> score -> draft outreach",
    permissions: "No sends by default",
  },
  {
    name: "Content Pipeline",
    outcome: "Move from brief to draft to publish-ready package.",
    agents: ["Strategist", "Writer", "Editor"],
    workflow: "brief -> draft -> revise -> approve",
    permissions: "Draft-only by default",
  },
  {
    name: "Contract Review & Redlines",
    outcome: "Review contracts, highlight risks, and draft redlines for approval.",
    agents: ["Legal Analyst", "Redline Drafter", "Approver"],
    workflow: "parse -> flag -> draft redlines -> approve",
    permissions: "No external sends; edits require approval",
  },
];

export const REQUEST_PATTERN = {
  request: "Reduce support backlog while keeping customer messaging approved.",
  plan: [
    "Triage today's ticket queue by urgency and type",
    "Draft customer responses for delay/refund cases",
    "Queue all outbound emails for approval",
    "Report results + risks in inbox",
  ],
  assumptions: ["Use current refund policy v3", "Only tickets updated in the last 24 hours", "Escalate VIP customers first"],
  needsFromYou: ["Approval for outbound emails", "Confirm VIP list source (CRM or spreadsheet)"],
};

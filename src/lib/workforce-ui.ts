export type UiAgent = {
  kind: "ASSISTANT" | "PROJECT_MANAGER";
  name: string;
  username: string;
  role: string;
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
  type: "approval" | "draft" | "incident";
  owner: string;
  department: string;
  state?: "open" | "approved" | "needs_changes" | "agent_followup" | "paused";
  stateLabel?: string;
  updatedAt?: string;
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
    kind: "PROJECT_MANAGER",
    name: "Ilan",
    username: "ilan",
    role: "Analyst",
    status: "Busy",
    autonomy: "Execute with approval",
    capabilities: ["Build KPI summaries", "Investigate anomalies", "Prepare stakeholder updates"],
    permissions: ["Can read BI dashboards", "Can export CSV drafts", "Cannot send external reports automatically"],
    knowledgeSources: ["Looker dashboards", "Finance spreadsheet", "Quarterly goals doc"],
    wins: ["Shipped weekly KPI report before 8am for 3 consecutive weeks", "Flagged conversion drop 6 hours earlier"],
    failures: ["Used stale campaign attribution model in one draft"],
    dev: {
      promptVersion: "analyst@v9",
      tools: ["SQL Runner", "Spreadsheet Writer", "Slide Draft"],
      connectors: ["BigQuery", "Google Sheets", "Slack"],
      logs: [
        { time: "10:03", event: "Run KPI query", latencyMs: 2440, status: "ok" },
        { time: "10:04", event: "Generate anomaly notes", latencyMs: 980, status: "ok" },
        { time: "10:07", event: "Export xlsx preview", latencyMs: 1690, status: "ok" },
      ],
      evals: [
        { name: "Metric definition adherence", env: "staging", score: "95%", lastRun: "Today 07:42" },
        { name: "Narrative consistency", env: "production", score: "87%", lastRun: "Yesterday" },
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

export const DEPARTMENTS = [
  {
    id: "support",
    name: "Support",
    pos: { x: 4, y: 8, w: 44, h: 34 },
    inboxCount: 3,
    activeWork: "Delay shipment outreach batch (12 customers)",
    agents: ["Mara"],
  },
  {
    id: "sales",
    name: "Sales",
    pos: { x: 52, y: 8, w: 44, h: 34 },
    inboxCount: 2,
    activeWork: "Campaign recap draft + prospect enrichment retry",
    agents: ["Ilan"],
  },
  {
    id: "finance",
    name: "Finance",
    pos: { x: 4, y: 48, w: 44, h: 28 },
    inboxCount: 1,
    activeWork: "Contract redlines package for legal review",
    agents: ["Ilan"],
  },
  {
    id: "dev",
    name: "Dev",
    pos: { x: 52, y: 48, w: 44, h: 28 },
    inboxCount: 1,
    activeWork: "Connector reliability patch rollout",
    agents: ["Mara", "Ilan"],
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

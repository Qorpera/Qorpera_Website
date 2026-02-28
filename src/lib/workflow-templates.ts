import type { WorkflowGraph } from "@/lib/workflow-types";

export type WorkflowTemplate = {
  slug: string;
  name: string;
  description: string;
  category: string;
  graph: WorkflowGraph;
};

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    slug: "daily-sales-pipeline",
    name: "Daily Sales Pipeline Review",
    description: "Every morning, review open deals and draft follow-up emails for stalled ones.",
    category: "Sales",
    graph: {
      nodes: [
        { id: "t1", type: "trigger_schedule", label: "Daily 8 AM", position: { x: 250, y: 50 }, config: { cron: "0 8 * * *" } },
        { id: "a1", type: "agent_action", label: "Review Pipeline", position: { x: 250, y: 180 }, config: { agentKind: "SALES_REP", title: "Daily Pipeline Review", instructions: "Review all open HubSpot deals. For any deal that hasn't been updated in 7+ days, draft a follow-up email to the contact. List the top 5 deals by value and their current stage." } },
        { id: "c1", type: "condition", label: "Stalled Deals?", position: { x: 250, y: 310 }, config: { field: "", operator: "contains", value: "stalled" } },
        { id: "a2", type: "agent_action", label: "Draft Follow-ups", position: { x: 100, y: 440 }, config: { agentKind: "SALES_REP", title: "Draft Follow-up Emails", instructions: "Draft personalized follow-up emails for each stalled deal identified in the previous review. Keep emails concise and action-oriented." } },
        { id: "o1", type: "output", label: "Summary", position: { x: 400, y: 440 }, config: { format: "text", destination: "log" } },
      ],
      edges: [
        { id: "e1", source: "t1", target: "a1" },
        { id: "e2", source: "a1", target: "c1" },
        { id: "e3", source: "c1", target: "a2", conditionBranch: "true" },
        { id: "e4", source: "c1", target: "o1", conditionBranch: "false" },
        { id: "e5", source: "a2", target: "o1" },
      ],
    },
  },
  {
    slug: "customer-onboarding",
    name: "Customer Onboarding",
    description: "Automate new customer welcome: send intro email, create project, schedule kickoff.",
    category: "Customer Success",
    graph: {
      nodes: [
        { id: "t1", type: "trigger_manual", label: "New Customer", position: { x: 250, y: 50 }, config: {} },
        { id: "a1", type: "agent_action", label: "Welcome Email", position: { x: 250, y: 180 }, config: { agentKind: "CUSTOMER_SUCCESS", title: "Send Welcome Email", instructions: "Send a warm welcome email to the new customer. Include a brief intro to our team, what to expect in the onboarding process, and a link to schedule their kickoff call." } },
        { id: "s1", type: "parallel_split", label: "Split", position: { x: 250, y: 310 }, config: {} },
        { id: "a2", type: "agent_action", label: "Create Project", position: { x: 100, y: 440 }, config: { agentKind: "OPERATIONS_MANAGER", title: "Create Onboarding Project", instructions: "Create a new project in Linear for the customer onboarding. Add standard onboarding tasks: data migration, integration setup, training sessions, go-live checklist." } },
        { id: "a3", type: "agent_action", label: "Update CRM", position: { x: 400, y: 440 }, config: { agentKind: "SALES_REP", title: "Update CRM Status", instructions: "Update the customer's HubSpot contact and deal status to reflect they are now in onboarding. Add a note with the onboarding start date." } },
        { id: "j1", type: "parallel_join", label: "Join", position: { x: 250, y: 570 }, config: {} },
        { id: "o1", type: "output", label: "Done", position: { x: 250, y: 700 }, config: { format: "text", destination: "log" } },
      ],
      edges: [
        { id: "e1", source: "t1", target: "a1" },
        { id: "e2", source: "a1", target: "s1" },
        { id: "e3", source: "s1", target: "a2" },
        { id: "e4", source: "s1", target: "a3" },
        { id: "e5", source: "a2", target: "j1" },
        { id: "e6", source: "a3", target: "j1" },
        { id: "e7", source: "j1", target: "o1" },
      ],
    },
  },
  {
    slug: "content-publishing",
    name: "Content Publishing Pipeline",
    description: "Research, draft, review, and publish content with multi-agent collaboration.",
    category: "Marketing",
    graph: {
      nodes: [
        { id: "t1", type: "trigger_manual", label: "Content Brief", position: { x: 250, y: 50 }, config: {} },
        { id: "a1", type: "agent_action", label: "Research", position: { x: 250, y: 180 }, config: { agentKind: "RESEARCH_ANALYST", title: "Content Research", instructions: "Research the topic from the content brief. Find 5-10 recent, authoritative sources. Summarize key points, statistics, and expert quotes that should be included." } },
        { id: "a2", type: "agent_action", label: "Draft Article", position: { x: 250, y: 310 }, config: { agentKind: "MARKETING_COORDINATOR", title: "Draft Content", instructions: "Using the research provided, draft a compelling article. Follow brand voice guidelines. Include headers, key takeaways, and a call-to-action." } },
        { id: "a3", type: "agent_action", label: "SEO Review", position: { x: 250, y: 440 }, config: { agentKind: "SEO_SPECIALIST", title: "SEO Optimization", instructions: "Review the draft for SEO. Suggest keyword optimization, meta description, internal linking opportunities, and heading structure improvements." } },
        { id: "o1", type: "output", label: "Ready to Publish", position: { x: 250, y: 570 }, config: { format: "text", destination: "log" } },
      ],
      edges: [
        { id: "e1", source: "t1", target: "a1" },
        { id: "e2", source: "a1", target: "a2" },
        { id: "e3", source: "a2", target: "a3" },
        { id: "e4", source: "a3", target: "o1" },
      ],
    },
  },
  {
    slug: "weekly-finance-report",
    name: "Weekly Finance Report",
    description: "Every Monday, compile revenue data from Stripe and accounting platforms into a report.",
    category: "Finance",
    graph: {
      nodes: [
        { id: "t1", type: "trigger_schedule", label: "Monday 9 AM", position: { x: 250, y: 50 }, config: { cron: "0 9 * * 1" } },
        { id: "s1", type: "parallel_split", label: "Gather Data", position: { x: 250, y: 180 }, config: {} },
        { id: "a1", type: "agent_action", label: "Stripe Revenue", position: { x: 100, y: 310 }, config: { agentKind: "FINANCE_ANALYST", title: "Pull Stripe Data", instructions: "Get revenue overview from Stripe: last 7 days charges, MRR change, new subscriptions, and churned subscriptions. Compare to previous week." } },
        { id: "a2", type: "agent_action", label: "Accounting Data", position: { x: 400, y: 310 }, config: { agentKind: "FINANCE_ANALYST", title: "Pull Accounting Data", instructions: "Pull this week's P&L summary from QuickBooks or Xero. Highlight any unusual expenses or revenue changes versus last week." } },
        { id: "j1", type: "parallel_join", label: "Combine", position: { x: 250, y: 440 }, config: {} },
        { id: "a3", type: "agent_action", label: "Generate Report", position: { x: 250, y: 570 }, config: { agentKind: "FINANCE_ANALYST", title: "Weekly Finance Summary", instructions: "Compile the Stripe and accounting data into a concise weekly finance report. Include: total revenue, MRR, notable changes, and 3 key insights. Generate a PDF." } },
        { id: "o1", type: "output", label: "Report Ready", position: { x: 250, y: 700 }, config: { format: "text", destination: "log" } },
      ],
      edges: [
        { id: "e1", source: "t1", target: "s1" },
        { id: "e2", source: "s1", target: "a1" },
        { id: "e3", source: "s1", target: "a2" },
        { id: "e4", source: "a1", target: "j1" },
        { id: "e5", source: "a2", target: "j1" },
        { id: "e6", source: "j1", target: "a3" },
        { id: "e7", source: "a3", target: "o1" },
      ],
    },
  },
  {
    slug: "lead-qualification",
    name: "Lead Qualification",
    description: "When a new lead arrives, research the company, score the lead, and route accordingly.",
    category: "Sales",
    graph: {
      nodes: [
        { id: "t1", type: "trigger_event", label: "New Lead", position: { x: 250, y: 50 }, config: { eventType: "hubspot.contact.created" } },
        { id: "a1", type: "agent_action", label: "Research Company", position: { x: 250, y: 180 }, config: { agentKind: "RESEARCH_ANALYST", title: "Research Lead Company", instructions: "Look up the lead's company. Find: company size, industry, recent news, tech stack, and potential fit with our product. Score the lead as Hot, Warm, or Cold." } },
        { id: "c1", type: "condition", label: "Hot Lead?", position: { x: 250, y: 310 }, config: { field: "", operator: "contains", value: "Hot" } },
        { id: "a2", type: "agent_action", label: "Personal Outreach", position: { x: 100, y: 440 }, config: { agentKind: "SALES_REP", title: "Personal Outreach to Hot Lead", instructions: "This is a hot lead! Draft a personalized outreach email referencing the company research. Include a Calendly link for a demo call. Update HubSpot deal stage to 'Qualified'." } },
        { id: "a3", type: "agent_action", label: "Nurture Sequence", position: { x: 400, y: 440 }, config: { agentKind: "MARKETING_COORDINATOR", title: "Add to Nurture", instructions: "Add this lead to the email nurture sequence. Create a task to follow up in 2 weeks if no engagement." } },
        { id: "o1", type: "output", label: "Done", position: { x: 250, y: 570 }, config: { format: "text", destination: "log" } },
      ],
      edges: [
        { id: "e1", source: "t1", target: "a1" },
        { id: "e2", source: "a1", target: "c1" },
        { id: "e3", source: "c1", target: "a2", conditionBranch: "true" },
        { id: "e4", source: "c1", target: "a3", conditionBranch: "false" },
        { id: "e5", source: "a2", target: "o1" },
        { id: "e6", source: "a3", target: "o1" },
      ],
    },
  },
];

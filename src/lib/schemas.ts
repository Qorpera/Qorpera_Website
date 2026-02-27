import { z } from "zod";

// Auth
export const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const SignupBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Agents
const AgentTarget = z.enum(["CHIEF_ADVISOR", "ASSISTANT"]);

export const UpsertAutomationConfigBody = z.object({
  agentTarget: AgentTarget,
  triggerMode: z.enum(["MANUAL", "DELEGATED", "SCHEDULED", "HYBRID"]).optional(),
  wakeOnDelegation: z.boolean().optional(),
  scheduleEnabled: z.boolean().optional(),
  dailyTimes: z.array(z.string()).optional(),
  timezone: z.string().max(80).optional(),
  runContinuously: z.boolean().optional(),
  maxLoopIterations: z.number().int().min(1).max(20).optional(),
  maxAgentCallsPerRun: z.number().int().min(1).max(30).optional(),
  maxToolRetries: z.number().int().min(0).max(5).optional(),
  maxRuntimeSeconds: z.number().int().min(15).max(1800).optional(),
  requireApprovalForExternalActions: z.boolean().optional(),
  allowAgentDelegation: z.boolean().optional(),
  integrations: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
});

export const CreateDelegatedTaskBody = z.object({
  toAgentTarget: AgentTarget,
  fromAgent: z.string().max(80).optional(),
  title: z.string().min(1).max(240),
  instructions: z.string().min(1).max(12000),
  triggerSource: z.string().max(60).optional(),
  dueLabel: z.string().max(120).optional().nullable(),
  projectRef: z.string().max(240).optional().nullable(),
});

export const UpdateDelegatedTaskStatusBody = z.object({
  id: z.string().min(1),
  status: z.enum(["QUEUED", "RUNNING", "REVIEW", "DONE", "FAILED", "PAUSED"]),
});

export const RunDelegatedTaskBody = z.object({
  taskId: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(10).optional(),
});

export const ApproveExecuteBody = z.object({
  taskId: z.string().min(1),
});

export const HireBody = z.object({
  agentKind: z.enum(["ASSISTANT"]),
  schedule: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional().default("MONTHLY"),
  mode: z.enum(["HIRE", "LOCAL_DEMO"]).optional().default("HIRE"),
});

// Company soul
export const CompanySoulBody = z.object({
  companyName: z.string().max(200).optional(),
  oneLinePitch: z.string().max(500).optional(),
  mission: z.string().max(2000).optional(),
  idealCustomers: z.string().max(2000).optional(),
  coreOffers: z.string().max(2000).optional(),
  strategicGoals: z.string().max(2000).optional(),
  departments: z.string().max(2000).optional(),
  approvalRules: z.string().max(2000).optional(),
  toolsAndSystems: z.string().max(2000).optional(),
  keyMetrics: z.string().max(2000).optional(),
});

// Connectors
export const CloudConnectorBody = z.object({
  mode: z.enum(["MANAGED", "BYOK"]).optional(),
  provider: z.enum(["OPENAI", "ANTHROPIC", "GOOGLE"]).optional(),
  apiKey: z.string().optional(),
  label: z.string().max(200).optional(),
  monthlyRequestLimit: z.number().int().min(0).optional(),
  monthlyUsdLimit: z.number().min(0).optional(),
});

// Models
export const SetModelRouteBody = z.object({
  target: z.enum(["ADVISOR", "ASSISTANT"]),
  provider: z.enum(["OPENAI", "OLLAMA", "ANTHROPIC", "GOOGLE"]).optional().default("OPENAI"),
  modelName: z.string().max(120).optional(),
});

// Runner jobs
export const EnqueueRunnerJobBody = z.object({
  title: z.string().max(240).optional().default("Runner job"),
  jobType: z.string().max(80).optional().default("generic"),
  payload: z.record(z.string(), z.unknown()).optional().default({}),
  riskLevel: z.enum(["low", "medium", "high"]).optional(),
  approvalRequired: z.boolean().optional(),
  requestedBy: z.string().max(120).optional().nullable(),
  maxAttempts: z.number().int().min(1).max(10).optional(),
});

export const RunnerJobActionBody = z.object({
  id: z.string().min(1),
  action: z.enum(["approve", "cancel"]),
});

// Settings
export const SettingsBody = z.object({
  defaultAutonomy: z.enum(["DRAFT_ONLY", "APPROVAL", "AUTO"]).optional(),
  timezone: z.string().max(80).optional(),
  language: z.string().max(20).optional(),
  maxAgentOutputTokens: z.number().int().min(1024).max(32768).optional(),
}).passthrough();

// Inbox
export const InboxActionBody = z.object({
  action: z.enum(["approve", "edit", "ask_agent", "pause", "terminate"]),
});

// Submissions
export const SubmissionReviewBody = z.object({
  status: z.enum(["SUBMITTED", "ACCEPTED", "NEEDS_REVISION"]),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  correction: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),
});

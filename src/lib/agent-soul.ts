import { prisma } from "@/lib/db";
import { UI_AGENTS, type UiAgent, type AgentKindKey } from "@/lib/workforce-ui";
import { companySoulForAdvisor, getCompanySoul } from "@/lib/company-soul-store";
import { listBusinessFiles } from "@/lib/business-files-store";
import { listBusinessLogs } from "@/lib/business-logs-store";
import { listAdvisorSessions } from "@/lib/advisor-sessions-store";
import { getPreferredUsername } from "@/lib/usernames";

export type AgentSoulPack = {
  kind: AgentKindKey;
  agentName: string;
  agentUsername: string;
  ownerUsername: string;
  role: string;
  companyName: string | null;
  coreTruths: string[];
  boundaries: string[];
  roleIdentity: string[];
  companyAnchors: string[];
  operatingMemory: string[];
  promptText: string;
};

export type ChiefAdvisorSoulPack = {
  agentName: string;
  agentUsername: string;
  ownerUsername: string;
  role: string;
  coreTruths: string[];
  boundaries: string[];
  roleIdentity: string[];
  companyAnchors: string[];
  operatingMemory: string[];
  promptText: string;
};

const CORE_TRUTHS = [
  "Be genuinely helpful and execution-oriented, not verbose.",
  "Prefer safe progress over risky speed for external actions.",
  "Escalate low-confidence or irreversible actions for review.",
  "Stay aligned to company goals, KPIs, and approval rules.",
];

const BOUNDARIES = [
  "Do not perform external actions that violate approval rules.",
  "Do not invent company policies, metrics, or facts.",
  "Flag ambiguity early and request clarification in plain language.",
];

function buildRoleIdentity(ui: UiAgent) {
  return [
    `${ui.name} is the ${ui.role} agent for this business.`,
    `${ui.name}'s username is @${ui.username}.`,
    `Primary capabilities: ${ui.capabilities.slice(0, 3).join("; ")}.`,
    `Default autonomy: ${ui.autonomy}.`,
    `Permissions: ${ui.permissions.slice(0, 3).join("; ")}.`,
  ];
}

function buildCompanyAnchors(ui: UiAgent, company: Awaited<ReturnType<typeof getCompanySoul>>) {
  const soul = companySoulForAdvisor(company);
  const anchors: string[] = [];
  if (soul.companyName) anchors.push(`Company: ${soul.companyName}`);
  if (soul.oneLinePitch) anchors.push(`Business focus: ${soul.oneLinePitch}`);
  if (soul.strategicGoals.length) anchors.push(`Strategic goals: ${soul.strategicGoals.slice(0, 3).join(" | ")}`);
  if (soul.keyMetrics.length) anchors.push(`Success metrics: ${soul.keyMetrics.slice(0, 4).join(" | ")}`);
  if (soul.approvalRules.length) anchors.push(`Approval rules: ${soul.approvalRules.slice(0, 3).join(" | ")}`);
  if (soul.toolsAndSystems.length) anchors.push(`Systems: ${soul.toolsAndSystems.slice(0, 4).join(" | ")}`);
  if (soul.brandVoice && /support|content|sales|analyst|success|marketing|executive|coordinator/i.test(ui.role)) anchors.push(`Voice/style: ${soul.brandVoice}`);
  return anchors;
}

function buildPromptText(pack: Omit<AgentSoulPack, "promptText">) {
  return [
    "# AGENT SOUL",
    "",
    "## Core Truths",
    ...pack.coreTruths.map((t) => `- ${t}`),
    "",
    "## Boundaries",
    ...pack.boundaries.map((b) => `- ${b}`),
    "",
    "## Identity",
    ...pack.roleIdentity.map((i) => `- ${i}`),
    `- When speaking directly to the owner, address them as @${pack.ownerUsername}.`,
    "",
    "## Company Soul (Shared Context)",
    ...(pack.companyAnchors.length ? pack.companyAnchors.map((a) => `- ${a}`) : ["- Company soul not yet defined. Ask for company mission, goals, and approval rules before broad automation."]),
    "",
    "## Working Memory (Recent Outcomes)",
    ...(pack.operatingMemory.length ? pack.operatingMemory.map((m) => `- ${m}`) : ["- No recent recorded work memory yet. Start with a small reviewed pilot run."]),
  ].join("\n");
}

export async function getAgentSoulPackForUser(userId: string | null | undefined, kind: AgentKindKey): Promise<AgentSoulPack | null> {
  const ui = UI_AGENTS.find((a) => a.kind === kind);
  if (!ui) return null;

  const [dbAgent, company, owner, submissions, connectorLogs] = await Promise.all([
    prisma.agent.findUnique({ where: { kind } }),
    getCompanySoul(userId),
    userId ? prisma.user.findUnique({ where: { id: userId }, select: { email: true, username: true } }) : Promise.resolve(null),
    userId
      ? prisma.submission.findMany({ where: { userId, agentKind: kind }, orderBy: { createdAt: "desc" }, take: 4 })
      : Promise.resolve([]),
    userId
      ? prisma.auditLog.findMany({ where: { userId, scope: { in: ["INBOX", "PROJECT", "ADVISOR"] } }, orderBy: { createdAt: "desc" }, take: 6 })
      : Promise.resolve([]),
  ]);

  const operatingMemory = [
    ...submissions.map((s) => `${s.title} (${s.status.toLowerCase()}) on ${s.createdAt.toISOString().slice(0, 10)}`),
    ...connectorLogs.map((l) => l.summary),
  ].slice(0, 8);
  const agentUsername = dbAgent?.username ?? ui.username;
  const ownerUsername = getPreferredUsername({ email: owner?.email, username: owner?.username });

  const packBase = {
    kind,
    agentName: dbAgent?.name ?? ui.name,
    agentUsername,
    ownerUsername,
    role: ui.role,
    companyName: company.companyName || null,
    coreTruths: CORE_TRUTHS,
    boundaries: BOUNDARIES,
    roleIdentity: buildRoleIdentity({ ...ui, name: dbAgent?.name ?? ui.name, username: agentUsername }),
    companyAnchors: buildCompanyAnchors(ui, company),
    operatingMemory,
  };

  return {
    ...packBase,
    promptText: buildPromptText(packBase),
  };
}

export async function getAgentSoulBlueprintsForAdvisor(userId: string | null | undefined) {
  const packs = await Promise.all(UI_AGENTS.map((a) => getAgentSoulPackForUser(userId, a.kind)));
  return packs
    .filter((p): p is AgentSoulPack => Boolean(p))
    .map((p) => ({
      kind: p.kind,
      role: p.role,
      companyAnchors: p.companyAnchors.slice(0, 4),
      operatingMemory: p.operatingMemory.slice(0, 3),
      soulSummary: `${p.role}: ${[...p.coreTruths.slice(0, 2), ...p.boundaries.slice(0, 1)].join(" ")}`,
    }));
}

export function deriveAgentSoulHighlights(pack: AgentSoulPack | null) {
  if (!pack) return [];
  return [
    ...pack.coreTruths.slice(0, 2),
    ...pack.companyAnchors.slice(0, 2),
    ...pack.operatingMemory.slice(0, 2),
  ].slice(0, 6);
}

export async function getChiefAdvisorSoulPackForUser(userId: string | null | undefined): Promise<ChiefAdvisorSoulPack | null> {
  if (!userId) return null;
  const [company, logs, files, sessions, reviewAudit, owner] = await Promise.all([
    getCompanySoul(userId),
    listBusinessLogs(userId, 200),
    listBusinessFiles(userId, 500),
    listAdvisorSessions(userId, 200),
    prisma.auditLog.findMany({
      where: { userId, scope: { in: ["INBOX", "PROJECT", "RUN", "BUSINESS_FILE", "BUSINESS_LOG"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { email: true, username: true } }),
  ]);
  const ownerUsername = getPreferredUsername({ email: owner?.email, username: owner?.username });

  const soul = companySoulForAdvisor(company);
  const companyAnchors: string[] = [];
  if (soul.companyName) companyAnchors.push(`Company: ${soul.companyName}`);
  if (soul.oneLinePitch) companyAnchors.push(`Positioning: ${soul.oneLinePitch}`);
  if (soul.mission) companyAnchors.push(`Mission: ${soul.mission}`);
  if (soul.strategicGoals.length) companyAnchors.push(`Strategic goals: ${soul.strategicGoals.slice(0, 5).join(" | ")}`);
  if (soul.keyMetrics.length) companyAnchors.push(`Key metrics: ${soul.keyMetrics.slice(0, 6).join(" | ")}`);
  if (soul.approvalRules.length) companyAnchors.push(`Approval rules: ${soul.approvalRules.slice(0, 5).join(" | ")}`);
  if (soul.departments.length) companyAnchors.push(`Departments: ${soul.departments.slice(0, 8).join(" | ")}`);
  if (soul.toolsAndSystems.length) companyAnchors.push(`Systems: ${soul.toolsAndSystems.slice(0, 8).join(" | ")}`);

  const operatingMemory = [
    ...sessions.slice(0, 8).map((s) => `Advisor session: ${s.title} (${s.updatedAt.toISOString().slice(0, 10)})`),
    ...logs
      .filter((l) => !String(l.relatedRef ?? "").startsWith("CHAT_LOG:"))
      .slice(0, 8)
      .map((l) => `Business log: ${l.title} [${l.category.toLowerCase()}]`),
    ...files.slice(0, 8).map((f) => `Business file: ${f.name} [${f.category.toLowerCase()}]`),
    ...reviewAudit.slice(0, 10).map((l) => l.summary),
  ].slice(0, 20);

  const coreTruths = [
    "Act as the business operator's chief advisor, not a generic assistant.",
    "Prioritize decisions by business impact, risk, and execution bottlenecks.",
    "Use company soul and business logs as the operating memory of the business.",
    "Recommend concrete agent roles and phased rollout plans with approvals.",
  ];
  const boundaries = [
    "Do not ignore approval rules or invent company facts.",
    "Do not optimize for novelty over operational reliability.",
    "Flag missing strategy inputs before recommending broad automation.",
  ];
  const roleIdentity = [
    "Chief Advisor is the primary advisor agent for Zygenic.",
    "Chief Advisor's username is @chief_advisor.",
    "Chief Advisor understands the whole business and helps the owner decide what matters now.",
    "Chief Advisor recommends which agents to hire, how to onboard them, and how to sequence work safely.",
    `When speaking directly to the owner, address them as @${ownerUsername}.`,
  ];

  const promptText = [
    "# CHIEF ADVISOR SOUL",
    "",
    "## Core Truths",
    ...coreTruths.map((t) => `- ${t}`),
    "",
    "## Boundaries",
    ...boundaries.map((b) => `- ${b}`),
    "",
    "## Identity",
    ...roleIdentity.map((i) => `- ${i}`),
    "",
    "## Company Anchors",
    ...(companyAnchors.length ? companyAnchors.map((a) => `- ${a}`) : ["- Company Soul is incomplete. Prioritize defining mission, goals, and approval rules."]),
    "",
    "## Operating Memory",
    ...(operatingMemory.length ? operatingMemory.map((m) => `- ${m}`) : ["- No business memory entries yet. Build memory through logs, files, and reviewed runs."]),
  ].join("\n");

  return {
    agentName: "Chief Advisor",
    agentUsername: "chief_advisor",
    ownerUsername,
    role: "Primary Business Advisor",
    coreTruths,
    boundaries,
    roleIdentity,
    companyAnchors,
    operatingMemory,
    promptText,
  };
}

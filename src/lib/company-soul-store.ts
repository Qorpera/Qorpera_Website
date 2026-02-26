import { prisma } from "@/lib/db";

export type CompanySoulProfile = {
  companyName: string;
  oneLinePitch: string;
  mission: string;
  idealCustomers: string;
  coreOffers: string;
  revenueModel: string;
  strategicGoals: string;
  constraints: string;
  brandVoice: string;
  departments: string;
  operatingCadence: string;
  approvalRules: string;
  toolsAndSystems: string;
  keyMetrics: string;
  glossary: string;
  notesForAgents: string;
  updatedAt?: string | null;
};

export const DEFAULT_COMPANY_SOUL: CompanySoulProfile = {
  companyName: "",
  oneLinePitch: "",
  mission: "",
  idealCustomers: "",
  coreOffers: "",
  revenueModel: "",
  strategicGoals: "",
  constraints: "",
  brandVoice: "",
  departments: "",
  operatingCadence: "",
  approvalRules: "",
  toolsAndSystems: "",
  keyMetrics: "",
  glossary: "",
  notesForAgents: "",
  updatedAt: null,
};

function normalizeText(value: unknown, max = 6000) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function fromDb(row: {
  companyName: string;
  oneLinePitch: string;
  mission: string;
  idealCustomers: string;
  coreOffers: string;
  revenueModel: string;
  strategicGoals: string;
  constraints: string;
  brandVoice: string;
  departments: string;
  operatingCadence: string;
  approvalRules: string;
  toolsAndSystems: string;
  keyMetrics: string;
  glossary: string;
  notesForAgents: string;
  updatedAt: Date;
}): CompanySoulProfile {
  return {
    companyName: row.companyName,
    oneLinePitch: row.oneLinePitch,
    mission: row.mission,
    idealCustomers: row.idealCustomers,
    coreOffers: row.coreOffers,
    revenueModel: row.revenueModel,
    strategicGoals: row.strategicGoals,
    constraints: row.constraints,
    brandVoice: row.brandVoice,
    departments: row.departments,
    operatingCadence: row.operatingCadence,
    approvalRules: row.approvalRules,
    toolsAndSystems: row.toolsAndSystems,
    keyMetrics: row.keyMetrics,
    glossary: row.glossary,
    notesForAgents: row.notesForAgents,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getCompanySoul(userId?: string | null): Promise<CompanySoulProfile> {
  if (!userId) return DEFAULT_COMPANY_SOUL;
  const row = await prisma.companySoul.findUnique({ where: { userId } });
  if (!row) return DEFAULT_COMPANY_SOUL;
  return fromDb(row);
}

export async function setCompanySoul(userId: string, patch: Partial<CompanySoulProfile>) {
  const data = {
    companyName: normalizeText(patch.companyName, 240),
    oneLinePitch: normalizeText(patch.oneLinePitch, 600),
    mission: normalizeText(patch.mission, 1200),
    idealCustomers: normalizeText(patch.idealCustomers, 2000),
    coreOffers: normalizeText(patch.coreOffers, 2000),
    revenueModel: normalizeText(patch.revenueModel, 1200),
    strategicGoals: normalizeText(patch.strategicGoals, 2500),
    constraints: normalizeText(patch.constraints, 2500),
    brandVoice: normalizeText(patch.brandVoice, 1200),
    departments: normalizeText(patch.departments, 2000),
    operatingCadence: normalizeText(patch.operatingCadence, 2000),
    approvalRules: normalizeText(patch.approvalRules, 2500),
    toolsAndSystems: normalizeText(patch.toolsAndSystems, 2500),
    keyMetrics: normalizeText(patch.keyMetrics, 2000),
    glossary: normalizeText(patch.glossary, 2500),
    notesForAgents: normalizeText(patch.notesForAgents, 4000),
  };

  const row = await prisma.companySoul.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      scope: "COMPANY_SOUL",
      entityId: row.id,
      action: "UPSERT",
      summary: `Updated company soul profile for ${row.companyName || "company"}`,
    },
  });

  return fromDb(row);
}

function lines(text: string, max = 8) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, max);
}

export function companySoulForAdvisor(profile: CompanySoulProfile) {
  return {
    companyName: profile.companyName || null,
    oneLinePitch: profile.oneLinePitch || null,
    mission: profile.mission || null,
    idealCustomers: lines(profile.idealCustomers, 8),
    coreOffers: lines(profile.coreOffers, 8),
    revenueModel: profile.revenueModel || null,
    strategicGoals: lines(profile.strategicGoals, 10),
    constraints: lines(profile.constraints, 10),
    brandVoice: profile.brandVoice || null,
    departments: lines(profile.departments, 12),
    operatingCadence: lines(profile.operatingCadence, 10),
    approvalRules: lines(profile.approvalRules, 12),
    toolsAndSystems: lines(profile.toolsAndSystems, 14),
    keyMetrics: lines(profile.keyMetrics, 12),
    glossary: lines(profile.glossary, 16),
    notesForAgents: profile.notesForAgents || null,
    completenessScore: [
      profile.companyName,
      profile.oneLinePitch,
      profile.mission,
      profile.idealCustomers,
      profile.coreOffers,
      profile.strategicGoals,
      profile.departments,
      profile.approvalRules,
      profile.toolsAndSystems,
      profile.keyMetrics,
    ].filter((v) => v.trim().length > 0).length,
  };
}


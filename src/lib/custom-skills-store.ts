/**
 * Custom skills store — CRUD for user-created markdown-based skills.
 */

import { prisma } from "@/lib/db";
import crypto from "node:crypto";

export type CustomSkillInput = {
  name: string;
  displayName: string;
  shortDescription?: string;
  category?: string;
  requirementsJson?: string;
  skillMdContent: string;
  scriptsJson?: string;
  referencesJson?: string;
};

export async function listCustomSkills(userId: string) {
  return prisma.customSkill.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      displayName: true,
      shortDescription: true,
      category: true,
      enabled: true,
      isPublished: true,
      validationStatus: true,
      version: true,
      lastTestedAt: true,
      updatedAt: true,
    },
  });
}

export async function getCustomSkill(userId: string, id: string) {
  return prisma.customSkill.findFirst({
    where: { id, userId },
  });
}

export async function createCustomSkill(userId: string, input: CustomSkillInput) {
  const validation = validateSkillMd(input.skillMdContent);

  return prisma.customSkill.create({
    data: {
      userId,
      name: input.name.slice(0, 80).toLowerCase().replace(/[^a-z0-9_-]/g, "-"),
      displayName: input.displayName.slice(0, 120),
      shortDescription: (input.shortDescription ?? "").slice(0, 300),
      category: input.category ?? "general",
      requirementsJson: input.requirementsJson ?? null,
      skillMdContent: input.skillMdContent.slice(0, 50000),
      scriptsJson: input.scriptsJson ?? null,
      referencesJson: input.referencesJson ?? null,
      validationStatus: validation.valid ? "VALID" : "INVALID",
      validationErrors: validation.errors.length > 0 ? validation.errors.join("; ") : null,
    },
  });
}

export async function updateCustomSkill(userId: string, id: string, input: Partial<CustomSkillInput> & { enabled?: boolean }) {
  const existing = await prisma.customSkill.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const data: Record<string, unknown> = {};
  if (input.displayName !== undefined) data.displayName = input.displayName.slice(0, 120);
  if (input.shortDescription !== undefined) data.shortDescription = input.shortDescription.slice(0, 300);
  if (input.category !== undefined) data.category = input.category;
  if (input.requirementsJson !== undefined) data.requirementsJson = input.requirementsJson;
  if (input.scriptsJson !== undefined) data.scriptsJson = input.scriptsJson;
  if (input.referencesJson !== undefined) data.referencesJson = input.referencesJson;
  if (input.enabled !== undefined) data.enabled = input.enabled;

  if (input.skillMdContent !== undefined) {
    data.skillMdContent = input.skillMdContent.slice(0, 50000);
    data.version = existing.version + 1;
    const validation = validateSkillMd(input.skillMdContent);
    data.validationStatus = validation.valid ? "VALID" : "INVALID";
    data.validationErrors = validation.errors.length > 0 ? validation.errors.join("; ") : null;
  }

  return prisma.customSkill.update({ where: { id }, data });
}

export async function deleteCustomSkill(userId: string, id: string) {
  const existing = await prisma.customSkill.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await prisma.customSkill.delete({ where: { id } });
  return true;
}

export function validateSkillMd(content: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!content || content.trim().length < 20) {
    errors.push("Skill content must be at least 20 characters");
  }
  if (content.length > 50000) {
    errors.push("Skill content exceeds 50,000 character limit");
  }

  // Check for frontmatter
  const hasFrontmatter = content.startsWith("---");
  if (!hasFrontmatter) {
    errors.push("Skill should start with YAML frontmatter (---) for metadata");
  }

  // Check for common instruction patterns
  const hasInstructions = /#{1,3}\s+(instructions|steps|process|workflow|guide)/i.test(content);
  if (!hasInstructions) {
    errors.push("Skill should contain an Instructions/Steps/Process section");
  }

  return { valid: errors.length === 0, errors };
}

export async function publishSkill(userId: string, id: string): Promise<string | null> {
  const existing = await prisma.customSkill.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const shareToken = existing.shareToken ?? crypto.randomBytes(16).toString("hex");

  await prisma.customSkill.update({
    where: { id },
    data: { isPublished: true, shareToken },
  });

  return shareToken;
}

export async function unpublishSkill(userId: string, id: string) {
  await prisma.customSkill.updateMany({
    where: { id, userId },
    data: { isPublished: false },
  });
}

export async function importSkill(userId: string, shareToken: string) {
  const source = await prisma.customSkill.findFirst({
    where: { shareToken, isPublished: true },
  });
  if (!source) return null;

  return createCustomSkill(userId, {
    name: source.name + "-imported",
    displayName: source.displayName,
    shortDescription: source.shortDescription,
    category: source.category,
    requirementsJson: source.requirementsJson ?? undefined,
    skillMdContent: source.skillMdContent,
    scriptsJson: source.scriptsJson ?? undefined,
    referencesJson: source.referencesJson ?? undefined,
  });
}

export async function testSkillDryRun(userId: string, id: string): Promise<{ success: boolean; result: string }> {
  const skill = await prisma.customSkill.findFirst({ where: { id, userId } });
  if (!skill) return { success: false, result: "Skill not found" };

  // Simple validation test — ensure it parses and has valid structure
  const validation = validateSkillMd(skill.skillMdContent);
  const now = new Date();

  await prisma.customSkill.update({
    where: { id },
    data: {
      lastTestedAt: now,
      lastTestResult: validation.valid ? "PASS" : `FAIL: ${validation.errors.join("; ")}`,
    },
  });

  return {
    success: validation.valid,
    result: validation.valid ? "Skill validation passed" : `Validation failed: ${validation.errors.join("; ")}`,
  };
}

/**
 * Get enabled custom skills for a user (for injection into agent prompts).
 */
export async function getEnabledCustomSkills(userId: string): Promise<Array<{
  name: string;
  displayName: string;
  content: string;
}>> {
  const skills = await prisma.customSkill.findMany({
    where: { userId, enabled: true, validationStatus: "VALID" },
    select: { name: true, displayName: true, skillMdContent: true },
    orderBy: { updatedAt: "desc" },
  });
  return skills.map((s) => ({
    name: s.name,
    displayName: s.displayName,
    content: s.skillMdContent,
  }));
}

/**
 * Auto-approval rules store.
 * Allows users to define rules that automatically approve certain inbox actions
 * (e.g. "auto-approve slack_post_message to #general channel").
 */

import { prisma } from "@/lib/db";

export type AutoApprovalRule = {
  id: string;
  userId: string;
  name: string;
  toolName: string; // exact tool name, or "*" for all approval_required tools
  conditionJson: string | null; // JSON condition matching args, e.g. {"channel": "#general"}
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function getAutoApprovalRules(userId: string): Promise<AutoApprovalRule[]> {
  const rows = await prisma.$queryRaw<AutoApprovalRule[]>`
    SELECT * FROM "AutoApprovalRule"
    WHERE "userId" = ${userId} AND "enabled" = true
    ORDER BY "createdAt" ASC
  `;
  return rows;
}

export async function getAllAutoApprovalRules(userId: string): Promise<AutoApprovalRule[]> {
  const rows = await prisma.$queryRaw<AutoApprovalRule[]>`
    SELECT * FROM "AutoApprovalRule"
    WHERE "userId" = ${userId}
    ORDER BY "createdAt" ASC
  `;
  return rows;
}

export async function createAutoApprovalRule(
  userId: string,
  data: { name: string; toolName: string; conditionJson?: string | null },
): Promise<AutoApprovalRule> {
  const rows = await prisma.$queryRaw<AutoApprovalRule[]>`
    INSERT INTO "AutoApprovalRule" (id, "userId", name, "toolName", "conditionJson", enabled, "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, ${userId}, ${data.name}, ${data.toolName}, ${data.conditionJson ?? null}, true, now(), now())
    RETURNING *
  `;
  return rows[0]!;
}

export async function updateAutoApprovalRule(
  userId: string,
  ruleId: string,
  data: Partial<{ name: string; toolName: string; conditionJson: string | null; enabled: boolean }>,
): Promise<AutoApprovalRule | null> {
  const existing = await prisma.$queryRaw<AutoApprovalRule[]>`
    SELECT * FROM "AutoApprovalRule" WHERE id = ${ruleId} AND "userId" = ${userId}
  `;
  if (!existing[0]) return null;

  const name = data.name ?? existing[0].name;
  const toolName = data.toolName ?? existing[0].toolName;
  const conditionJson = "conditionJson" in data ? data.conditionJson : existing[0].conditionJson;
  const enabled = data.enabled ?? existing[0].enabled;

  const rows = await prisma.$queryRaw<AutoApprovalRule[]>`
    UPDATE "AutoApprovalRule"
    SET name = ${name}, "toolName" = ${toolName}, "conditionJson" = ${conditionJson},
        enabled = ${enabled}, "updatedAt" = now()
    WHERE id = ${ruleId} AND "userId" = ${userId}
    RETURNING *
  `;
  return rows[0] ?? null;
}

export async function deleteAutoApprovalRule(userId: string, ruleId: string): Promise<boolean> {
  await prisma.$executeRaw`
    DELETE FROM "AutoApprovalRule" WHERE id = ${ruleId} AND "userId" = ${userId}
  `;
  return true;
}

/**
 * Check if a pending action should be auto-approved given the user's rules.
 * Returns the matching rule name if auto-approved, null otherwise.
 */
export async function checkAutoApproval(
  userId: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<string | null> {
  let rules: AutoApprovalRule[];
  try {
    rules = await getAutoApprovalRules(userId);
  } catch {
    // Table may not exist yet
    return null;
  }

  for (const rule of rules) {
    if (rule.toolName !== "*" && rule.toolName !== toolName) continue;

    // No condition = always matches this tool
    if (!rule.conditionJson) return rule.name;

    // Condition must be a JSON object with key-value pairs all present in args
    try {
      const condition = JSON.parse(rule.conditionJson) as Record<string, unknown>;
      const allMatch = Object.entries(condition).every(([k, v]) => {
        const argVal = args[k];
        if (typeof v === "string" && typeof argVal === "string") {
          return argVal.toLowerCase().includes(v.toLowerCase());
        }
        return argVal === v;
      });
      if (allMatch) return rule.name;
    } catch {
      // Invalid condition JSON, skip
    }
  }

  return null;
}

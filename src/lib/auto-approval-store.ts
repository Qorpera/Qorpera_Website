import { prisma } from "@/lib/db";

export type AutoApprovalRuleView = {
  id: string;
  name: string;
  toolName: string;
  conditionJson: string | null;
  enabled: boolean;
  createdAt: string;
};

function toView(r: {
  id: string;
  name: string;
  toolName: string;
  conditionJson: string | null;
  enabled: boolean;
  createdAt: Date;
}): AutoApprovalRuleView {
  return {
    id: r.id,
    name: r.name,
    toolName: r.toolName,
    conditionJson: r.conditionJson,
    enabled: r.enabled,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function listAutoApprovalRules(userId: string): Promise<AutoApprovalRuleView[]> {
  const rows = await prisma.autoApprovalRule.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toView);
}

export async function createAutoApprovalRule(
  userId: string,
  input: { name: string; toolName: string; conditionJson?: string | null },
): Promise<AutoApprovalRuleView> {
  const row = await prisma.autoApprovalRule.create({
    data: {
      userId,
      name: input.name,
      toolName: input.toolName,
      conditionJson: input.conditionJson ?? null,
    },
  });
  return toView(row);
}

export async function updateAutoApprovalRule(
  userId: string,
  id: string,
  input: Partial<{ name: string; toolName: string; conditionJson: string | null; enabled: boolean }>,
): Promise<AutoApprovalRuleView> {
  const existing = await prisma.autoApprovalRule.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Rule not found");
  const row = await prisma.autoApprovalRule.update({ where: { id }, data: input });
  return toView(row);
}

export async function deleteAutoApprovalRule(userId: string, id: string): Promise<void> {
  const existing = await prisma.autoApprovalRule.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Rule not found");
  await prisma.autoApprovalRule.delete({ where: { id } });
}

/**
 * Returns the matching rule name if the tool call should be auto-approved, otherwise null.
 * Checks enabled rules where toolName matches (or is "*") and all conditionJson
 * key-value pairs match the args (substring match for strings, exact otherwise).
 */
export async function checkAutoApproval(
  userId: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<string | null> {
  const rules = await prisma.autoApprovalRule.findMany({
    where: { userId, enabled: true, toolName: { in: [toolName, "*"] } },
  });

  for (const rule of rules) {
    if (!rule.conditionJson) return rule.name;
    let conditions: Record<string, unknown>;
    try {
      conditions = JSON.parse(rule.conditionJson) as Record<string, unknown>;
    } catch {
      continue;
    }
    const allMatch = Object.entries(conditions).every(([k, v]) => {
      const argVal = args[k];
      if (argVal === undefined) return false;
      if (typeof v === "string" && typeof argVal === "string") {
        return argVal.toLowerCase().includes(v.toLowerCase());
      }
      return argVal === v;
    });
    if (allMatch) return rule.name;
  }
  return null;
}

/**
 * Event routing engine.
 * Matches inbound webhook events to EventRoutingRules and builds tasks from them.
 */

import { prisma } from "@/lib/db";

export type RoutingMatch = {
  ruleId: string;
  agentTarget: string;
  taskTitle: string;
  taskInstructions: string;
  priority: number;
};

/**
 * Glob-like pattern matching. Supports:
 * - "*" matches everything
 * - "prefix.*" matches "prefix.anything"
 * - "exact" matches exactly
 */
function matchGlobPattern(pattern: string, value: string): boolean {
  if (pattern === "*") return true;
  if (!pattern.includes("*")) return pattern === value;
  const regex = new RegExp("^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$");
  return regex.test(value);
}

/**
 * Check if a JSON condition matches the event payload.
 * conditionJson is a flat object of key-value pairs; all must match (substring for strings).
 */
function matchCondition(conditionJson: string | null, payload: Record<string, unknown>): boolean {
  if (!conditionJson) return true;
  try {
    const conditions = JSON.parse(conditionJson) as Record<string, unknown>;
    for (const [key, expected] of Object.entries(conditions)) {
      const actual = getNestedValue(payload, key);
      if (actual === undefined) return false;
      if (typeof expected === "string" && typeof actual === "string") {
        if (!actual.toLowerCase().includes(expected.toLowerCase())) return false;
      } else if (actual !== expected) {
        return false;
      }
    }
    return true;
  } catch {
    return true; // malformed condition = no filter
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Build a task title and instructions from a routing rule's transform template,
 * or fall back to a summarized version.
 */
function buildTaskFromRule(
  rule: { transformJson: string | null; agentTarget: string },
  event: { provider: string; eventType: string; payload: string },
): { taskTitle: string; taskInstructions: string } {
  const payloadStr = event.payload.slice(0, 4000);

  if (rule.transformJson) {
    try {
      const transform = JSON.parse(rule.transformJson) as { title?: string; instructions?: string };
      return {
        taskTitle: (transform.title ?? `${event.provider} ${event.eventType}`).slice(0, 200),
        taskInstructions: (transform.instructions ?? `Process this ${event.provider} event:\n${payloadStr}`).slice(0, 8000),
      };
    } catch {
      // fall through to default
    }
  }

  return {
    taskTitle: `Handle ${event.provider} ${event.eventType} event`,
    taskInstructions: `An external event was received from ${event.provider} (type: ${event.eventType}). Process it appropriately.\n\nEvent payload:\n${payloadStr}`,
  };
}

/**
 * Route an event against all active rules for a user.
 * Returns the best match (highest priority) or null if no rules match.
 */
export async function routeEvent(
  userId: string,
  event: { provider: string; eventType: string; payload: string },
): Promise<RoutingMatch | null> {
  const rules = await prisma.eventRoutingRule.findMany({
    where: { userId, enabled: true },
    orderBy: { priority: "asc" },
  });

  let parsedPayload: Record<string, unknown> = {};
  try {
    parsedPayload = JSON.parse(event.payload) as Record<string, unknown>;
  } catch {
    // non-JSON payload — condition matching won't work, pattern matching still applies
  }

  for (const rule of rules) {
    const providerMatch = matchGlobPattern(rule.provider, event.provider);
    const eventMatch = matchGlobPattern(rule.eventPattern, event.eventType);
    if (!providerMatch || !eventMatch) continue;
    if (!matchCondition(rule.conditionJson, parsedPayload)) continue;

    const { taskTitle, taskInstructions } = buildTaskFromRule(rule, event);

    return {
      ruleId: rule.id,
      agentTarget: rule.agentTarget,
      taskTitle,
      taskInstructions,
      priority: rule.priority,
    };
  }

  return null;
}

/**
 * Check if any routing rule matches (without building task).
 */
export async function hasMatchingRule(
  userId: string,
  provider: string,
  eventType: string,
): Promise<boolean> {
  const rules = await prisma.eventRoutingRule.findMany({
    where: { userId, enabled: true, provider: { in: [provider, "*"] } },
    select: { eventPattern: true },
  });

  return rules.some((r) => matchGlobPattern(r.eventPattern, eventType));
}

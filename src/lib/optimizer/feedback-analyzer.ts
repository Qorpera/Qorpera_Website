/**
 * Feedback analyzer — identifies recurring patterns in submission feedback.
 */

import { prisma } from "@/lib/db";
import { callAgentLlm } from "@/lib/agent-llm";
import type { AgentKindRouteKey } from "@/lib/model-routing-store";

export type FeedbackSummary = {
  totalSubmissions: number;
  needsRevision: number;
  revisionRate: number;
  patterns: Array<{
    id: string;
    pattern: string;
    frequency: number;
    severity: string;
    addressed: boolean;
  }>;
};

export async function getFeedbackSummary(userId: string, agentKind: string): Promise<FeedbackSummary> {
  const [totalSubmissions, needsRevision, patterns] = await Promise.all([
    prisma.submission.count({ where: { userId, agentKind: agentKind as never } }),
    prisma.submission.count({ where: { userId, agentKind: agentKind as never, status: "NEEDS_REVISION" } }),
    prisma.feedbackPattern.findMany({
      where: { userId, agentKind },
      orderBy: { frequency: "desc" },
      select: { id: true, pattern: true, frequency: true, severity: true, addressed: true },
    }),
  ]);

  return {
    totalSubmissions,
    needsRevision,
    revisionRate: totalSubmissions > 0 ? needsRevision / totalSubmissions : 0,
    patterns,
  };
}

/**
 * Analyze recent low-rated submissions and identify recurring feedback patterns.
 */
export async function analyzeFeedbackPatterns(userId: string, agentKind: string): Promise<number> {
  const recentRevisions = await prisma.submission.findMany({
    where: {
      userId,
      agentKind: agentKind as never,
      status: "NEEDS_REVISION",
      updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // last 30 days
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, title: true, correction: true, notes: true, output: true },
  });

  if (recentRevisions.length < 3) return 0;

  // Use LLM to identify patterns
  const feedbackSummaries = recentRevisions.map((r) => {
    const parts: string[] = [];
    if (r.correction) parts.push(`Correction: ${r.correction.slice(0, 200)}`);
    if (r.notes) parts.push(`Notes: ${r.notes.slice(0, 200)}`);
    return `- ${r.title}: ${parts.join(" | ") || "Needs revision (no details)"}`;
  }).join("\n");

  const result = await callAgentLlm({
    userId,
    agentKind: "CHIEF_ADVISOR" as AgentKindRouteKey,
    systemPrompt: "Identify recurring patterns in agent submission feedback. Return a JSON array of {pattern: string, severity: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL', examples: string[]}. Return ONLY JSON.",
    userMessage: `Recent revision requests for ${agentKind}:\n${feedbackSummaries}`,
  });

  if (result.error || !result.text) return 0;

  try {
    const jsonMatch = result.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return 0;
    const patterns = JSON.parse(jsonMatch[0]) as Array<{
      pattern: string;
      severity: string;
      examples?: string[];
    }>;

    let upserted = 0;
    for (const p of patterns.slice(0, 10)) {
      const existing = await prisma.feedbackPattern.findFirst({
        where: { userId, agentKind, pattern: p.pattern },
      });

      if (existing) {
        await prisma.feedbackPattern.update({
          where: { id: existing.id },
          data: {
            frequency: { increment: 1 },
            severity: p.severity || existing.severity,
            lastSeenAt: new Date(),
          },
        });
      } else {
        await prisma.feedbackPattern.create({
          data: {
            userId,
            agentKind,
            pattern: p.pattern.slice(0, 500),
            severity: p.severity || "MEDIUM",
            examples: JSON.stringify(p.examples ?? []),
          },
        });
      }
      upserted++;
    }
    return upserted;
  } catch {
    return 0;
  }
}

/**
 * Generate concrete actions to address unaddressed feedback patterns.
 */
export async function generateFeedbackActions(
  userId: string,
  agentKind: string,
): Promise<Array<{ patternId: string; pattern: string; action: string; patchText: string }>> {
  const patterns = await prisma.feedbackPattern.findMany({
    where: { userId, agentKind, addressed: false },
    orderBy: [{ severity: "desc" }, { frequency: "desc" }],
    take: 5,
  });

  if (patterns.length === 0) return [];

  const patternList = patterns.map((p) => `- [${p.severity}] "${p.pattern}" (seen ${p.frequency}x)`).join("\n");

  const result = await callAgentLlm({
    userId,
    agentKind: "CHIEF_ADVISOR" as AgentKindRouteKey,
    systemPrompt: "Generate prompt patches to address recurring feedback patterns. For each pattern, provide a concrete instruction to append to the agent's system prompt. Return JSON array of {patternId: string, action: string, patchText: string}. Return ONLY JSON.",
    userMessage: `Feedback patterns for ${agentKind}:\n${patternList}\n\nPattern IDs: ${patterns.map((p) => p.id).join(", ")}`,
  });

  if (result.error || !result.text) return [];

  try {
    const jsonMatch = result.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const actions = JSON.parse(jsonMatch[0]) as Array<{ patternId: string; action: string; patchText: string }>;
    return actions.map((a) => ({
      patternId: a.patternId,
      pattern: patterns.find((p) => p.id === a.patternId)?.pattern ?? "",
      action: String(a.action).slice(0, 500),
      patchText: String(a.patchText).slice(0, 2000),
    }));
  } catch {
    return [];
  }
}

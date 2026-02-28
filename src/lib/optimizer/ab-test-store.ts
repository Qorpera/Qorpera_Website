/**
 * A/B test store — manages prompt variant experiments.
 */

import { prisma } from "@/lib/db";
import crypto from "node:crypto";

/**
 * Create an A/B test between current prompt (control) and a variant.
 */
export async function createAbTest(input: {
  userId: string;
  agentKind: string;
  label: string;
  patchText: string;
  sourceActionId?: string;
  trafficPercent?: number;
}): Promise<string> {
  // Ensure a control variant exists
  const existingControl = await prisma.promptVariant.findFirst({
    where: { userId: input.userId, agentKind: input.agentKind, isControl: true, isActive: true },
  });

  if (!existingControl) {
    await prisma.promptVariant.create({
      data: {
        userId: input.userId,
        agentKind: input.agentKind,
        label: "Control (baseline)",
        patchText: "",
        isActive: true,
        isControl: true,
        trafficPercent: 100 - (input.trafficPercent ?? 50),
      },
    });
  } else {
    await prisma.promptVariant.update({
      where: { id: existingControl.id },
      data: { trafficPercent: 100 - (input.trafficPercent ?? 50) },
    });
  }

  const variant = await prisma.promptVariant.create({
    data: {
      userId: input.userId,
      agentKind: input.agentKind,
      label: input.label.slice(0, 200),
      patchText: input.patchText.slice(0, 5000),
      sourceActionId: input.sourceActionId ?? null,
      isActive: true,
      isControl: false,
      trafficPercent: input.trafficPercent ?? 50,
    },
  });

  return variant.id;
}

/**
 * Assign a variant to a task using deterministic hash-based assignment.
 */
export async function assignVariant(
  userId: string,
  agentKind: string,
  delegatedTaskId: string,
): Promise<{ variantId: string; patchText: string } | null> {
  const variants = await prisma.promptVariant.findMany({
    where: { userId, agentKind, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  if (variants.length < 2) return null;

  // Deterministic hash-based assignment
  const hash = crypto.createHash("sha256").update(delegatedTaskId).digest();
  const bucket = hash.readUInt16BE(0) % 100;

  let cumulative = 0;
  let assigned = variants[0];
  for (const v of variants) {
    cumulative += v.trafficPercent;
    if (bucket < cumulative) {
      assigned = v;
      break;
    }
  }

  await prisma.promptVariantTaskAssignment.create({
    data: { variantId: assigned.id, delegatedTaskId },
  }).catch(() => { /* duplicate assignment, ignore */ });

  await prisma.promptVariant.update({
    where: { id: assigned.id },
    data: { taskCount: { increment: 1 } },
  });

  return { variantId: assigned.id, patchText: assigned.patchText };
}

/**
 * Record the outcome of a task for its assigned variant.
 */
export async function recordVariantOutcome(
  delegatedTaskId: string,
  rating: number | null,
  accepted: boolean,
) {
  const assignment = await prisma.promptVariantTaskAssignment.findUnique({
    where: { delegatedTaskId },
  });
  if (!assignment) return;

  await prisma.promptVariantTaskAssignment.update({
    where: { id: assignment.id },
    data: { rating, accepted },
  });

  // Update variant stats
  const allAssignments = await prisma.promptVariantTaskAssignment.findMany({
    where: { variantId: assignment.variantId },
    select: { rating: true, accepted: true },
  });

  const rated = allAssignments.filter((a) => a.rating != null);
  const avgRating = rated.length > 0 ? rated.reduce((s, a) => s + (a.rating ?? 0), 0) / rated.length : 0;
  const decided = allAssignments.filter((a) => a.accepted != null);
  const acceptRate = decided.length > 0 ? decided.filter((a) => a.accepted).length / decided.length : 0;
  const revisionRate = decided.length > 0 ? decided.filter((a) => !a.accepted).length / decided.length : 0;

  await prisma.promptVariant.update({
    where: { id: assignment.variantId },
    data: { avgRating: Math.round(avgRating * 100) / 100, acceptRate: Math.round(acceptRate * 1000) / 1000, revisionRate: Math.round(revisionRate * 1000) / 1000 },
  });
}

/**
 * Evaluate an A/B test. Returns whether the variant is statistically better.
 */
export async function evaluateAbTest(
  userId: string,
  agentKind: string,
): Promise<{
  ready: boolean;
  variantBetter: boolean;
  controlAcceptRate: number;
  variantAcceptRate: number;
  sampleSize: number;
}> {
  const variants = await prisma.promptVariant.findMany({
    where: { userId, agentKind, isActive: true },
    orderBy: { isControl: "desc" },
  });

  if (variants.length < 2) return { ready: false, variantBetter: false, controlAcceptRate: 0, variantAcceptRate: 0, sampleSize: 0 };

  const control = variants.find((v) => v.isControl);
  const variant = variants.find((v) => !v.isControl);
  if (!control || !variant) return { ready: false, variantBetter: false, controlAcceptRate: 0, variantAcceptRate: 0, sampleSize: 0 };

  const minSample = 10;
  const ready = control.taskCount >= minSample && variant.taskCount >= minSample;

  return {
    ready,
    variantBetter: ready && variant.acceptRate > control.acceptRate,
    controlAcceptRate: control.acceptRate,
    variantAcceptRate: variant.acceptRate,
    sampleSize: control.taskCount + variant.taskCount,
  };
}

/**
 * Promote a variant to become the new baseline.
 */
export async function promoteVariant(variantId: string) {
  const variant = await prisma.promptVariant.findUnique({ where: { id: variantId } });
  if (!variant) return;

  // Deactivate all current variants for this agent
  await prisma.promptVariant.updateMany({
    where: { userId: variant.userId, agentKind: variant.agentKind, isActive: true },
    data: { isActive: false },
  });

  // Make the variant the new control
  await prisma.promptVariant.update({
    where: { id: variantId },
    data: { isActive: true, isControl: true, trafficPercent: 100 },
  });
}

/**
 * Rollback: deactivate variant, restore control to 100%.
 */
export async function rollbackVariant(userId: string, agentKind: string) {
  const variants = await prisma.promptVariant.findMany({
    where: { userId, agentKind, isActive: true },
  });

  for (const v of variants) {
    if (v.isControl) {
      await prisma.promptVariant.update({ where: { id: v.id }, data: { trafficPercent: 100 } });
    } else {
      await prisma.promptVariant.update({ where: { id: v.id }, data: { isActive: false } });
    }
  }
}

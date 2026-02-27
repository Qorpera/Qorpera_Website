import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { createHiredJobIfMissing } from "@/lib/agent-hiring";
import type { AgentKind, RunSchedule } from "@prisma/client";

// Unambiguous charset (no I, O, 0, 1)
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomSegment(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CHARSET[crypto.randomInt(CHARSET.length)];
  }
  return out;
}

export function generateCode(): string {
  return `QP-${randomSegment(4)}-${randomSegment(4)}-${randomSegment(4)}`;
}

export async function createLicenseKey(
  creatorUserId: string,
  agentKind: AgentKind,
  schedule: RunSchedule,
) {
  // Retry on unlikely code collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    try {
      const key = await prisma.agentLicenseKey.create({
        data: { creatorUserId, agentKind, schedule, code },
      });

      await prisma.auditLog.create({
        data: {
          userId: creatorUserId,
          scope: "LICENSE_KEY",
          entityId: key.id,
          action: "CREATE",
          summary: `Created license key ${code} for ${agentKind} (${schedule})`,
        },
      });

      return key;
    } catch (e: unknown) {
      // Unique constraint violation — retry with a new code
      if (
        typeof e === "object" &&
        e !== null &&
        "code" in e &&
        (e as { code: string }).code === "P2002"
      ) {
        continue;
      }
      throw e;
    }
  }
  throw new Error("Failed to generate unique license key code");
}

export async function listLicenseKeys(creatorUserId: string) {
  return prisma.agentLicenseKey.findMany({
    where: { creatorUserId },
    orderBy: { createdAt: "desc" },
    include: {
      redeemedBy: { select: { email: true } },
    },
  });
}

export async function revokeLicenseKey(creatorUserId: string, keyId: string) {
  const key = await prisma.agentLicenseKey.findFirst({
    where: { id: keyId, creatorUserId },
  });
  if (!key) throw new Error("License key not found");
  if (key.status !== "ACTIVE") throw new Error("Only active keys can be revoked");

  const updated = await prisma.agentLicenseKey.update({
    where: { id: keyId },
    data: { status: "REVOKED", revokedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      userId: creatorUserId,
      scope: "LICENSE_KEY",
      entityId: keyId,
      action: "REVOKE",
      summary: `Revoked license key ${key.code}`,
    },
  });

  return updated;
}

export async function redeemLicenseKey(userId: string, code: string) {
  const normalised = code.trim().toUpperCase();

  const key = await prisma.agentLicenseKey.findUnique({
    where: { code: normalised },
  });
  if (!key) throw new Error("Invalid license key");
  if (key.status === "REDEEMED") throw new Error("This key has already been redeemed");
  if (key.status === "REVOKED") throw new Error("This key has been revoked");

  const updated = await prisma.agentLicenseKey.update({
    where: { id: key.id },
    data: { status: "REDEEMED", redeemedById: userId, redeemedAt: new Date() },
  });

  // Provision the agent for the redeemer
  const { job, created } = await createHiredJobIfMissing({
    userId,
    agentKind: key.agentKind as import("@/lib/agent-hiring").HireAgentKind,
    schedule: key.schedule as import("@/lib/agent-hiring").HireSchedule,
  });

  await prisma.auditLog.create({
    data: {
      userId,
      scope: "LICENSE_KEY",
      entityId: key.id,
      action: "REDEEM",
      summary: `Redeemed license key ${normalised} for ${key.agentKind} (${key.schedule})${created ? "" : " — agent already existed"}`,
    },
  });

  return { key: updated, job, created };
}

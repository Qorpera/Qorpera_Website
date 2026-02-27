import { prisma } from "@/lib/db";
import { generateCode } from "@/lib/license-keys-store";
import { deactivatePlanSubscription, disableAllHiredJobs } from "@/lib/plan-store";
import type { PlanTier } from "@prisma/client";

export async function createPlanLicenseKey(creatorUserId: string, tier: PlanTier) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    try {
      const key = await prisma.planLicenseKey.create({
        data: { creatorUserId, tier, code },
      });

      await prisma.auditLog.create({
        data: {
          userId: creatorUserId,
          scope: "PLAN_LICENSE_KEY",
          entityId: key.id,
          action: "CREATE",
          summary: `Created plan license key ${code} for ${tier}`,
        },
      });

      return key;
    } catch (e: unknown) {
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

export async function listPlanLicenseKeys(creatorUserId: string) {
  return prisma.planLicenseKey.findMany({
    where: { creatorUserId },
    orderBy: { createdAt: "desc" },
    include: {
      redeemedBy: { select: { email: true } },
    },
  });
}

export async function redeemPlanLicenseKey(userId: string, code: string) {
  const normalised = code.trim().toUpperCase();

  const key = await prisma.planLicenseKey.findUnique({
    where: { code: normalised },
  });
  if (!key) throw new Error("Invalid license key");
  if (key.status === "REDEEMED") throw new Error("This key has already been redeemed");
  if (key.status === "REVOKED") throw new Error("This key has been revoked");

  // Look up the Plan record for this tier
  const plan = await prisma.plan.findFirst({
    where: { tier: key.tier, isActive: true },
  });
  if (!plan) throw new Error("No active plan found for this tier");

  // Cancel any existing active subscription
  const existingSub = await prisma.planSubscription.findFirst({
    where: { userId, status: "ACTIVE" },
  });
  if (existingSub) {
    await deactivatePlanSubscription(existingSub.id);
  }

  // Mark key as redeemed
  const updated = await prisma.planLicenseKey.update({
    where: { id: key.id },
    data: { status: "REDEEMED", redeemedById: userId, redeemedAt: new Date() },
  });

  // Create active plan subscription
  const subscription = await prisma.planSubscription.create({
    data: {
      userId,
      planId: plan.id,
      status: "ACTIVE",
      source: "LICENSE_KEY",
    },
    include: { plan: true },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      scope: "PLAN_LICENSE_KEY",
      entityId: key.id,
      action: "REDEEM",
      summary: `Redeemed plan license key ${normalised} for ${key.tier} (plan: ${plan.name})`,
    },
  });

  return { key: updated, subscription };
}

export async function revokePlanLicenseKey(creatorUserId: string, keyId: string) {
  const key = await prisma.planLicenseKey.findFirst({
    where: { id: keyId, creatorUserId },
  });
  if (!key) throw new Error("License key not found");
  if (key.status === "REVOKED") throw new Error("Key is already revoked");

  // Mark key as revoked
  const updated = await prisma.planLicenseKey.update({
    where: { id: keyId },
    data: { status: "REVOKED", revokedAt: new Date() },
  });

  // If the key was redeemed, cancel the redeemer's subscription + disable agents
  if (key.status === "REDEEMED" && key.redeemedById) {
    const activeSub = await prisma.planSubscription.findFirst({
      where: { userId: key.redeemedById, status: "ACTIVE", source: "LICENSE_KEY" },
    });
    if (activeSub) {
      await deactivatePlanSubscription(activeSub.id);
      await disableAllHiredJobs(key.redeemedById);
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: creatorUserId,
      scope: "PLAN_LICENSE_KEY",
      entityId: keyId,
      action: "REVOKE",
      summary: `Revoked plan license key ${key.code}${key.status === "REDEEMED" ? " — subscription canceled" : ""}`,
    },
  });

  return updated;
}

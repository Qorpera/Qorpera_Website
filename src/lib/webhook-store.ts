/**
 * Webhook endpoint management for agent event triggers.
 * Handles token generation, verification, and CRUD for webhook endpoints.
 */

import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";

const WEBHOOK_PREFIX = "whsec_";

export function generateWebhookSecret(): string {
  return WEBHOOK_PREFIX + randomBytes(32).toString("hex");
}

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export async function createWebhookEndpoint(
  userId: string,
  agentTarget: string,
  label = "",
): Promise<{ endpoint: { id: string; agentTarget: string; label: string; secretLast4: string; enabled: boolean; createdAt: Date }; secret: string }> {
  const secret = generateWebhookSecret();
  const secretHash = hashSecret(secret);
  const secretLast4 = secret.slice(-4);

  const endpoint = await prisma.webhookEndpoint.upsert({
    where: { userId_agentTarget: { userId, agentTarget } },
    update: {
      secretHash,
      secretLast4,
      label: label.slice(0, 200),
      enabled: true,
    },
    create: {
      userId,
      agentTarget,
      label: label.slice(0, 200),
      secretHash,
      secretLast4,
      enabled: true,
    },
  });

  return {
    endpoint: {
      id: endpoint.id,
      agentTarget: endpoint.agentTarget,
      label: endpoint.label,
      secretLast4: endpoint.secretLast4 ?? "",
      enabled: endpoint.enabled,
      createdAt: endpoint.createdAt,
    },
    secret,
  };
}

export async function verifyWebhookRequest(
  userId: string,
  agentTarget: string,
  providedSecret: string,
): Promise<boolean> {
  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { userId_agentTarget: { userId, agentTarget } },
    select: { secretHash: true, enabled: true },
  });
  if (!endpoint || !endpoint.enabled) return false;

  const providedHash = hashSecret(providedSecret);
  const storedBuffer = Buffer.from(endpoint.secretHash, "hex");
  const providedBuffer = Buffer.from(providedHash, "hex");

  if (storedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(storedBuffer, providedBuffer);
}

export async function recordWebhookCall(userId: string, agentTarget: string): Promise<void> {
  await prisma.webhookEndpoint.updateMany({
    where: { userId, agentTarget },
    data: {
      lastCalledAt: new Date(),
      callCount: { increment: 1 },
    },
  });
}

export async function listWebhookEndpoints(userId: string) {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      agentTarget: true,
      label: true,
      secretLast4: true,
      enabled: true,
      lastCalledAt: true,
      callCount: true,
      createdAt: true,
    },
  });
  return endpoints;
}

export async function deleteWebhookEndpoint(userId: string, agentTarget: string): Promise<boolean> {
  const result = await prisma.webhookEndpoint.deleteMany({
    where: { userId, agentTarget },
  });
  return result.count > 0;
}

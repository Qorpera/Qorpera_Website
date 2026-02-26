import { prisma } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto-secrets";

export type ConnectorKind = "resend" | "sendgrid" | "postmark" | "webhook" | "slack";

export type ExternalConnectorView = {
  connector: ConnectorKind;
  label: string;
  configured: boolean;
  enabled: boolean;
  keyLast4: string | null;
  fromAddress: string | null;
  lastTestStatus: string | null;
  updatedAt: string | null;
};

const ALL_CONNECTORS: ConnectorKind[] = ["resend", "sendgrid", "postmark", "webhook", "slack"];

function toView(connector: ConnectorKind, row: {
  label: string | null;
  encryptedKey: string | null;
  keyLast4: string | null;
  fromAddress: string | null;
  enabled: boolean;
  lastTestStatus: string | null;
  updatedAt: Date;
} | null): ExternalConnectorView {
  return {
    connector,
    label: row?.label ?? connectorLabel(connector),
    configured: !!(row?.encryptedKey),
    enabled: row?.enabled ?? false,
    keyLast4: row?.keyLast4 ?? null,
    fromAddress: row?.fromAddress ?? null,
    lastTestStatus: row?.lastTestStatus ?? null,
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
}

export function connectorLabel(connector: ConnectorKind): string {
  if (connector === "resend") return "Resend";
  if (connector === "sendgrid") return "SendGrid";
  if (connector === "postmark") return "Postmark";
  if (connector === "slack") return "Slack";
  return "Outbound Webhook";
}

export async function listExternalConnectors(userId: string): Promise<ExternalConnectorView[]> {
  const rows = await prisma.externalConnector.findMany({ where: { userId } });
  const byKind = new Map(rows.map((r) => [r.connector, r]));
  return ALL_CONNECTORS.map((c) => toView(c, byKind.get(c) ?? null));
}

export async function upsertExternalConnector(
  userId: string,
  connector: ConnectorKind,
  input: { apiKey?: string; fromAddress?: string; label?: string; enabled?: boolean },
): Promise<ExternalConnectorView> {
  const existing = await prisma.externalConnector.findUnique({
    where: { userId_connector: { userId, connector } },
  });

  const encryptedKey = input.apiKey ? encryptSecret(input.apiKey) : existing?.encryptedKey ?? null;
  const keyLast4 = input.apiKey ? input.apiKey.slice(-4) : existing?.keyLast4 ?? null;

  const row = await prisma.externalConnector.upsert({
    where: { userId_connector: { userId, connector } },
    update: {
      encryptedKey,
      keyLast4,
      fromAddress: input.fromAddress !== undefined ? input.fromAddress : existing?.fromAddress,
      label: input.label !== undefined ? input.label : existing?.label,
      enabled: input.enabled !== undefined ? input.enabled : existing?.enabled ?? true,
    },
    create: {
      userId,
      connector,
      encryptedKey,
      keyLast4,
      fromAddress: input.fromAddress ?? null,
      label: input.label ?? connectorLabel(connector),
      enabled: input.enabled ?? true,
    },
  });

  return toView(connector, row);
}

export async function deleteExternalConnector(userId: string, connector: ConnectorKind): Promise<void> {
  await prisma.externalConnector.deleteMany({ where: { userId, connector } });
}

/** Resolve the Slack webhook URL for a user. Falls back to process.env.SLACK_WEBHOOK_URL. */
export async function resolveSlackWebhookUrl(userId: string): Promise<string | null> {
  const row = await prisma.externalConnector.findUnique({
    where: { userId_connector: { userId, connector: "slack" } },
  });

  if (row?.enabled && row.encryptedKey) {
    try {
      return decryptSecret(row.encryptedKey);
    } catch {
      // Decryption failed — fall through
    }
  }

  return process.env.SLACK_WEBHOOK_URL ?? null;
}

/** Send a Slack notification via incoming webhook. Returns true on success. */
export async function sendSlackNotification(
  userId: string,
  message: { text: string; blocks?: unknown[] },
): Promise<boolean> {
  const webhookUrl = await resolveSlackWebhookUrl(userId);
  if (!webhookUrl) return false;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Resolve an active email credential for actual sending. Falls back to process.env. */
export async function resolveEmailCredential(userId: string): Promise<{
  provider: string;
  apiKey: string;
  fromAddress?: string;
} | null> {
  // Try DB connectors first (in priority order)
  const rows = await prisma.externalConnector.findMany({
    where: { userId, enabled: true, connector: { in: ["resend", "sendgrid", "postmark"] } },
  });

  for (const kind of ["resend", "sendgrid", "postmark"] as const) {
    const row = rows.find((r) => r.connector === kind);
    if (row?.encryptedKey) {
      try {
        const apiKey = decryptSecret(row.encryptedKey);
        return { provider: kind, apiKey, fromAddress: row.fromAddress ?? undefined };
      } catch {
        // Decryption failed — skip this row
      }
    }
  }

  // Fall back to process.env
  if (process.env.RESEND_API_KEY) return { provider: "resend", apiKey: process.env.RESEND_API_KEY, fromAddress: process.env.EMAIL_FROM };
  if (process.env.SENDGRID_API_KEY) return { provider: "sendgrid", apiKey: process.env.SENDGRID_API_KEY, fromAddress: process.env.EMAIL_FROM };
  if (process.env.POSTMARK_SERVER_TOKEN) return { provider: "postmark", apiKey: process.env.POSTMARK_SERVER_TOKEN, fromAddress: process.env.EMAIL_FROM };

  return null;
}

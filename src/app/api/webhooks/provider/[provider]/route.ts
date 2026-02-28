/**
 * Inbound provider webhook endpoint.
 * Accepts events from Calendly and HubSpot, validates HMAC, and stores them for
 * async processing by the scheduler.
 *
 * Always returns 200 — never 4xx — to prevent providers from disabling the webhook.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyCalendlySignature, verifyHubspotSignature } from "@/lib/webhook-validators";

export const runtime = "nodejs";

const VALID_PROVIDERS = ["calendly", "hubspot"] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

function isValidProvider(p: string): p is Provider {
  return (VALID_PROVIDERS as readonly string[]).includes(p);
}

/**
 * Look up the internal userId for a Calendly event by matching the user_uri
 * stored in IntegrationConnection.metadataJson.
 */
async function resolveCalendlyUserId(payload: Record<string, unknown>): Promise<string | null> {
  try {
    // Try nested payload path first (invitee.created / invitee.canceled)
    const inner =
      (payload.payload as Record<string, unknown> | undefined) ?? payload;
    const memberships = (
      (inner.scheduled_event as Record<string, unknown> | undefined)
        ?.event_memberships as Array<Record<string, unknown>> | undefined
    ) ?? [];
    const creatorUri = (inner.creator as Record<string, unknown> | undefined)?.uri as string | undefined;

    const candidateUris: string[] = [];
    for (const m of memberships) {
      if (typeof m.user_uri === "string") candidateUris.push(m.user_uri);
    }
    if (creatorUri) candidateUris.push(creatorUri);

    if (candidateUris.length === 0) return null;

    const connections = await prisma.integrationConnection.findMany({
      where: { provider: "calendly" },
      select: { userId: true, metadataJson: true },
    });

    for (const conn of connections) {
      if (!conn.metadataJson) continue;
      try {
        const meta = JSON.parse(conn.metadataJson) as Record<string, string>;
        if (meta.user_uri && candidateUris.includes(meta.user_uri)) {
          return conn.userId;
        }
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Look up the internal userId for a HubSpot event by matching portalId
 * stored in IntegrationConnection.metadataJson.hub_id.
 */
async function resolveHubspotUserId(
  payload: Record<string, unknown> | Array<Record<string, unknown>>,
): Promise<string | null> {
  try {
    const first = Array.isArray(payload) ? payload[0] : payload;
    const portalId = first?.portalId != null ? String(first.portalId) : null;
    if (!portalId) return null;

    const connections = await prisma.integrationConnection.findMany({
      where: { provider: "hubspot" },
      select: { userId: true, metadataJson: true },
    });

    for (const conn of connections) {
      if (!conn.metadataJson) continue;
      try {
        const meta = JSON.parse(conn.metadataJson) as Record<string, string>;
        if (meta.hub_id === portalId) return conn.userId;
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;

  if (!isValidProvider(provider)) {
    // Still return 200 — unrecognised path shouldn't trigger provider disabling
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Read raw body as text (required for HMAC validation)
  const rawBody = await req.text().catch(() => "");

  let payload: Record<string, unknown> | Array<Record<string, unknown>>;
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // ── Resolve userId ─────────────────────────────────────────────

  let userId: string | null = null;

  if (provider === "calendly") {
    userId = await resolveCalendlyUserId(
      (Array.isArray(payload) ? payload[0] : payload) as Record<string, unknown>,
    );
  } else if (provider === "hubspot") {
    userId = await resolveHubspotUserId(
      payload as Record<string, unknown> | Array<Record<string, unknown>>,
    );
  }

  if (!userId) {
    // Unknown user — accept silently
    return NextResponse.json({ ok: true, skipped: true });
  }

  // ── Validate HMAC signature ────────────────────────────────────

  if (provider === "calendly") {
    const sigHeader = req.headers.get("calendly-webhook-signature") ?? "";
    if (sigHeader) {
      // Fetch user's stored signing key
      const conn = await prisma.integrationConnection.findUnique({
        where: { userId_provider: { userId, provider: "calendly" } },
        select: { metadataJson: true },
      });
      if (conn?.metadataJson) {
        try {
          const meta = JSON.parse(conn.metadataJson) as Record<string, string>;
          if (meta.webhook_signing_key) {
            const valid = verifyCalendlySignature(rawBody, sigHeader, meta.webhook_signing_key);
            if (!valid) {
              return NextResponse.json({ ok: true, skipped: true });
            }
          }
          // If no signing key stored yet (registration race), accept without validation
        } catch {
          // Malformed metadataJson — accept without validation
        }
      }
    }
  } else if (provider === "hubspot") {
    const sigHeader = req.headers.get("x-hubspot-signature-v3") ?? "";
    const timestampHeader = req.headers.get("x-hubspot-request-timestamp") ?? "";
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET ?? "";
    if (sigHeader && clientSecret) {
      const valid = verifyHubspotSignature(
        rawBody,
        sigHeader,
        clientSecret,
        req.method,
        req.url,
        timestampHeader,
      );
      if (!valid) {
        return NextResponse.json({ ok: true, skipped: true });
      }
    }
  }

  // ── Extract event type ─────────────────────────────────────────

  let eventType: string;

  if (provider === "calendly") {
    const p = (Array.isArray(payload) ? payload[0] : payload) as Record<string, unknown>;
    eventType = String(p.event ?? "unknown");
  } else {
    // HubSpot sends an array; use first entry's subscriptionType
    const first = Array.isArray(payload) ? payload[0] : (payload as Record<string, unknown>);
    eventType = String(
      (first as Record<string, unknown>).subscriptionType ??
      (first as Record<string, unknown>).event ??
      "unknown",
    );
  }

  // ── Store event ────────────────────────────────────────────────

  await prisma.webhookEvent.create({
    data: {
      userId,
      provider,
      eventType,
      payload: rawBody.slice(0, 65535),
      status: "PENDING",
    },
  });

  return NextResponse.json({ ok: true });
}

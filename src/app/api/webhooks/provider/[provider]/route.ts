/**
 * Inbound provider webhook endpoint.
 * Accepts events from Calendly, HubSpot, Slack, GitHub, and Linear,
 * validates HMAC, and stores them for async processing by the scheduler.
 *
 * Always returns 200 — never 4xx — to prevent providers from disabling the webhook.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  verifyCalendlySignature,
  verifyHubspotSignature,
  verifySlackSignature,
  verifyGithubSignature,
  verifyLinearSignature,
} from "@/lib/webhook-validators";

export const runtime = "nodejs";

const VALID_PROVIDERS = ["calendly", "hubspot", "slack", "github", "linear"] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

function isValidProvider(p: string): p is Provider {
  return (VALID_PROVIDERS as readonly string[]).includes(p);
}

// ── UserId resolvers ──────────────────────────────────────────────

async function resolveCalendlyUserId(payload: Record<string, unknown>): Promise<string | null> {
  try {
    const inner = (payload.payload as Record<string, unknown> | undefined) ?? payload;
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
        if (meta.user_uri && candidateUris.includes(meta.user_uri)) return conn.userId;
      } catch { continue; }
    }
    return null;
  } catch {
    return null;
  }
}

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
      } catch { continue; }
    }
    return null;
  } catch {
    return null;
  }
}

async function resolveSlackUserId(payload: Record<string, unknown>): Promise<string | null> {
  try {
    const teamId = (payload.team_id as string | undefined) ??
      ((payload.event as Record<string, unknown> | undefined)?.team as string | undefined);
    if (!teamId) return null;

    const connections = await prisma.integrationConnection.findMany({
      where: { provider: "slack" },
      select: { userId: true, metadataJson: true },
    });

    for (const conn of connections) {
      if (!conn.metadataJson) continue;
      try {
        const meta = JSON.parse(conn.metadataJson) as Record<string, string>;
        if (meta.team_id === teamId) return conn.userId;
      } catch { continue; }
    }
    return null;
  } catch {
    return null;
  }
}

async function resolveGithubUserId(payload: Record<string, unknown>): Promise<string | null> {
  try {
    const installationId = ((payload.installation as Record<string, unknown> | undefined)?.id as number | undefined);
    if (!installationId) return null;

    const connections = await prisma.integrationConnection.findMany({
      where: { provider: "github" },
      select: { userId: true, metadataJson: true },
    });

    for (const conn of connections) {
      if (!conn.metadataJson) continue;
      try {
        const meta = JSON.parse(conn.metadataJson) as Record<string, unknown>;
        if (Number(meta.installation_id) === installationId) return conn.userId;
      } catch { continue; }
    }
    return null;
  } catch {
    return null;
  }
}

async function resolveLinearUserId(payload: Record<string, unknown>): Promise<string | null> {
  try {
    const orgId = (payload.organizationId as string | undefined);
    if (!orgId) return null;

    const connections = await prisma.integrationConnection.findMany({
      where: { provider: "linear" },
      select: { userId: true, metadataJson: true },
    });

    for (const conn of connections) {
      if (!conn.metadataJson) continue;
      try {
        const meta = JSON.parse(conn.metadataJson) as Record<string, string>;
        if (meta.organization_id === orgId) return conn.userId;
      } catch { continue; }
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
    return NextResponse.json({ ok: true, skipped: true });
  }

  const rawBody = await req.text().catch(() => "");

  // Slack URL verification challenge — must respond before any body parsing
  if (provider === "slack") {
    try {
      const parsed = JSON.parse(rawBody) as Record<string, unknown>;
      if (parsed.type === "url_verification") {
        return NextResponse.json({ challenge: parsed.challenge });
      }
    } catch { /* not JSON or no challenge */ }
  }

  let payload: Record<string, unknown> | Array<Record<string, unknown>>;
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // ── Resolve userId ─────────────────────────────────────────────

  let userId: string | null = null;
  const singlePayload = (Array.isArray(payload) ? payload[0] : payload) as Record<string, unknown>;

  if (provider === "calendly") {
    userId = await resolveCalendlyUserId(singlePayload);
  } else if (provider === "hubspot") {
    userId = await resolveHubspotUserId(payload as Record<string, unknown> | Array<Record<string, unknown>>);
  } else if (provider === "slack") {
    userId = await resolveSlackUserId(singlePayload);
  } else if (provider === "github") {
    userId = await resolveGithubUserId(singlePayload);
  } else if (provider === "linear") {
    userId = await resolveLinearUserId(singlePayload);
  }

  if (!userId) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // ── Validate HMAC signature ────────────────────────────────────

  if (provider === "calendly") {
    const sigHeader = req.headers.get("calendly-webhook-signature") ?? "";
    if (sigHeader) {
      const conn = await prisma.integrationConnection.findUnique({
        where: { userId_provider: { userId, provider: "calendly" } },
        select: { metadataJson: true },
      });
      if (conn?.metadataJson) {
        try {
          const meta = JSON.parse(conn.metadataJson) as Record<string, string>;
          if (meta.webhook_signing_key) {
            if (!verifyCalendlySignature(rawBody, sigHeader, meta.webhook_signing_key)) {
              return NextResponse.json({ ok: true, skipped: true });
            }
          }
        } catch { /* accept */ }
      }
    }
  } else if (provider === "hubspot") {
    const sigHeader = req.headers.get("x-hubspot-signature-v3") ?? "";
    const timestampHeader = req.headers.get("x-hubspot-request-timestamp") ?? "";
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET ?? "";
    // If provider sent a signature but we have no secret to verify it — reject
    if (sigHeader && !clientSecret) return NextResponse.json({ ok: true, skipped: true });
    if (sigHeader && clientSecret) {
      if (!verifyHubspotSignature(rawBody, sigHeader, clientSecret, req.method, req.url, timestampHeader)) {
        return NextResponse.json({ ok: true, skipped: true });
      }
    }
  } else if (provider === "slack") {
    const signature = req.headers.get("x-slack-signature") ?? "";
    const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";
    const signingSecret = process.env.SLACK_SIGNING_SECRET ?? "";
    if (signature && !signingSecret) return NextResponse.json({ ok: true, skipped: true });
    if (signature && signingSecret) {
      if (!verifySlackSignature(rawBody, signature, timestamp, signingSecret)) {
        return NextResponse.json({ ok: true, skipped: true });
      }
    }
  } else if (provider === "github") {
    const sigHeader = req.headers.get("x-hub-signature-256") ?? "";
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET ?? "";
    if (sigHeader && !webhookSecret) return NextResponse.json({ ok: true, skipped: true });
    if (sigHeader && webhookSecret) {
      if (!verifyGithubSignature(rawBody, sigHeader, webhookSecret)) {
        return NextResponse.json({ ok: true, skipped: true });
      }
    }
  } else if (provider === "linear") {
    const sigHeader = req.headers.get("linear-signature") ?? "";
    const webhookSecret = process.env.LINEAR_WEBHOOK_SECRET ?? "";
    if (sigHeader && !webhookSecret) return NextResponse.json({ ok: true, skipped: true });
    if (sigHeader && webhookSecret) {
      if (!verifyLinearSignature(rawBody, sigHeader, webhookSecret)) {
        return NextResponse.json({ ok: true, skipped: true });
      }
    }
  }

  // ── Extract event type ─────────────────────────────────────────

  let eventType: string;

  if (provider === "calendly") {
    eventType = String(singlePayload.event ?? "unknown");
  } else if (provider === "hubspot") {
    const first = Array.isArray(payload) ? payload[0] : (payload as Record<string, unknown>);
    eventType = String(
      (first as Record<string, unknown>).subscriptionType ??
      (first as Record<string, unknown>).event ??
      "unknown",
    );
  } else if (provider === "slack") {
    const event = (singlePayload.event as Record<string, unknown> | undefined) ?? {};
    eventType = String(event.type ?? singlePayload.type ?? "unknown");
  } else if (provider === "github") {
    eventType = req.headers.get("x-github-event") ?? String(singlePayload.action ?? "unknown");
  } else if (provider === "linear") {
    eventType = String(singlePayload.type ?? "unknown");
  } else {
    eventType = "unknown";
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

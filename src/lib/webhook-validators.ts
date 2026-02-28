/**
 * Pure HMAC validation functions for inbound provider webhooks.
 * No DB access — these are stateless signature helpers.
 */

import crypto from "node:crypto";

const MAX_AGE_SECONDS = 5 * 60; // 5 minutes

// ── Calendly ─────────────────────────────────────────────────────

/**
 * Verify a Calendly webhook signature.
 * Header format: `t=<unixTimestamp>,v1=<hexHmacSha256>`
 * Signed content: `t=<timestamp>\n<rawBody>`
 */
export function verifyCalendlySignature(
  rawBody: string,
  header: string,
  signingKey: string,
): boolean {
  try {
    const parts = Object.fromEntries(
      header.split(",").map((part) => {
        const eqIdx = part.indexOf("=");
        return [part.slice(0, eqIdx), part.slice(eqIdx + 1)];
      }),
    );
    const timestamp = parts["t"];
    const receivedSig = parts["v1"];
    if (!timestamp || !receivedSig) return false;

    // Reject stale timestamps
    const ageSeconds = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
    if (ageSeconds > MAX_AGE_SECONDS || ageSeconds < -30) return false;

    const signedContent = `t=${timestamp}\n${rawBody}`;
    const expected = crypto
      .createHmac("sha256", signingKey)
      .update(signedContent)
      .digest("hex");

    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(receivedSig);
    if (expectedBuf.length !== receivedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}

// ── HubSpot ───────────────────────────────────────────────────────

/**
 * Verify a HubSpot v3 webhook signature.
 * Signed content: `<clientSecret><httpMethod><requestUri><requestBody><timestamp>`
 * Signature is base64-encoded HMAC-SHA256.
 */
export function verifyHubspotSignature(
  rawBody: string,
  header: string,
  clientSecret: string,
  method: string,
  uri: string,
  timestamp: string,
): boolean {
  try {
    // Reject stale timestamps
    const ageSeconds = Math.floor(Date.now() / 1000) - Math.floor(parseInt(timestamp, 10) / 1000);
    if (ageSeconds > MAX_AGE_SECONDS || ageSeconds < -30) return false;

    const signedContent = `${clientSecret}${method.toUpperCase()}${uri}${rawBody}${timestamp}`;
    const expected = crypto
      .createHmac("sha256", clientSecret)
      .update(signedContent)
      .digest("base64");

    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(header);
    if (expectedBuf.length !== receivedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}

// ── Event summarizers ─────────────────────────────────────────────

/**
 * Returns a 1-sentence LLM-friendly summary of a Calendly event payload.
 */
export function summarizeCalendlyEvent(
  eventType: string,
  payload: Record<string, unknown>,
): string {
  try {
    const inner = (payload.payload as Record<string, unknown> | undefined) ?? payload;
    const invitee = (inner.invitee as Record<string, unknown> | undefined) ?? {};
    const name = (invitee.name as string | undefined) ?? "Someone";
    const email = (invitee.email as string | undefined) ?? "";
    const scheduledEvent =
      (inner.scheduled_event as Record<string, unknown> | undefined) ??
      (inner.event as Record<string, unknown> | undefined) ??
      {};
    const eventName = (scheduledEvent.name as string | undefined) ?? "a meeting";
    const startTime = (scheduledEvent.start_time as string | undefined) ?? "";

    if (eventType === "invitee.created") {
      const emailPart = email ? ` (${email})` : "";
      const timePart = startTime ? ` for ${startTime}` : "";
      return `${name}${emailPart} booked '${eventName}'${timePart}.`;
    }
    if (eventType === "invitee.canceled") {
      const emailPart = email ? ` (${email})` : "";
      return `${name}${emailPart} canceled '${eventName}'.`;
    }
    return `Calendly event "${eventType}" received.`;
  } catch {
    return `Calendly event "${eventType}" received.`;
  }
}

/**
 * Returns a 1-sentence LLM-friendly summary of a HubSpot event payload.
 */
export function summarizeHubspotEvent(
  eventType: string,
  payload: Record<string, unknown> | Array<Record<string, unknown>>,
): string {
  try {
    const first = Array.isArray(payload) ? payload[0] : payload;
    const portalId = (first?.portalId as number | string | undefined) ?? "";
    const subscriptionType = (first?.subscriptionType as string | undefined) ?? eventType;
    const objectId = (first?.objectId as number | string | undefined) ?? "";
    const portalPart = portalId ? ` (portal ${portalId})` : "";
    const objectPart = objectId ? ` for object ${objectId}` : "";
    return `HubSpot event "${subscriptionType}"${portalPart}${objectPart} received.`;
  } catch {
    return `HubSpot event "${eventType}" received.`;
  }
}

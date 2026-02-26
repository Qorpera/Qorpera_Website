/**
 * Email sender — resolves credentials from the ExternalConnector DB store (per user),
 * with fallback to process.env for server-wide configuration.
 *
 * Supported providers (tried in order): Resend → SendGrid → Postmark
 * Configure via Settings → Connectors in the app UI.
 */

import { resolveEmailCredential } from "@/lib/external-connector-store";

export type EmailPayload = {
  to: string;
  subject: string;
  body: string;
  from?: string;
};

export type EmailResult =
  | { ok: true; provider: string; messageId?: string }
  | { ok: false; provider: string; error: string };

async function sendViaResend(apiKey: string, payload: EmailPayload, from: string): Promise<EmailResult> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: payload.from ?? from, to: [payload.to], subject: payload.subject, text: payload.body }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    return { ok: false, provider: "resend", error: err.message ?? `HTTP ${res.status}` };
  }
  const data = await res.json().catch(() => ({})) as { id?: string };
  return { ok: true, provider: "resend", messageId: data.id };
}

async function sendViaSendGrid(apiKey: string, payload: EmailPayload, from: string): Promise<EmailResult> {
  const fromStr = payload.from ?? from;
  const fromEmail = fromStr.match(/<(.+)>/)?.[1] ?? fromStr;
  const fromName = fromStr.match(/^(.+?)\s*</)?.[1]?.trim();

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: payload.to }] }],
      from: fromName ? { email: fromEmail, name: fromName } : { email: fromEmail },
      subject: payload.subject,
      content: [{ type: "text/plain", value: payload.body }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { errors?: Array<{ message: string }> };
    return { ok: false, provider: "sendgrid", error: err.errors?.[0]?.message ?? `HTTP ${res.status}` };
  }
  return { ok: true, provider: "sendgrid", messageId: res.headers.get("X-Message-Id") ?? undefined };
}

async function sendViaPostmark(apiKey: string, payload: EmailPayload, from: string): Promise<EmailResult> {
  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: { "X-Postmark-Server-Token": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ From: payload.from ?? from, To: payload.to, Subject: payload.subject, TextBody: payload.body }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { Message?: string };
    return { ok: false, provider: "postmark", error: err.Message ?? `HTTP ${res.status}` };
  }
  const data = await res.json().catch(() => ({})) as { MessageID?: string };
  return { ok: true, provider: "postmark", messageId: data.MessageID };
}

const DEFAULT_FROM = process.env.EMAIL_FROM ?? "Zygenic Agent <agent@zygenic.ai>";

/** Send an email, resolving credentials from the DB for the given user. */
export async function sendEmail(payload: EmailPayload, userId?: string): Promise<EmailResult> {
  const cred = userId ? await resolveEmailCredential(userId) : null;

  // Fallback chain if no DB credential
  const provider = cred?.provider ?? (
    process.env.RESEND_API_KEY ? "resend" :
    process.env.SENDGRID_API_KEY ? "sendgrid" :
    process.env.POSTMARK_SERVER_TOKEN ? "postmark" : null
  );
  const apiKey = cred?.apiKey ?? (
    process.env.RESEND_API_KEY ?? process.env.SENDGRID_API_KEY ?? process.env.POSTMARK_SERVER_TOKEN
  );
  const from = cred?.fromAddress ?? DEFAULT_FROM;

  if (!provider || !apiKey) {
    return {
      ok: false,
      provider: "none",
      error: "No email provider configured. Go to Settings → Connectors to add your Resend, SendGrid, or Postmark API key.",
    };
  }

  if (provider === "resend") return sendViaResend(apiKey, payload, from);
  if (provider === "sendgrid") return sendViaSendGrid(apiKey, payload, from);
  if (provider === "postmark") return sendViaPostmark(apiKey, payload, from);

  return { ok: false, provider, error: `Unknown provider: ${provider}` };
}

export async function isEmailConfigured(userId?: string): Promise<boolean> {
  if (userId) {
    const cred = await resolveEmailCredential(userId);
    if (cred) return true;
  }
  return !!(process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY || process.env.POSTMARK_SERVER_TOKEN);
}

/**
 * Executes pending actions stored in an InboxItem after the user approves them.
 * Handles: send_email, call_webhook, google_send_email, google_create_calendar_event,
 *          slack_post_message, linear_create_issue.
 */

import { sendEmail } from "@/lib/email-sender";
import { isUrlAllowedForServerFetch } from "@/lib/network-policy";
import { getAccessToken } from "@/lib/integrations/token-store";

export type PendingAction = {
  toolName: string;
  details: string;
  argsJson: string;
};

export type ActionExecutionResult = {
  toolName: string;
  ok: boolean;
  output: string;
  provider?: string;
};

async function executeSendEmail(args: Record<string, unknown>, userId?: string): Promise<ActionExecutionResult> {
  const to = String(args.to ?? "").trim();
  const subject = String(args.subject ?? "").trim();
  const body = String(args.body ?? "").trim();
  const from = typeof args.from === "string" ? args.from.trim() : undefined;

  if (!to || !subject || !body) {
    return { toolName: "send_email", ok: false, output: "Missing required fields: to, subject, body" };
  }

  const result = await sendEmail({ to, subject, body, from }, userId);

  if (result.ok) {
    return {
      toolName: "send_email",
      ok: true,
      provider: result.provider,
      output: `Email sent successfully via ${result.provider}.${result.messageId ? ` Message ID: ${result.messageId}` : ""}`,
    };
  }

  return {
    toolName: "send_email",
    ok: false,
    provider: result.provider,
    output: `Email delivery failed (${result.provider}): ${result.error}`,
  };
}

async function executeCallWebhook(args: Record<string, unknown>): Promise<ActionExecutionResult> {
  const url = String(args.url ?? "").trim();
  const payload = args.payload ?? {};
  const method = typeof args.method === "string" ? args.method.toUpperCase() : "POST";

  if (!url) {
    return { toolName: "call_webhook", ok: false, output: "Missing required field: url" };
  }

  const policy = isUrlAllowedForServerFetch(url);
  if (!policy.allowed) {
    return { toolName: "call_webhook", ok: false, output: `URL blocked: ${policy.reason}` };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "User-Agent": "Qorpera-Agent/1.0" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      return { toolName: "call_webhook", ok: false, output: `Webhook returned HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    return { toolName: "call_webhook", ok: true, output: `Webhook delivered (HTTP ${res.status}). Response: ${text.slice(0, 300)}` };
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") {
      return { toolName: "call_webhook", ok: false, output: "Webhook timed out after 10s" };
    }
    return { toolName: "call_webhook", ok: false, output: `Webhook error: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

async function executeGoogleSendEmail(args: Record<string, unknown>, userId?: string): Promise<ActionExecutionResult> {
  if (!userId) return { toolName: "google_send_email", ok: false, output: "No userId — cannot retrieve OAuth token" };
  const token = await getAccessToken(userId, "google");
  if (!token) return { toolName: "google_send_email", ok: false, output: "Google account not connected. Connect it in Settings → Integrations." };

  const to = String(args.to ?? "").trim();
  const subject = String(args.subject ?? "").trim();
  const body = String(args.body ?? "").trim();
  if (!to || !subject || !body) return { toolName: "google_send_email", ok: false, output: "Missing required fields: to, subject, body" };

  const threadId = args.thread_id ? String(args.thread_id) : undefined;
  const inReplyTo = args.in_reply_to ? String(args.in_reply_to) : undefined;

  try {
    const { sendEmail: gmailSend } = await import("@/lib/integrations/google");
    await gmailSend(token, to, subject, body, threadId, inReplyTo);
    return { toolName: "google_send_email", ok: true, output: `Email sent to ${to}: "${subject}"` };
  } catch (e) {
    return { toolName: "google_send_email", ok: false, output: `Gmail error: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

async function executeGoogleCreateCalendarEvent(args: Record<string, unknown>, userId?: string): Promise<ActionExecutionResult> {
  if (!userId) return { toolName: "google_create_calendar_event", ok: false, output: "No userId — cannot retrieve OAuth token" };
  const token = await getAccessToken(userId, "google");
  if (!token) return { toolName: "google_create_calendar_event", ok: false, output: "Google account not connected. Connect it in Settings → Integrations." };

  const summary = String(args.summary ?? "").trim();
  const startDateTime = String(args.start_datetime ?? "").trim();
  const endDateTime = String(args.end_datetime ?? "").trim();
  if (!summary || !startDateTime || !endDateTime) return { toolName: "google_create_calendar_event", ok: false, output: "Missing required fields: summary, start_datetime, end_datetime" };

  try {
    const { createCalendarEvent } = await import("@/lib/integrations/google");
    const result = await createCalendarEvent(
      token,
      summary,
      startDateTime,
      endDateTime,
      args.description ? String(args.description) : undefined,
    );
    const evt = result as Record<string, unknown>;
    return {
      toolName: "google_create_calendar_event",
      ok: true,
      output: `Calendar event created: "${summary}" (${startDateTime} → ${endDateTime})${evt.id ? ` — ID: ${evt.id}` : ""}`,
    };
  } catch (e) {
    return { toolName: "google_create_calendar_event", ok: false, output: `Google Calendar error: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

async function executeSlackPostMessage(args: Record<string, unknown>, userId?: string): Promise<ActionExecutionResult> {
  if (!userId) return { toolName: "slack_post_message", ok: false, output: "No userId — cannot retrieve OAuth token" };
  const token = await getAccessToken(userId, "slack");
  if (!token) return { toolName: "slack_post_message", ok: false, output: "Slack not connected. Connect it in Settings → Integrations." };

  const channel = String(args.channel ?? "").trim();
  const text = String(args.text ?? "").trim();
  if (!channel || !text) return { toolName: "slack_post_message", ok: false, output: "Missing required fields: channel, text" };

  try {
    const { postMessage } = await import("@/lib/integrations/slack");
    await postMessage(token, channel, text);
    return { toolName: "slack_post_message", ok: true, output: `Slack message sent to ${channel}.` };
  } catch (e) {
    return { toolName: "slack_post_message", ok: false, output: `Slack error: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

async function executeLinearCreateIssue(args: Record<string, unknown>, userId?: string): Promise<ActionExecutionResult> {
  if (!userId) return { toolName: "linear_create_issue", ok: false, output: "No userId — cannot retrieve OAuth token" };
  const token = await getAccessToken(userId, "linear");
  if (!token) return { toolName: "linear_create_issue", ok: false, output: "Linear not connected. Connect it in Settings → Integrations." };

  const teamId = String(args.team_id ?? "").trim();
  const title = String(args.title ?? "").trim();
  if (!teamId || !title) return { toolName: "linear_create_issue", ok: false, output: "Missing required fields: team_id, title" };

  try {
    const { createIssue } = await import("@/lib/integrations/linear");
    const result = await createIssue(
      token,
      teamId,
      title,
      args.description ? String(args.description) : undefined,
      args.priority != null ? Number(args.priority) : undefined,
      args.assignee_id ? String(args.assignee_id) : undefined,
    );
    return { toolName: "linear_create_issue", ok: true, output: `Linear issue created: "${title}" — ${JSON.stringify(result).slice(0, 200)}` };
  } catch (e) {
    return { toolName: "linear_create_issue", ok: false, output: `Linear error: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

export async function executePendingActions(actions: PendingAction[], userId?: string): Promise<ActionExecutionResult[]> {
  const results: ActionExecutionResult[] = [];

  for (const action of actions) {
    let args: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(action.argsJson);
      if (typeof parsed === "object" && parsed !== null) args = parsed as Record<string, unknown>;
    } catch {
      results.push({ toolName: action.toolName, ok: false, output: "Could not parse action arguments" });
      continue;
    }

    switch (action.toolName) {
      case "send_email":
        results.push(await executeSendEmail(args, userId));
        break;
      case "call_webhook":
        results.push(await executeCallWebhook(args));
        break;
      case "google_send_email":
        results.push(await executeGoogleSendEmail(args, userId));
        break;
      case "google_create_calendar_event":
        results.push(await executeGoogleCreateCalendarEvent(args, userId));
        break;
      case "slack_post_message":
        results.push(await executeSlackPostMessage(args, userId));
        break;
      case "linear_create_issue":
        results.push(await executeLinearCreateIssue(args, userId));
        break;
      default:
        results.push({ toolName: action.toolName, ok: false, output: `No executor registered for tool "${action.toolName}"` });
    }
  }

  return results;
}

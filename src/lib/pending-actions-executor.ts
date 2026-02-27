/**
 * Executes pending actions stored in an InboxItem after the user approves them.
 * Currently handles: send_email, call_webhook.
 */

import { sendEmail } from "@/lib/email-sender";
import { isUrlAllowedForServerFetch } from "@/lib/network-policy";

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
      default:
        results.push({ toolName: action.toolName, ok: false, output: `No executor registered for tool "${action.toolName}"` });
    }
  }

  return results;
}

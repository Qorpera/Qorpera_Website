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
      case "github_create_issue":
        results.push(await executeGithubCreateIssue(args, userId));
        break;
      case "notion_create_page":
        results.push(await executeNotionCreatePage(args, userId));
        break;
      case "notion_append_block":
        results.push(await executeNotionAppendBlock(args, userId));
        break;
      case "google_create_doc":
        results.push(await executeGoogleCreateDoc(args, userId));
        break;
      case "google_append_doc":
        results.push(await executeGoogleAppendDoc(args, userId));
        break;
      case "google_create_sheet":
        results.push(await executeGoogleCreateSheet(args, userId));
        break;
      case "google_append_sheet_rows":
        results.push(await executeGoogleAppendSheetRows(args, userId));
        break;
      default:
        results.push({ toolName: action.toolName, ok: false, output: `No executor registered for tool "${action.toolName}"` });
    }
  }

  return results;
}

async function executeGithubCreateIssue(args: Record<string, unknown>, userId?: string): Promise<ActionExecutionResult> {
  if (!userId) return { toolName: "github_create_issue", ok: false, output: "No userId" };
  const token = await getAccessToken(userId, "github");
  if (!token) return { toolName: "github_create_issue", ok: false, output: "GitHub not connected. Connect it in Settings → Integrations." };

  const repo = String(args.repo ?? "").trim();
  const title = String(args.title ?? "").trim();
  if (!repo || !title) return { toolName: "github_create_issue", ok: false, output: "Missing required fields: repo, title" };

  try {
    const { createIssue } = await import("@/lib/integrations/github");
    const labels = Array.isArray(args.labels) ? (args.labels as string[]) : undefined;
    const assignees = Array.isArray(args.assignees) ? (args.assignees as string[]) : undefined;
    const issue = await createIssue(token, repo, { title, body: args.body ? String(args.body) : undefined, labels, assignees });
    return { toolName: "github_create_issue", ok: true, output: `GitHub issue #${issue.number} created: "${issue.title}" — ${issue.html_url}` };
  } catch (e) {
    return { toolName: "github_create_issue", ok: false, output: `GitHub error: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

async function executeNotionCreatePage(args: Record<string, unknown>, userId?: string): Promise<ActionExecutionResult> {
  if (!userId) return { toolName: "notion_create_page", ok: false, output: "No userId" };
  const token = await getAccessToken(userId, "notion");
  if (!token) return { toolName: "notion_create_page", ok: false, output: "Notion not connected. Connect it in Settings → Integrations." };

  const title = String(args.title ?? "").trim();
  if (!title) return { toolName: "notion_create_page", ok: false, output: "Missing required field: title" };

  try {
    const { createPage } = await import("@/lib/integrations/notion");
    const result = await createPage(token, {
      parentPageId: args.parent_page_id ? String(args.parent_page_id) : undefined,
      parentDatabaseId: args.parent_database_id ? String(args.parent_database_id) : undefined,
      title,
      content: args.content ? String(args.content) : undefined,
    });
    return { toolName: "notion_create_page", ok: true, output: `Notion page created: "${title}" — ${result.url ?? result.id}` };
  } catch (e) {
    return { toolName: "notion_create_page", ok: false, output: `Notion error: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

async function executeNotionAppendBlock(args: Record<string, unknown>, userId?: string): Promise<ActionExecutionResult> {
  if (!userId) return { toolName: "notion_append_block", ok: false, output: "No userId" };
  const token = await getAccessToken(userId, "notion");
  if (!token) return { toolName: "notion_append_block", ok: false, output: "Notion not connected. Connect it in Settings → Integrations." };

  const pageId = String(args.page_id ?? "").trim();
  const content = String(args.content ?? "").trim();
  if (!pageId || !content) return { toolName: "notion_append_block", ok: false, output: "Missing required fields: page_id, content" };

  try {
    const { appendBlocks } = await import("@/lib/integrations/notion");
    const result = await appendBlocks(token, pageId, content);
    return { toolName: "notion_append_block", ok: true, output: `Appended ${result.blocksAdded} blocks to Notion page ${pageId}` };
  } catch (e) {
    return { toolName: "notion_append_block", ok: false, output: `Notion error: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

async function executeGoogleCreateDoc(args: Record<string, unknown>, userId?: string): Promise<ActionExecutionResult> {
  if (!userId) return { toolName: "google_create_doc", ok: false, output: "No userId" };
  const token = await getAccessToken(userId, "google");
  if (!token) return { toolName: "google_create_doc", ok: false, output: "Google account not connected. Connect it in Settings → Integrations." };

  const title = String(args.title ?? "").trim();
  if (!title) return { toolName: "google_create_doc", ok: false, output: "Missing required field: title" };

  try {
    const { createGoogleDoc } = await import("@/lib/integrations/google");
    const result = await createGoogleDoc(token, title, args.content ? String(args.content) : undefined);
    return { toolName: "google_create_doc", ok: true, output: `Google Doc created: "${result.title}" — ${result.url}` };
  } catch (e) {
    return { toolName: "google_create_doc", ok: false, output: `Google Docs error: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

async function executeGoogleAppendDoc(args: Record<string, unknown>, userId?: string): Promise<ActionExecutionResult> {
  if (!userId) return { toolName: "google_append_doc", ok: false, output: "No userId" };
  const token = await getAccessToken(userId, "google");
  if (!token) return { toolName: "google_append_doc", ok: false, output: "Google account not connected. Connect it in Settings → Integrations." };

  const documentId = String(args.document_id ?? "").trim();
  const content = String(args.content ?? "").trim();
  if (!documentId || !content) return { toolName: "google_append_doc", ok: false, output: "Missing required fields: document_id, content" };

  try {
    const { appendToGoogleDoc } = await import("@/lib/integrations/google");
    const result = await appendToGoogleDoc(token, documentId, content);
    return { toolName: "google_append_doc", ok: true, output: `Appended content to Google Doc "${result.title}"` };
  } catch (e) {
    return { toolName: "google_append_doc", ok: false, output: `Google Docs error: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

async function executeGoogleCreateSheet(args: Record<string, unknown>, userId?: string): Promise<ActionExecutionResult> {
  if (!userId) return { toolName: "google_create_sheet", ok: false, output: "No userId" };
  const token = await getAccessToken(userId, "google");
  if (!token) return { toolName: "google_create_sheet", ok: false, output: "Google account not connected. Connect it in Settings → Integrations." };

  const title = String(args.title ?? "").trim();
  if (!title) return { toolName: "google_create_sheet", ok: false, output: "Missing required field: title" };
  const headers = Array.isArray(args.headers) ? (args.headers as string[]) : undefined;

  try {
    const { createGoogleSheet } = await import("@/lib/integrations/google");
    const result = await createGoogleSheet(token, title, headers);
    return { toolName: "google_create_sheet", ok: true, output: `Google Sheet created: "${result.title}" — ${result.url}` };
  } catch (e) {
    return { toolName: "google_create_sheet", ok: false, output: `Google Sheets error: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

async function executeGoogleAppendSheetRows(args: Record<string, unknown>, userId?: string): Promise<ActionExecutionResult> {
  if (!userId) return { toolName: "google_append_sheet_rows", ok: false, output: "No userId" };
  const token = await getAccessToken(userId, "google");
  if (!token) return { toolName: "google_append_sheet_rows", ok: false, output: "Google account not connected. Connect it in Settings → Integrations." };

  const spreadsheetId = String(args.spreadsheet_id ?? "").trim();
  const sheetName = String(args.sheet_name ?? "Sheet1");
  const rows = args.rows as string[][] | undefined;
  if (!spreadsheetId || !rows?.length) return { toolName: "google_append_sheet_rows", ok: false, output: "Missing required fields: spreadsheet_id, rows" };

  try {
    const { appendRowsToSheet } = await import("@/lib/integrations/google");
    const result = await appendRowsToSheet(token, spreadsheetId, sheetName, rows);
    return { toolName: "google_append_sheet_rows", ok: true, output: `Appended ${result.rowsAdded} rows to sheet "${sheetName}"` };
  } catch (e) {
    return { toolName: "google_append_sheet_rows", ok: false, output: `Google Sheets error: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

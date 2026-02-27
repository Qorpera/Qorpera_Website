/**
 * Fire-and-forget email notifications for agent events.
 * All exported functions are safe to call without awaiting — errors are swallowed.
 */

import { prisma } from "@/lib/db";
import { getAppPreferences } from "@/lib/settings-store";
import { sendEmail } from "@/lib/email-sender";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.qorpera.ai";

// ─── HTML template helpers ────────────────────────────────────────────────────

function buildHtml(opts: {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  accentColor?: string;
}): string {
  const accent = opts.accentColor ?? "#2dd4bf"; // teal-400
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
        <!-- accent bar -->
        <tr><td style="height:4px;background:${accent};"></td></tr>
        <!-- body -->
        <tr><td style="padding:32px 36px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${accent};">Qorpera Agent</p>
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#f1f5f9;">${opts.title}</h1>
          <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:rgba(241,245,249,0.65);">${opts.body}</p>
          <a href="${opts.ctaHref}" style="display:inline-block;background:${accent};color:#0d1117;font-size:13px;font-weight:700;padding:10px 22px;border-radius:8px;text-decoration:none;">${opts.ctaLabel}</a>
        </td></tr>
        <!-- footer -->
        <tr><td style="padding:16px 36px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;font-size:11px;color:rgba(241,245,249,0.3);">You're receiving this because email notifications are enabled in your qorpera settings.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Shared helper ────────────────────────────────────────────────────────────

async function getUserEmail(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return user?.email ?? null;
}

// ─── Notification functions ───────────────────────────────────────────────────

export async function notifyApprovalNeeded(
  userId: string,
  opts: { taskTitle: string; agentName: string; taskId: string },
): Promise<void> {
  const prefs = await getAppPreferences(userId);
  if (!prefs.notifyApprovalNeeded) return;

  const email = await getUserEmail(userId);
  if (!email) return;

  const ctaHref = `${APP_URL}/inbox`;
  const plainText =
    `Your agent "${opts.agentName}" needs your approval to proceed with "${opts.taskTitle}".\n\n` +
    `Review and approve at: ${ctaHref}`;
  const html = buildHtml({
    title: "Approval needed",
    body: `Your agent <strong>${opts.agentName}</strong> has completed work on <strong>${opts.taskTitle}</strong> and needs your approval before taking action.`,
    ctaLabel: "Review in Inbox",
    ctaHref,
    accentColor: "#f59e0b", // amber for approval
  });

  await sendEmail({ to: email, subject: `Approval needed: ${opts.taskTitle}`, body: plainText, html }, userId);
}

export async function notifySubmissionReady(
  userId: string,
  opts: { taskTitle: string; agentName: string; taskId: string },
): Promise<void> {
  const prefs = await getAppPreferences(userId);
  if (!prefs.notifySubmissionReady) return;

  const email = await getUserEmail(userId);
  if (!email) return;

  const ctaHref = `${APP_URL}/inbox`;
  const plainText =
    `Your agent "${opts.agentName}" has finished drafting "${opts.taskTitle}" and it's ready for your review.\n\n` +
    `View it at: ${ctaHref}`;
  const html = buildHtml({
    title: "Submission ready for review",
    body: `Your agent <strong>${opts.agentName}</strong> has finished drafting <strong>${opts.taskTitle}</strong>. The submission is waiting in your inbox.`,
    ctaLabel: "View Submission",
    ctaHref,
  });

  await sendEmail({ to: email, subject: `Submission ready: ${opts.taskTitle}`, body: plainText, html }, userId);
}

export async function notifyTaskCompleted(
  userId: string,
  opts: { taskTitle: string; agentName: string },
): Promise<void> {
  const prefs = await getAppPreferences(userId);
  if (!prefs.notifyTaskCompleted) return;

  const email = await getUserEmail(userId);
  if (!email) return;

  const ctaHref = `${APP_URL}/results`;
  const plainText =
    `Your agent "${opts.agentName}" has completed "${opts.taskTitle}".\n\n` +
    `View results at: ${ctaHref}`;
  const html = buildHtml({
    title: "Task completed",
    body: `Your agent <strong>${opts.agentName}</strong> has successfully completed <strong>${opts.taskTitle}</strong>.`,
    ctaLabel: "View Results",
    ctaHref,
    accentColor: "#2dd4bf", // teal for success
  });

  await sendEmail({ to: email, subject: `Completed: ${opts.taskTitle}`, body: plainText, html }, userId);
}

export async function notifyTaskFailed(
  userId: string,
  opts: { taskTitle: string; agentName: string; errorMessage?: string },
): Promise<void> {
  const prefs = await getAppPreferences(userId);
  if (!prefs.notifyTaskFailed) return;

  const email = await getUserEmail(userId);
  if (!email) return;

  const ctaHref = `${APP_URL}/inbox`;
  const errorNote = opts.errorMessage ? `\n\nError: ${opts.errorMessage}` : "";
  const plainText =
    `Your agent "${opts.agentName}" encountered an error while working on "${opts.taskTitle}".${errorNote}\n\n` +
    `Review details at: ${ctaHref}`;
  const errorHtml = opts.errorMessage
    ? `<p style="margin:12px 0 0;font-size:12px;color:rgba(241,245,249,0.45);font-family:monospace;">${opts.errorMessage}</p>`
    : "";
  const html = buildHtml({
    title: "Task failed",
    body: `Your agent <strong>${opts.agentName}</strong> encountered an error while working on <strong>${opts.taskTitle}</strong>.${errorHtml}`,
    ctaLabel: "View Details",
    ctaHref,
    accentColor: "#f87171", // red for failure
  });

  await sendEmail({ to: email, subject: `Failed: ${opts.taskTitle}`, body: plainText, html }, userId);
}

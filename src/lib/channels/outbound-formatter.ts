/**
 * Outbound message formatter — adapts agent output for each channel.
 */

/**
 * Format for Slack (Block Kit).
 */
export function formatForSlack(text: string): { text: string; blocks?: unknown[] } {
  // Convert markdown-style headers and lists to Slack Block Kit
  const blocks: unknown[] = [];
  const lines = text.split("\n");

  let currentSection = "";
  for (const line of lines) {
    if (line.startsWith("## ") || line.startsWith("# ")) {
      if (currentSection) {
        blocks.push({ type: "section", text: { type: "mrkdwn", text: currentSection.trim() } });
        currentSection = "";
      }
      blocks.push({ type: "header", text: { type: "plain_text", text: line.replace(/^#+\s*/, "") } });
    } else if (line.startsWith("---")) {
      if (currentSection) {
        blocks.push({ type: "section", text: { type: "mrkdwn", text: currentSection.trim() } });
        currentSection = "";
      }
      blocks.push({ type: "divider" });
    } else {
      currentSection += line + "\n";
    }
  }
  if (currentSection.trim()) {
    blocks.push({ type: "section", text: { type: "mrkdwn", text: currentSection.trim() } });
  }

  return { text: text.slice(0, 3000), blocks: blocks.length > 0 ? blocks : undefined };
}

/**
 * Format for email (dark HTML matching Qorpera's brand).
 */
export function formatForEmail(text: string): { subject: string; html: string; plain: string } {
  const firstLine = text.split("\n")[0].replace(/^#+\s*/, "").slice(0, 120);
  const htmlBody = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="background:#080c10;color:#d1d5db;font-family:system-ui,sans-serif;padding:24px;">
<div style="max-width:600px;margin:0 auto;">
<div style="border-bottom:2px solid #14b8a6;padding-bottom:12px;margin-bottom:20px;">
<h2 style="color:#fff;margin:0;">qorpera</h2></div>
<div style="line-height:1.6;"><p>${htmlBody}</p></div>
<div style="margin-top:24px;padding-top:12px;border-top:1px solid #374151;color:#6b7280;font-size:12px;">
Sent by your qorpera AI workforce</div></div></body></html>`;

  return { subject: firstLine, html, plain: text };
}

/**
 * Format for WhatsApp (plain text with URLs preserved).
 */
export function formatForWhatsApp(text: string): string {
  return text
    .replace(/#+\s*/g, "")     // remove headers
    .replace(/\*\*(.*?)\*\*/g, "*$1*")  // bold → WhatsApp bold
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1: $2")  // links
    .slice(0, 4096);           // WhatsApp message limit
}

/**
 * Format for SMS (160-char segment splitting).
 */
export function formatForSms(text: string): string[] {
  const clean = text
    .replace(/#+\s*/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\n{2,}/g, "\n");

  if (clean.length <= 160) return [clean];

  const segments: string[] = [];
  let remaining = clean;
  while (remaining.length > 0) {
    if (remaining.length <= 160) {
      segments.push(remaining);
      break;
    }
    // Split at last space within 160 chars
    let splitAt = remaining.lastIndexOf(" ", 157);
    if (splitAt < 80) splitAt = 157;
    segments.push(remaining.slice(0, splitAt).trim() + "...");
    remaining = remaining.slice(splitAt).trim();
  }
  return segments;
}

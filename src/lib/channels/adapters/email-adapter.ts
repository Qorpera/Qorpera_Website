/**
 * Email channel adapter — send/receive via Gmail API (preferred) or SMTP fallback.
 */

import type { ChannelAdapter, ChannelInfo, OutboundMessage, SendResult } from "../types";
import { getAccessToken } from "@/lib/integrations/token-store";
import { formatForEmail } from "../outbound-formatter";

export class EmailAdapter implements ChannelAdapter {
  channelType = "EMAIL" as const;

  getChannelInfo(): ChannelInfo {
    return {
      channelType: "EMAIL",
      label: "Email",
      description: "Send and receive emails via Gmail or SMTP",
      icon: "email",
      requiresOAuth: true,
      configFields: [
        { key: "imapHost", label: "IMAP Host (fallback)", type: "text" },
        { key: "imapPort", label: "IMAP Port", type: "text" },
        { key: "imapUser", label: "IMAP User", type: "text" },
        { key: "imapPass", label: "IMAP Password", type: "password" },
      ],
    };
  }

  async send(userId: string, message: OutboundMessage): Promise<SendResult> {
    const token = await getAccessToken(userId, "google");
    if (!token) return { ok: false, error: "Google not connected" };

    const formatted = formatForEmail(message.contentText);
    const to = message.recipientId;

    // Build RFC 2822 message
    const emailLines = [
      `To: ${to}`,
      `Subject: ${formatted.subject}`,
      "MIME-Version: 1.0",
      'Content-Type: multipart/alternative; boundary="boundary123"',
      "",
      "--boundary123",
      "Content-Type: text/plain; charset=utf-8",
      "",
      formatted.plain,
      "--boundary123",
      "Content-Type: text/html; charset=utf-8",
      "",
      formatted.html,
      "--boundary123--",
    ].join("\r\n");

    const raw = Buffer.from(emailLines).toString("base64url");

    try {
      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ raw }),
      });
      if (!res.ok) {
        const err = await res.text();
        return { ok: false, error: `Gmail send failed: ${err.slice(0, 200)}` };
      }
      const data = (await res.json()) as { id: string };
      return { ok: true, externalId: data.id };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Email send error" };
    }
  }
}

/**
 * WhatsApp channel adapter — Meta Cloud API integration.
 * Tracks 24-hour conversation windows.
 */

import type { ChannelAdapter, ChannelInfo, OutboundMessage, SendResult } from "../types";
import { formatForWhatsApp } from "../outbound-formatter";

export class WhatsAppAdapter implements ChannelAdapter {
  channelType = "WHATSAPP" as const;

  getChannelInfo(): ChannelInfo {
    return {
      channelType: "WHATSAPP",
      label: "WhatsApp",
      description: "Send and receive WhatsApp messages via Meta Business API",
      icon: "whatsapp",
      requiresOAuth: false,
      configFields: [
        { key: "phoneNumberId", label: "Phone Number ID", type: "text" },
        { key: "accessToken", label: "Access Token", type: "password" },
        { key: "verifyToken", label: "Webhook Verify Token", type: "text" },
      ],
    };
  }

  async send(_userId: string, message: OutboundMessage): Promise<SendResult> {
    const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
    if (!phoneNumberId || !accessToken) {
      return { ok: false, error: "WhatsApp not configured" };
    }

    const formatted = formatForWhatsApp(message.contentText);

    try {
      const res = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: message.recipientId,
          type: "text",
          text: { body: formatted },
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        return { ok: false, error: `WhatsApp send failed: ${err.slice(0, 200)}` };
      }
      const data = (await res.json()) as { messages?: Array<{ id: string }> };
      return { ok: true, externalId: data.messages?.[0]?.id };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "WhatsApp send error" };
    }
  }
}

export function isConversationWindowOpen(lastInboundAt: Date | null): boolean {
  if (!lastInboundAt) return false;
  const hoursSinceInbound = (Date.now() - lastInboundAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceInbound < 24;
}

export function parseWhatsAppWebhook(body: Record<string, unknown>): {
  from: string;
  text: string;
  messageId: string;
  timestamp: string;
} | null {
  try {
    const entry = (body.entry as Array<Record<string, unknown>>)?.[0];
    const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
    const value = changes?.value as Record<string, unknown>;
    const messages = (value?.messages as Array<Record<string, unknown>>)?.[0];
    if (!messages) return null;
    return {
      from: String(messages.from ?? ""),
      text: String((messages.text as Record<string, unknown>)?.body ?? ""),
      messageId: String(messages.id ?? ""),
      timestamp: String(messages.timestamp ?? ""),
    };
  } catch {
    return null;
  }
}

export function verifyWhatsAppSignature(
  rawBody: string,
  signature: string,
  appSecret: string,
): boolean {
  try {
    const crypto = require("node:crypto");
    const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
    return `sha256=${expected}` === signature;
  } catch {
    return false;
  }
}

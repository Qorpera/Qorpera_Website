/**
 * Slack channel adapter — bidirectional messaging via Slack API.
 */

import type { ChannelAdapter, ChannelInfo, OutboundMessage, SendResult } from "../types";
import { getAccessToken } from "@/lib/integrations/token-store";
import { formatForSlack } from "../outbound-formatter";

export class SlackAdapter implements ChannelAdapter {
  channelType = "SLACK" as const;

  getChannelInfo(): ChannelInfo {
    return {
      channelType: "SLACK",
      label: "Slack",
      description: "Send and receive messages in Slack channels and threads",
      icon: "slack",
      requiresOAuth: true,
      configFields: [],
    };
  }

  async send(userId: string, message: OutboundMessage): Promise<SendResult> {
    const token = await getAccessToken(userId, "slack");
    if (!token) return { ok: false, error: "Slack not connected" };

    const formatted = formatForSlack(message.contentText);

    const body: Record<string, unknown> = {
      channel: message.recipientId,
      text: formatted.text,
    };
    if (formatted.blocks) body.blocks = formatted.blocks;
    if (message.threadId) body.thread_ts = message.threadId;

    try {
      const res = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok: boolean; ts?: string; error?: string };
      if (!data.ok) return { ok: false, error: data.error ?? "Slack send failed" };
      return { ok: true, externalId: data.ts };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Slack send error" };
    }
  }
}

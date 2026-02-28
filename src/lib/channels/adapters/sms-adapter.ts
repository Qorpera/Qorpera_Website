/**
 * SMS channel adapter — Twilio integration.
 */

import type { ChannelAdapter, ChannelInfo, OutboundMessage, SendResult } from "../types";
import { formatForSms } from "../outbound-formatter";

export class SmsAdapter implements ChannelAdapter {
  channelType = "SMS" as const;

  getChannelInfo(): ChannelInfo {
    return {
      channelType: "SMS",
      label: "SMS",
      description: "Send and receive SMS messages via Twilio",
      icon: "sms",
      requiresOAuth: false,
      configFields: [
        { key: "accountSid", label: "Twilio Account SID", type: "text" },
        { key: "authToken", label: "Twilio Auth Token", type: "password" },
        { key: "phoneNumber", label: "Twilio Phone Number", type: "text" },
      ],
    };
  }

  async send(_userId: string, message: OutboundMessage): Promise<SendResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!accountSid || !authToken || !fromNumber) {
      return { ok: false, error: "Twilio not configured" };
    }

    const segments = formatForSms(message.contentText);

    try {
      let lastId: string | undefined;
      for (const segment of segments) {
        const formData = new URLSearchParams();
        formData.set("To", message.recipientId);
        formData.set("From", fromNumber);
        formData.set("Body", segment);

        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        });
        if (!res.ok) {
          const err = await res.text();
          return { ok: false, error: `Twilio send failed: ${err.slice(0, 200)}` };
        }
        const data = (await res.json()) as { sid: string };
        lastId = data.sid;
      }
      return { ok: true, externalId: lastId };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "SMS send error" };
    }
  }
}

export function parseTwilioWebhook(body: URLSearchParams): {
  from: string;
  text: string;
  messageSid: string;
} | null {
  const from = body.get("From");
  const text = body.get("Body");
  const messageSid = body.get("MessageSid");
  if (!from || !text) return null;
  return { from, text, messageSid: messageSid ?? "" };
}

export function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
  authToken: string,
): boolean {
  try {
    const crypto = require("node:crypto");
    const sortedKeys = Object.keys(params).sort();
    let data = url;
    for (const key of sortedKeys) data += key + params[key];
    const expected = crypto.createHmac("sha1", authToken).update(data).digest("base64");
    return expected === signature;
  } catch {
    return false;
  }
}

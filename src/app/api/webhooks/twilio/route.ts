import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { parseTwilioWebhook } from "@/lib/channels/adapters/sms-adapter";
import { routeInboundMessage } from "@/lib/channels/inbound-router";

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

function verifyTwilioSignature(url: string, params: Record<string, string>, signature: string): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return false;

  // Twilio signature: HMAC-SHA1 of URL + sorted params concatenated as key+value
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }
  const expected = crypto.createHmac("sha1", authToken).update(data, "utf8").digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Twilio expects a TwiML response.
 */
export async function POST(req: Request) {
  const text = await req.text();
  const params = new URLSearchParams(text);

  // Verify Twilio signature to prevent fake SMS injection
  if (process.env.TWILIO_AUTH_TOKEN) {
    const signature = req.headers.get("x-twilio-signature") ?? "";
    const url = new URL(req.url);
    const paramsObj: Record<string, string> = {};
    params.forEach((v, k) => { paramsObj[k] = v; });
    if (!verifyTwilioSignature(url.toString(), paramsObj, signature)) {
      return new Response(EMPTY_TWIML, {
        status: 403,
        headers: { "Content-Type": "application/xml" },
      });
    }
  }

  const parsed = parseTwilioWebhook(params);
  if (!parsed) {
    return new Response(EMPTY_TWIML, {
      headers: { "Content-Type": "application/xml" },
    });
  }

  // Look up user by Twilio phone number mapping
  // For now, use a simple env-based mapping
  const userId = process.env.TWILIO_DEFAULT_USER_ID;
  if (!userId) {
    return new Response(EMPTY_TWIML, {
      headers: { "Content-Type": "application/xml" },
    });
  }

  // Store as webhook event
  await prisma.webhookEvent.create({
    data: {
      userId,
      provider: "twilio",
      eventType: "sms.inbound",
      payload: JSON.stringify({ from: parsed.from, text: parsed.text, messageSid: parsed.messageSid }),
      status: "PROCESSED",
      processedAt: new Date(),
    },
  });

  // Route to agent
  routeInboundMessage(userId, {
    channelType: "SMS",
    externalContactId: parsed.from,
    senderLabel: parsed.from,
    contentText: parsed.text,
    externalId: parsed.messageSid,
  }).catch((err) => console.error("[twilio-webhook] route error", err));

  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { "Content-Type": "application/xml" },
  });
}

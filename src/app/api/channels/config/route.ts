import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request-security";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const CHANNEL_LABELS: Record<string, { label: string; description: string }> = {
  SLACK: { label: "Slack", description: "Send and receive messages via Slack channels and threads" },
  EMAIL: { label: "Email", description: "Monitor and reply to emails via Gmail or IMAP" },
  WHATSAPP: { label: "WhatsApp", description: "Communicate with customers via WhatsApp Business" },
  SMS: { label: "SMS", description: "Send and receive SMS messages via Twilio" },
  VOICE: { label: "Voice", description: "Voice call support (coming soon)" },
};

export async function GET() {
  let userId: string;
  try { userId = await requireUserId(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const rows = await prisma.channelConfig.findMany({ where: { userId } });
  const rowMap = new Map(rows.map((r) => [r.channelType, r]));

  const channels = Object.entries(CHANNEL_LABELS).map(([type, meta]) => {
    const row = rowMap.get(type as never);
    return {
      channelType: type,
      label: meta.label,
      description: meta.description,
      enabled: row?.enabled ?? false,
      isDefault: row?.isDefault ?? false,
    };
  });

  return NextResponse.json({ channels });
}

export async function PATCH(request: Request) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;

  let userId: string;
  try { userId = await requireUserId(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  let body: { channelType?: string; enabled?: boolean };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const channelType = body.channelType;
  if (!channelType || !(channelType in CHANNEL_LABELS)) {
    return NextResponse.json({ error: "Invalid channel type" }, { status: 400 });
  }

  const enabled = Boolean(body.enabled);

  await prisma.channelConfig.upsert({
    where: { userId_channelType: { userId, channelType: channelType as never } },
    update: { enabled },
    create: { userId, channelType: channelType as never, enabled },
  });

  return NextResponse.json({ ok: true });
}

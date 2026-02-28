import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  let userId: string;
  try { userId = await requireUserId(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const rows = await prisma.channelConversation.findMany({
    where: { userId, status: "ACTIVE" },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { contentText: true, direction: true, senderLabel: true },
      },
    },
  });

  const conversations = rows.map((r) => ({
    id: r.id,
    channelType: r.channelType,
    externalContactId: r.externalContactId,
    agentTarget: r.agentTarget,
    status: r.status,
    lastMessageAt: r.lastMessageAt.toISOString(),
    messages: r.messages.map((m) => ({
      contentText: m.contentText,
      direction: m.direction,
      senderLabel: m.senderLabel,
    })),
  }));

  return NextResponse.json({ conversations });
}

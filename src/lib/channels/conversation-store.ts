/**
 * Conversation store — manages cross-channel conversations and messages.
 */

import { prisma } from "@/lib/db";
import type { ChannelTypeName, InboundMessage } from "./types";

export async function findOrCreateConversation(
  userId: string,
  channelType: ChannelTypeName,
  opts: { externalThreadId?: string; externalContactId?: string; agentTarget?: string },
) {
  // Try to find existing conversation
  if (opts.externalThreadId) {
    const existing = await prisma.channelConversation.findFirst({
      where: { userId, channelType, externalThreadId: opts.externalThreadId, status: "ACTIVE" },
    });
    if (existing) return existing;
  }

  // Create new conversation
  return prisma.channelConversation.create({
    data: {
      userId,
      channelType,
      externalThreadId: opts.externalThreadId ?? null,
      externalContactId: opts.externalContactId ?? null,
      agentTarget: opts.agentTarget ?? null,
      status: "ACTIVE",
    },
  });
}

export async function recordInboundMessage(
  conversationId: string,
  msg: InboundMessage,
) {
  const message = await prisma.channelMessage.create({
    data: {
      conversationId,
      direction: "inbound",
      senderLabel: msg.senderLabel,
      contentText: msg.contentText.slice(0, 10000),
      contentHtml: msg.contentHtml?.slice(0, 20000) ?? null,
      contentJson: msg.contentJson ?? null,
      externalId: msg.externalId ?? null,
    },
  });

  await prisma.channelConversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  return message;
}

export async function recordOutboundMessage(
  conversationId: string,
  opts: { senderLabel: string; contentText: string; contentHtml?: string; externalId?: string },
) {
  const message = await prisma.channelMessage.create({
    data: {
      conversationId,
      direction: "outbound",
      senderLabel: opts.senderLabel,
      contentText: opts.contentText.slice(0, 10000),
      contentHtml: opts.contentHtml?.slice(0, 20000) ?? null,
      externalId: opts.externalId ?? null,
    },
  });

  await prisma.channelConversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  return message;
}

export async function getConversationHistory(
  conversationId: string,
  limit = 50,
) {
  return prisma.channelMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

export async function getActiveConversations(
  userId: string,
  opts?: { channelType?: ChannelTypeName; limit?: number },
) {
  return prisma.channelConversation.findMany({
    where: {
      userId,
      status: "ACTIVE",
      ...(opts?.channelType && { channelType: opts.channelType }),
    },
    orderBy: { lastMessageAt: "desc" },
    take: opts?.limit ?? 20,
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
}

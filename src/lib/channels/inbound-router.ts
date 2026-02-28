/**
 * Inbound message router — routes incoming channel messages to the right agent.
 * Checks ContactChannelMapping first, falls back to default agent.
 */

import { prisma } from "@/lib/db";
import type { ChannelTypeName, InboundMessage } from "./types";
import { findOrCreateConversation, recordInboundMessage, getConversationHistory } from "./conversation-store";
import { eventBus } from "@/lib/event-bus";

export async function routeInboundMessage(
  userId: string,
  message: InboundMessage,
): Promise<{ taskId: string; conversationId: string } | null> {
  // 1. Look up contact mapping for agent target
  let agentTarget = "CHIEF_ADVISOR";
  const mapping = await prisma.contactChannelMapping.findUnique({
    where: {
      userId_externalId_channelType: {
        userId,
        externalId: message.externalContactId,
        channelType: message.channelType,
      },
    },
  });
  if (mapping?.agentTarget) {
    agentTarget = mapping.agentTarget;
  }

  // 2. Find or create conversation
  const conversation = await findOrCreateConversation(userId, message.channelType, {
    externalThreadId: message.externalThreadId,
    externalContactId: message.externalContactId,
    agentTarget,
  });

  // 3. Record inbound message
  await recordInboundMessage(conversation.id, message);

  // 4. Build context from conversation history
  const history = await getConversationHistory(conversation.id, 20);
  const historyContext = history
    .map((m) => `[${m.direction}] ${m.senderLabel}: ${m.contentText.slice(0, 500)}`)
    .join("\n");

  // 5. Create delegated task
  const task = await prisma.delegatedTask.create({
    data: {
      userId,
      fromAgent: "SYSTEM",
      toAgentTarget: agentTarget,
      title: `Respond to ${message.channelType} message from ${message.senderLabel}`,
      instructions: [
        `A message was received via ${message.channelType} from ${message.senderLabel}.`,
        "",
        "Message:",
        message.contentText.slice(0, 4000),
        "",
        historyContext ? `Conversation history:\n${historyContext.slice(0, 4000)}` : "",
        "",
        `Reply using the channel_reply tool with conversationId: ${conversation.id}`,
      ].join("\n"),
      triggerSource: `CHANNEL:${message.channelType}`,
      status: "QUEUED",
    },
  });

  // Update conversation with task link
  await prisma.channelConversation.update({
    where: { id: conversation.id },
    data: { delegatedTaskId: task.id },
  });

  eventBus.emit({
    type: "CHANNEL_MESSAGE_RECEIVED",
    userId,
    channelType: message.channelType,
    conversationId: conversation.id,
    senderLabel: message.senderLabel,
  });

  return { taskId: task.id, conversationId: conversation.id };
}

/**
 * Channel adapter types for multi-channel presence.
 */

export type ChannelTypeName = "SLACK" | "EMAIL" | "WHATSAPP" | "SMS" | "VOICE";

export type InboundMessage = {
  channelType: ChannelTypeName;
  externalThreadId?: string;
  externalContactId: string;
  senderLabel: string;
  contentText: string;
  contentHtml?: string;
  contentJson?: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
};

export type OutboundMessage = {
  channelType: ChannelTypeName;
  conversationId: string;
  recipientId: string;
  contentText: string;
  contentHtml?: string;
  threadId?: string;
  metadata?: Record<string, unknown>;
};

export type SendResult = {
  ok: boolean;
  externalId?: string;
  error?: string;
};

export type ChannelInfo = {
  channelType: ChannelTypeName;
  label: string;
  description: string;
  icon: string;
  requiresOAuth: boolean;
  configFields: Array<{ key: string; label: string; type: "text" | "password" | "toggle" }>;
};

export interface ChannelAdapter {
  channelType: ChannelTypeName;
  send(userId: string, message: OutboundMessage): Promise<SendResult>;
  getChannelInfo(): ChannelInfo;
}

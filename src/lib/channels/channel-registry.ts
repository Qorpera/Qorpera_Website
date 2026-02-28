/**
 * Channel registry — manages channel adapters and provides a unified send interface.
 */

import { prisma } from "@/lib/db";
import type { ChannelAdapter, ChannelTypeName, OutboundMessage, SendResult, ChannelInfo } from "./types";

const adapters = new Map<ChannelTypeName, ChannelAdapter>();

export function registerAdapter(adapter: ChannelAdapter): void {
  adapters.set(adapter.channelType, adapter);
}

export function getAdapter(channelType: ChannelTypeName): ChannelAdapter | undefined {
  return adapters.get(channelType);
}

export async function sendMessage(userId: string, message: OutboundMessage): Promise<SendResult> {
  const adapter = adapters.get(message.channelType);
  if (!adapter) return { ok: false, error: `No adapter for channel ${message.channelType}` };

  const config = await prisma.channelConfig.findUnique({
    where: { userId_channelType: { userId, channelType: message.channelType } },
  });
  if (!config?.enabled) return { ok: false, error: `Channel ${message.channelType} not enabled` };

  return adapter.send(userId, message);
}

export async function getAvailableChannels(userId: string): Promise<Array<ChannelInfo & { enabled: boolean; isDefault: boolean }>> {
  const configs = await prisma.channelConfig.findMany({
    where: { userId },
  });
  const configMap = new Map(configs.map((c) => [c.channelType, c]));

  const results: Array<ChannelInfo & { enabled: boolean; isDefault: boolean }> = [];
  for (const adapter of adapters.values()) {
    const info = adapter.getChannelInfo();
    const config = configMap.get(info.channelType);
    results.push({
      ...info,
      enabled: config?.enabled ?? false,
      isDefault: config?.isDefault ?? false,
    });
  }
  return results;
}

export async function getDefaultChannel(userId: string): Promise<ChannelTypeName | null> {
  const config = await prisma.channelConfig.findFirst({
    where: { userId, enabled: true, isDefault: true },
    select: { channelType: true },
  });
  return (config?.channelType as ChannelTypeName) ?? null;
}

// Auto-register adapters on import
async function initAdapters() {
  try {
    const { SlackAdapter } = await import("./adapters/slack-adapter");
    registerAdapter(new SlackAdapter());
  } catch { /* slack adapter not available */ }
  try {
    const { EmailAdapter } = await import("./adapters/email-adapter");
    registerAdapter(new EmailAdapter());
  } catch { /* email adapter not available */ }
  try {
    const { WhatsAppAdapter } = await import("./adapters/whatsapp-adapter");
    registerAdapter(new WhatsAppAdapter());
  } catch { /* whatsapp adapter not available */ }
  try {
    const { SmsAdapter } = await import("./adapters/sms-adapter");
    registerAdapter(new SmsAdapter());
  } catch { /* sms adapter not available */ }
}

initAdapters();

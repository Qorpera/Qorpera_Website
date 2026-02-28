"use client";

import { useState, useCallback } from "react";

type ChannelConfig = {
  channelType: string;
  label: string;
  description: string;
  enabled: boolean;
  isDefault: boolean;
};

const CHANNEL_ICONS: Record<string, string> = {
  SLACK: "💬",
  EMAIL: "📧",
  WHATSAPP: "📱",
  SMS: "📲",
  VOICE: "📞",
};

export function ChannelsPanel({ initialChannels }: { initialChannels: ChannelConfig[] }) {
  const [channels, setChannels] = useState(initialChannels);

  const toggleChannel = useCallback(async (channelType: string, enabled: boolean) => {
    const res = await fetch("/api/channels/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelType, enabled }),
    });
    if (res.ok) {
      setChannels((prev) =>
        prev.map((c) => (c.channelType === channelType ? { ...c, enabled } : c)),
      );
    }
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Communication Channels</h2>
      <p className="text-sm text-gray-500">Enable channels for your agents to communicate through.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {channels.map((ch) => (
          <div
            key={ch.channelType}
            className={`rounded-lg border p-4 ${
              ch.enabled ? "border-teal-800/50 bg-teal-950/20" : "border-white/10 bg-white/5"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{CHANNEL_ICONS[ch.channelType] ?? "📡"}</span>
                <div>
                  <h3 className="text-sm font-medium text-white">{ch.label}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{ch.description}</p>
                </div>
              </div>
              <button
                onClick={() => toggleChannel(ch.channelType, !ch.enabled)}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  ch.enabled ? "bg-emerald-900/40 text-emerald-400" : "bg-gray-800 text-gray-500"
                }`}
              >
                {ch.enabled ? "Enabled" : "Disabled"}
              </button>
            </div>
            {ch.isDefault && (
              <span className="mt-2 inline-block rounded bg-teal-900/30 px-1.5 py-0.5 text-[10px] text-teal-400">
                Default
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

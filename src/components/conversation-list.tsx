"use client";

import { useState, useEffect, useCallback } from "react";

type Conversation = {
  id: string;
  channelType: string;
  externalContactId: string | null;
  agentTarget: string | null;
  status: string;
  lastMessageAt: string;
  messages: Array<{ contentText: string; direction: string; senderLabel: string }>;
};

const CHANNEL_ICONS: Record<string, string> = {
  SLACK: "💬",
  EMAIL: "📧",
  WHATSAPP: "📱",
  SMS: "📲",
  VOICE: "📞",
};

export function ConversationList() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (loading) return <div className="text-sm text-gray-500">Loading conversations...</div>;

  if (conversations.length === 0) {
    return <p className="text-sm text-gray-500">No active conversations.</p>;
  }

  return (
    <div className="space-y-2">
      {conversations.map((conv) => {
        const lastMsg = conv.messages[0];
        return (
          <div
            key={conv.id}
            className="rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/[0.08] transition"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">{CHANNEL_ICONS[conv.channelType] ?? "📡"}</span>
              <span className="text-xs text-teal-400 font-medium">{conv.channelType}</span>
              {conv.agentTarget && (
                <span className="text-xs text-gray-500">→ {conv.agentTarget.replace(/_/g, " ")}</span>
              )}
              <span className="ml-auto text-[10px] text-gray-600">
                {new Date(conv.lastMessageAt).toLocaleString()}
              </span>
            </div>
            {lastMsg && (
              <p className="text-xs text-gray-400 truncate">
                <span className="text-gray-500">{lastMsg.direction === "inbound" ? "→" : "←"}</span>{" "}
                {lastMsg.senderLabel}: {lastMsg.contentText.slice(0, 120)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

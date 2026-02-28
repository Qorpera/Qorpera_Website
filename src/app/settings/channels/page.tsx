import { ChannelsPanel } from "@/components/channels-panel";

const STATIC_CHANNELS = [
  { channelType: "SLACK", label: "Slack", description: "Send and receive messages in Slack", enabled: false, isDefault: false },
  { channelType: "EMAIL", label: "Email", description: "Send and receive emails via Gmail", enabled: false, isDefault: false },
  { channelType: "WHATSAPP", label: "WhatsApp", description: "WhatsApp Business API messaging", enabled: false, isDefault: false },
  { channelType: "SMS", label: "SMS", description: "SMS via Twilio", enabled: false, isDefault: false },
  { channelType: "VOICE", label: "Voice", description: "Voice calls (coming soon)", enabled: false, isDefault: false },
];

export default function ChannelsSettingsPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <ChannelsPanel initialChannels={STATIC_CHANNELS} />
    </div>
  );
}

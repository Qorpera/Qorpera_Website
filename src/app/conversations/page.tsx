import { ConversationList } from "@/components/conversation-list";

export default function ConversationsPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-xl font-semibold text-white mb-4">Conversations</h1>
      <p className="text-sm text-gray-500 mb-6">
        Active conversations across all channels. Messages are routed to your agents automatically.
      </p>
      <ConversationList />
    </div>
  );
}

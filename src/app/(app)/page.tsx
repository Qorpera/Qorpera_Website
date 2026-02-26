import { getSession } from "@/lib/auth";
import { ensureBaseAgents } from "@/lib/seed";
import { MarketingLanding } from "@/components/marketing-landing";
import { ensureWorkspaceSeeded } from "@/lib/workspace-store";
import { AdvisorChat } from "@/components/advisor-chat";
import { getAdvisorSessionWithMessages } from "@/lib/advisor-sessions-store";

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ session?: string | string[] | undefined }>;
}) {
  const resolved = (await searchParams) ?? {};
  const session = await getSession();
  if (!session) return <MarketingLanding />;

  await ensureBaseAgents();
  await ensureWorkspaceSeeded(session.userId);
  const requestedSessionId = Array.isArray(resolved.session) ? resolved.session[0] : resolved.session;
  const sessionThread =
    requestedSessionId && typeof requestedSessionId === "string"
      ? await getAdvisorSessionWithMessages(session.userId, requestedSessionId)
      : null;

  const initialMessages = sessionThread?.messages.map((m) => ({
    id: m.id,
    role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
    content: m.content,
    source: (m.source as "openai" | "ollama" | "fallback" | null) ?? undefined,
    model: m.modelName ?? undefined,
  }));
  return (
    <div className="h-[calc(100vh-4rem)] min-h-[580px]">
      <AdvisorChat
        mode="home"
        title=""
        subtitle=""
        hideHeader
        frameless
        chatgptHome
        sessionId={sessionThread?.id ?? null}
        initialMessages={initialMessages}
        seedQuestion=""
      />
    </div>
  );
}

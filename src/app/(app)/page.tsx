import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ensureBaseAgents } from "@/lib/seed";
import { MarketingLanding } from "@/components/marketing-landing";
import { ensureWorkspaceSeeded } from "@/lib/workspace-store";
import { AdvisorChat } from "@/components/advisor-chat";
import { getAdvisorSessionWithMessages } from "@/lib/advisor-sessions-store";
import { getCompanySoul } from "@/lib/company-soul-store";
import { prisma } from "@/lib/db";

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ session?: string | string[] | undefined }>;
}) {
  const resolved = (await searchParams) ?? {};
  const session = await getSession();
  if (!session) return <MarketingLanding />;

  // Onboarding redirect / backfill
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { onboardedAt: true },
  });
  if (!user?.onboardedAt) {
    const soul = await getCompanySoul(session.userId);
    const hasData = [soul.companyName, soul.oneLinePitch, soul.mission, soul.departments].some(
      (v) => v.trim().length > 0,
    );
    if (hasData) {
      // Existing user with data — auto-backfill
      await prisma.user.update({
        where: { id: session.userId },
        data: { onboardedAt: new Date() },
      });
    } else {
      redirect("/onboarding");
    }
  }

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

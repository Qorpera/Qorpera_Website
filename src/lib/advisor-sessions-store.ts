import { prisma } from "@/lib/db";

function fallbackTitle(input: string) {
  const clean = input.trim().replace(/\s+/g, " ");
  if (!clean) return "New session";
  return clean.length > 52 ? `${clean.slice(0, 52)}…` : clean;
}

export async function listAdvisorSessions(userId: string, limit = 30) {
  return prisma.advisorSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

export async function getAdvisorSessionWithMessages(userId: string, sessionId: string) {
  return prisma.advisorSession.findFirst({
    where: { id: sessionId, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function ensureAdvisorSession(userId: string, sessionId?: string | null, firstUserMessage?: string) {
  if (sessionId) {
    const existing = await prisma.advisorSession.findFirst({ where: { id: sessionId, userId } });
    if (existing) return existing;
  }
  const title = fallbackTitle(firstUserMessage ?? "");
  return prisma.advisorSession.create({
    data: { userId, title },
  });
}

export async function appendAdvisorMessage(input: {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  source?: string | null;
  modelName?: string | null;
}) {
  const msg = await prisma.advisorMessage.create({
    data: {
      sessionId: input.sessionId,
      role: input.role,
      content: input.content.slice(0, 20000),
      source: input.source ?? null,
      modelName: input.modelName ?? null,
    },
  });
  await prisma.advisorSession.update({
    where: { id: input.sessionId },
    data: { updatedAt: new Date() },
  });
  return msg;
}

export async function syncAdvisorSessionToBusinessLog(userId: string, sessionId: string) {
  const session = await prisma.advisorSession.findFirst({
    where: { id: sessionId, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!session) return null;

  const transcript = session.messages
    .map((m) => `${m.role === "assistant" ? "Advisor" : "Owner"} (${m.createdAt.toISOString()})\n${m.content.trim()}`)
    .join("\n\n");

  const body =
    `Business advisor chat log for institutional memory and agent alignment.\n` +
    `Session: ${session.title}\n` +
    `Messages: ${session.messages.length}\n\n` +
    `${transcript}`.slice(0, 12000);

  const relatedRef = `CHAT_LOG:${session.id}`;
  const title = `Chat log: ${session.title}`;

  const existing = await prisma.businessLogEntry.findFirst({
    where: { userId, relatedRef },
    select: { id: true },
  });

  if (existing) {
    return prisma.businessLogEntry.update({
      where: { id: existing.id },
      data: {
        title,
        body,
        category: "OPERATIONS",
        source: "AGENT",
        authorLabel: "Business Advisor",
      },
    });
  }

  return prisma.businessLogEntry.create({
    data: {
      userId,
      title,
      body,
      category: "OPERATIONS",
      source: "AGENT",
      authorLabel: "Business Advisor",
      relatedRef,
    },
  });
}

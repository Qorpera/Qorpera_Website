import { prisma } from "@/lib/db";

const MAX_ENTRIES = 30;
const MAX_INDEX_CHARS = 6000;

export async function getAgentMemoryIndex(userId: string, agentKind: string): Promise<string> {
  const mem = await prisma.agentMemory.findUnique({
    where: { userId_agentKind: { userId, agentKind } },
    select: { indexContent: true },
  });
  return mem?.indexContent ?? "";
}

export async function appendMemoryEntry(
  userId: string,
  agentKind: string,
  entry: { topic: string; title: string; content: string; importance: number }
): Promise<void> {
  const mem = await prisma.agentMemory.upsert({
    where: { userId_agentKind: { userId, agentKind } },
    create: { userId, agentKind, indexContent: "", entryCount: 0 },
    update: {},
    select: { id: true },
  });

  await prisma.agentMemoryEntry.create({
    data: {
      agentMemoryId: mem.id,
      topic: entry.topic.slice(0, 80),
      title: entry.title.slice(0, 120),
      content: entry.content.slice(0, 300),
      importance: Math.max(1, Math.min(10, entry.importance)),
    },
  });

  // Atomic increment — only the caller whose increment crosses the threshold compacts.
  // This prevents two concurrent appends from both triggering compaction.
  const updated = await prisma.agentMemory.update({
    where: { id: mem.id },
    data: { entryCount: { increment: 1 } },
    select: { entryCount: true },
  });

  if (updated.entryCount >= MAX_ENTRIES) {
    await compactMemoryIndex(mem.id);
  }
}

export async function compactMemoryIndex(agentMemoryId: string): Promise<void> {
  const entries = await prisma.agentMemoryEntry.findMany({
    where: { agentMemoryId },
    orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
  });

  // Keep top MAX_ENTRIES, delete the rest
  const toDelete = entries.slice(MAX_ENTRIES);
  if (toDelete.length > 0) {
    await prisma.agentMemoryEntry.deleteMany({
      where: { id: { in: toDelete.map((e) => e.id) } },
    });
  }

  const kept = entries.slice(0, MAX_ENTRIES);

  // Rebuild index string
  let indexContent = "## AGENT MEMORY\n";
  for (const e of kept) {
    const line = `[topic: ${e.topic}] ${e.title} → ${e.content}`;
    indexContent += line + "\n";
    if (indexContent.length >= MAX_INDEX_CHARS) break;
  }
  indexContent = indexContent.slice(0, MAX_INDEX_CHARS);

  await prisma.agentMemory.update({
    where: { id: agentMemoryId },
    data: { indexContent, entryCount: kept.length },
  });
}

export async function ingestSubmissionFeedback(
  userId: string,
  agentKind: string,
  sub: { status: string; rating?: number | null; correction?: string | null; notes?: string | null }
): Promise<void> {
  if (sub.status === "ACCEPTED" && (sub.rating ?? 0) >= 4) {
    await appendMemoryEntry(userId, agentKind, {
      topic: "submission-feedback",
      title: "Submission accepted with high rating",
      content: sub.notes ? `Notes: ${sub.notes.slice(0, 250)}` : "Output met user expectations.",
      importance: 3,
    });
  } else if (sub.status === "NEEDS_REVISION") {
    const parts: string[] = [];
    if (sub.correction) parts.push(`Correction: ${sub.correction.slice(0, 150)}`);
    if (sub.notes) parts.push(`Notes: ${sub.notes.slice(0, 100)}`);
    await appendMemoryEntry(userId, agentKind, {
      topic: "submission-feedback",
      title: "User requested revision",
      content: parts.join(" | ").slice(0, 300) || "Output needed revision.",
      importance: 8,
    });
  }
}

export async function ingestTaskCompletion(
  userId: string,
  agentKind: string,
  digest: string
): Promise<void> {
  const excerpt = digest.slice(0, 250);
  await appendMemoryEntry(userId, agentKind, {
    topic: "task-outcome",
    title: "Task completed",
    content: excerpt,
    importance: 4,
  });
}

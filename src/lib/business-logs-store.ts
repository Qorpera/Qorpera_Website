import { BusinessLogCategory, BusinessLogSource } from "@prisma/client";
import { prisma } from "@/lib/db";

export type BusinessLogInput = {
  title: string;
  category?: keyof typeof BusinessLogCategory;
  source?: keyof typeof BusinessLogSource;
  authorLabel?: string;
  body: string;
  relatedRef?: string;
};

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function listBusinessLogs(
  userId: string,
  limit = 40,
  opts?: { excludeChatLogs?: boolean },
) {
  return prisma.businessLogEntry.findMany({
    where: {
      userId,
      ...(opts?.excludeChatLogs
        ? { NOT: { relatedRef: { startsWith: "CHAT_LOG:" } } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function createBusinessLog(userId: string, input: BusinessLogInput) {
  const title = clean(input.title, 240);
  const body = clean(input.body, 12000);
  if (!title || !body) throw new Error("Title and content are required");

  const category =
    input.category && input.category in BusinessLogCategory
      ? BusinessLogCategory[input.category]
      : BusinessLogCategory.GENERAL;
  const source =
    input.source && input.source in BusinessLogSource
      ? BusinessLogSource[input.source]
      : BusinessLogSource.OWNER;

  const row = await prisma.businessLogEntry.create({
    data: {
      userId,
      title,
      body,
      category,
      source,
      authorLabel: clean(input.authorLabel, 160) || null,
      relatedRef: clean(input.relatedRef, 240) || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      scope: "BUSINESS_LOG",
      entityId: row.id,
      action: "CREATE",
      summary: `Business log added: ${row.title}`,
      metadata: JSON.stringify({ category: row.category, source: row.source }),
    },
  });

  return row;
}

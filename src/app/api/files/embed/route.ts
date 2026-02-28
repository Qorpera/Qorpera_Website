import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chunkAndEmbedFile } from "@/lib/embedding-store";

export const runtime = "nodejs";

/**
 * POST /api/files/embed
 * Chunks and embeds up to 20 un-chunked files for the current user.
 * Used to backfill embeddings for files uploaded before chunk-based RAG was added.
 * Returns { processed: number }
 */
export async function POST() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find files that have text but no chunks yet
  const files = await prisma.businessFile.findMany({
    where: {
      userId,
      textExtract: { not: null },
      chunks: { none: {} },
    },
    select: { id: true },
    take: 20,
  });

  let processed = 0;
  for (const file of files) {
    await chunkAndEmbedFile(userId, file.id);
    processed++;
  }

  return NextResponse.json({ processed });
}

import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") ?? undefined;
  const cursor = searchParams.get("cursor") ?? undefined;
  const limitParam = parseInt(searchParams.get("limit") ?? "50", 10);
  const limit = Math.min(Math.max(1, isNaN(limitParam) ? 50 : limitParam), 200);

  const rows = await prisma.auditLog.findMany({
    where: { userId, ...(scope ? { scope } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, scope: true, action: true, summary: true, entityId: true, createdAt: true },
  });

  const hasNext = rows.length > limit;
  const logs = hasNext ? rows.slice(0, limit) : rows;
  const nextCursor = hasNext ? logs[logs.length - 1].id : null;

  return NextResponse.json({ logs, nextCursor });
}

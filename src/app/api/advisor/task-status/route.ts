import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifySameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const ids = (url.searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);

  if (!ids.length) {
    return NextResponse.json({ error: "ids parameter is required" }, { status: 400 });
  }

  const tasks = await prisma.delegatedTask.findMany({
    where: { id: { in: ids }, userId },
    select: {
      id: true,
      title: true,
      toAgentTarget: true,
      status: true,
      completionDigest: true,
      completedAt: true,
    },
  });

  const results = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    toAgent: t.toAgentTarget,
    status: t.status,
    completionDigest: t.completionDigest,
    completedAt: t.completedAt?.toISOString() ?? null,
  }));

  return NextResponse.json({ tasks: results });
}

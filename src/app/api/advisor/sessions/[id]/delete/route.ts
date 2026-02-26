import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const sessionRow = await prisma.advisorSession.findFirst({
    where: { id, userId },
    select: { id: true, title: true },
  });
  if (!sessionRow) {
    return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  }

  await prisma.$transaction([
    prisma.businessLogEntry.deleteMany({
      where: { userId: userId, relatedRef: `CHAT_LOG:${sessionRow.id}` },
    }),
    prisma.advisorSession.delete({
      where: { id: sessionRow.id },
    }),
    prisma.auditLog.create({
      data: {
        userId: userId,
        scope: "ADVISOR_SESSION",
        entityId: sessionRow.id,
        action: "DELETE",
        summary: `Deleted advisor chat session: ${sessionRow.title}`,
      },
    }),
  ]);

  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}

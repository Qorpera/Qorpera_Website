import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { SubmissionReviewBody } from "@/lib/schemas";
import { verifySameOrigin } from "@/lib/request-security";
import { ingestSubmissionFeedback } from "@/lib/agent-memory-store";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sameOrigin = verifySameOrigin(req);
  if (!sameOrigin.ok) return sameOrigin.response;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const form = await req.formData();
  const data = Object.fromEntries(form.entries());
  const parsed = SubmissionReviewBody.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const sub = await prisma.submission.findFirst({ where: { id, userId } });
  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.submission.update({
    where: { id },
    data: {
      status: parsed.data.status,
      rating: parsed.data.rating,
      correction: parsed.data.correction ?? null,
      notes: parsed.data.notes ?? null,
    },
  });

  ingestSubmissionFeedback(userId, sub.agentKind, {
    status: parsed.data.status,
    rating: parsed.data.rating,
    correction: parsed.data.correction,
    notes: parsed.data.notes,
  }).catch(() => {});

  return NextResponse.redirect(new URL(`/results/${id}`, req.url));
}

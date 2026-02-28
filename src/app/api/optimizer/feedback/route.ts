import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-guard";
import { getFeedbackSummary, analyzeFeedbackPatterns } from "@/lib/optimizer/feedback-analyzer";

export async function GET(req: Request) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const agentKind = searchParams.get("agentKind") ?? "CHIEF_ADVISOR";

  const summary = await getFeedbackSummary(session.userId, agentKind);
  return NextResponse.json(summary);
}

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { agentKind: string };
  if (!body.agentKind) return NextResponse.json({ error: "agentKind required" }, { status: 400 });

  const count = await analyzeFeedbackPatterns(session.userId, body.agentKind);
  return NextResponse.json({ patternsFound: count });
}

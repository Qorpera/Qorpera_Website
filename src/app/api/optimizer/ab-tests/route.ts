import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-guard";
import { createAbTest } from "@/lib/optimizer/ab-test-store";

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    agentKind: string;
    label: string;
    patchText: string;
    trafficPercent?: number;
  };

  if (!body.agentKind || !body.label || !body.patchText) {
    return NextResponse.json({ error: "agentKind, label, and patchText required" }, { status: 400 });
  }

  const variantId = await createAbTest({
    userId: session.userId,
    agentKind: body.agentKind,
    label: body.label,
    patchText: body.patchText,
    trafficPercent: body.trafficPercent,
  });

  return NextResponse.json({ variantId }, { status: 201 });
}

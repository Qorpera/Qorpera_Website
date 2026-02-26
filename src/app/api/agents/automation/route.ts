import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getAgentAutomationConfig, getAllAgentAutomationConfigs, upsertAgentAutomationConfig, type AgentTarget } from "@/lib/orchestration-store";
import { UpsertAutomationConfigBody } from "@/lib/schemas";
import { verifySameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

function validTarget(value: unknown): value is AgentTarget {
  return value === "CHIEF_ADVISOR" || value === "ASSISTANT" || value === "PROJECT_MANAGER";
}

export async function GET(request: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const target = url.searchParams.get("target");
  if (validTarget(target)) {
    const config = await getAgentAutomationConfig(userId, target);
    return NextResponse.json({ config });
  }
  const configs = await getAllAgentAutomationConfigs(userId);
  return NextResponse.json({ configs });
}

export async function POST(request: Request) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const raw = await request.json().catch(() => ({}));
  const parsed = UpsertAutomationConfigBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const config = await upsertAgentAutomationConfig(userId, parsed.data.agentTarget, parsed.data);
  return NextResponse.json({ ok: true, config });
}

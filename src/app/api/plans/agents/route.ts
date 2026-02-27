import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { hireAgentWithinPlan, fireAgentFromPlan, type HireAgentKind } from "@/lib/agent-hiring";
import { verifySameOrigin } from "@/lib/request-security";
import { z } from "zod";

const AgentActionBody = z.object({
  action: z.enum(["hire", "fire"]),
  agentKind: z.enum([
    "ASSISTANT",
    "SALES_REP",
    "CUSTOMER_SUCCESS",
    "MARKETING_COORDINATOR",
    "FINANCE_ANALYST",
    "OPERATIONS_MANAGER",
    "EXECUTIVE_ASSISTANT",
    "RESEARCH_ANALYST",
  ]),
});

export async function POST(req: Request) {
  const sameOrigin = verifySameOrigin(req);
  if (!sameOrigin.ok) return sameOrigin.response;

  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = AgentActionBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { action, agentKind } = parsed.data;

  if (action === "hire") {
    const result = await hireAgentWithinPlan(userId, agentKind as HireAgentKind);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }
    return NextResponse.json({ ok: true, created: result.created });
  }

  const result = await fireAgentFromPlan(userId, agentKind as HireAgentKind);
  return NextResponse.json({ ok: true, deactivated: result.deactivated });
}

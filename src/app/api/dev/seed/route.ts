import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { ensureBaseAgents } from "@/lib/seed";
import { requireProductionDisabled } from "@/lib/request-security";

export async function GET(req: Request) {
  const disabled = requireProductionDisabled(req, "Dev seed route");
  if (disabled) return disabled;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureBaseAgents();

  const count = await prisma.submission.count({ where: { userId } });
  if (count < 5) {
    await prisma.submission.createMany({
      data: [
        {
          userId: userId,
          agentKind: "ASSISTANT",
          title: "Daily inbox cleanup summary",
          output: "- 12 emails triaged\n- 3 drafted replies ready for approval\n- 2 follow-ups scheduled\n\n(Stub output — wire real agent later)",
        },
        {
          userId: userId,
          agentKind: "ASSISTANT",
          title: "Weekly project status update",
          output:
            "Milestones:\n- UI scaffold: done\n- Auth: done\nRisks:\n- Agent runtime not implemented (by design in v0)\nNext:\n- Add workflow runner + local model executor\n\n(Stub output)",
        },
        {
          userId: userId,
          agentKind: "ASSISTANT",
          title: "Customer support macro draft",
          output: "Hi <name>,\n\nThanks for reaching out — here’s what we can do next: ...\n\n(Stub output)",
        },
      ],
    });
  }

  return NextResponse.redirect(new URL("/results", req.url));
}

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-guard";
import { testSkillDryRun } from "@/lib/custom-skills-store";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await testSkillDryRun(session.userId, id);
  return NextResponse.json(result);
}

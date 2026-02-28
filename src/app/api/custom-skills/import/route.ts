import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-guard";
import { importSkill } from "@/lib/custom-skills-store";

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as { shareToken: string };
  if (!body.shareToken) return NextResponse.json({ error: "shareToken required" }, { status: 400 });

  const skill = await importSkill(session.userId, body.shareToken);
  if (!skill) return NextResponse.json({ error: "Skill not found or not published" }, { status: 404 });
  return NextResponse.json({ skill }, { status: 201 });
}

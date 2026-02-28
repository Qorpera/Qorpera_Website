import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-guard";
import { listCustomSkills, createCustomSkill } from "@/lib/custom-skills-store";

export async function GET() {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const skills = await listCustomSkills(session.userId);
  return NextResponse.json({ skills });
}

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.name || !body.displayName || !body.skillMdContent) {
    return NextResponse.json({ error: "name, displayName, and skillMdContent are required" }, { status: 400 });
  }
  const skill = await createCustomSkill(session.userId, body);
  return NextResponse.json({ skill }, { status: 201 });
}

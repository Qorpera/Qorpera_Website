import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-guard";
import { publishSkill, unpublishSkill } from "@/lib/custom-skills-store";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json()) as { publish: boolean };

  if (body.publish === false) {
    await unpublishSkill(session.userId, id);
    return NextResponse.json({ ok: true });
  }

  const shareToken = await publishSkill(session.userId, id);
  if (!shareToken) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ shareToken });
}

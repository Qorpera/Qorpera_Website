import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { WORKFLOW_TEMPLATES } from "@/lib/workflow-templates";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = WORKFLOW_TEMPLATES.map((t) => ({
    slug: t.slug,
    name: t.name,
    description: t.description,
    category: t.category,
  }));

  return NextResponse.json({ templates });
}

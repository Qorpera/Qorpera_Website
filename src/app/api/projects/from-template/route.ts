import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { createProjectFromTemplate } from "@/lib/workspace-store";
import { verifySameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const templateSlug = String(form.get("templateSlug") ?? "");
  if (!templateSlug) return NextResponse.json({ error: "Missing templateSlug" }, { status: 400 });

  const project = await createProjectFromTemplate(userId, templateSlug);
  if (!project) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  return NextResponse.redirect(new URL(`/projects/${project.slug}`, request.url));
}

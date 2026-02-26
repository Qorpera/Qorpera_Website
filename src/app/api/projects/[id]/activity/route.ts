import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getProjectActivityExport, ensureWorkspaceSeeded } from "@/lib/workspace-store";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await ensureWorkspaceSeeded(userId);
  const data = await getProjectActivityExport(userId, id);
  if (!data) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = [
    `Project: ${data.project.name}`,
    `Goal: ${data.project.goal}`,
    "",
    "Activity Timeline",
    ...data.entries.map((entry) => `- ${entry.createdAt.toISOString()} · ${entry.action} · ${entry.summary}`),
  ].join("\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${data.project.slug}-activity-log.txt"`,
    },
  });
}

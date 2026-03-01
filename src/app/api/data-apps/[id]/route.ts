import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getDataApp, deleteDataApp } from "@/lib/data-app-store";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const app = await getDataApp(userId, id);
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ app });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    await deleteDataApp(userId, id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Data app not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[data-apps] delete failed:", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

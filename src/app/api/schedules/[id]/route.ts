import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { updateSchedule, deleteSchedule } from "@/lib/schedule-store";
import { UpdateScheduleBody } from "@/lib/schemas";
import { verifySameOrigin } from "@/lib/request-security";
import { ScheduleFrequency } from "@prisma/client";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const raw = await request.json().catch(() => ({}));
  const parsed = UpdateScheduleBody.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  try {
    const data = parsed.data;
    const schedule = await updateSchedule(userId, id, {
      ...data,
      frequency: data.frequency ? (data.frequency as ScheduleFrequency) : undefined,
    });
    return NextResponse.json({ schedule });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Schedule not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[schedules] update failed:", e);
    return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });
  }
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
    await deleteSchedule(userId, id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Schedule not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[schedules] delete failed:", e);
    return NextResponse.json({ error: "Failed to delete schedule" }, { status: 500 });
  }
}

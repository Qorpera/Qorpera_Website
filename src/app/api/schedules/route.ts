import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { listSchedules, createSchedule } from "@/lib/schedule-store";
import { CreateScheduleBody } from "@/lib/schemas";
import { verifySameOrigin } from "@/lib/request-security";
import { ScheduleFrequency } from "@prisma/client";

export const runtime = "nodejs";

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const schedules = await listSchedules(userId);
  return NextResponse.json({ schedules });
}

export async function POST(request: Request) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const raw = await request.json().catch(() => ({}));
  const parsed = CreateScheduleBody.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  try {
    const schedule = await createSchedule(userId, {
      ...parsed.data,
      frequency: parsed.data.frequency as ScheduleFrequency,
    });
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (e: unknown) {
    console.error("[schedules] create failed:", e);
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });
  }
}

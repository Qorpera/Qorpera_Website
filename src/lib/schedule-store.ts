import { prisma } from "@/lib/db";
import { ScheduleFrequency } from "@prisma/client";

export type ScheduleView = {
  id: string;
  userId: string;
  agentKind: string;
  title: string;
  instructions: string;
  frequency: ScheduleFrequency;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  timeOfDay: string;
  timezone: string;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastRunDigest: string | null;
  lastRunCompletedAt: string | null;
};

function toView(
  s: {
    id: string;
    userId: string;
    agentKind: string;
    title: string;
    instructions: string;
    frequency: ScheduleFrequency;
    dayOfWeek: number | null;
    dayOfMonth: number | null;
    timeOfDay: string;
    timezone: string;
    enabled: boolean;
    lastRunAt: Date | null;
    nextRunAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
  lastRunDigest?: string | null,
  lastRunCompletedAt?: Date | null,
): ScheduleView {
  return {
    id: s.id,
    userId: s.userId,
    agentKind: s.agentKind,
    title: s.title,
    instructions: s.instructions,
    frequency: s.frequency,
    dayOfWeek: s.dayOfWeek,
    dayOfMonth: s.dayOfMonth,
    timeOfDay: s.timeOfDay,
    timezone: s.timezone,
    enabled: s.enabled,
    lastRunAt: s.lastRunAt?.toISOString() ?? null,
    nextRunAt: s.nextRunAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    lastRunDigest: lastRunDigest ?? null,
    lastRunCompletedAt: lastRunCompletedAt?.toISOString() ?? null,
  };
}

/**
 * Compute the next run timestamp for a schedule, DST-safe via Intl.DateTimeFormat.
 * @param frequency DAILY | WEEKLY | MONTHLY
 * @param dayOfWeek 0=Sun..6=Sat (WEEKLY only)
 * @param dayOfMonth 1-31 (MONTHLY only)
 * @param timeOfDay "HH:MM" 24h string
 * @param timezone IANA timezone string e.g. "America/New_York"
 * @param from Base date (defaults to now)
 */
export function computeNextRunAt(
  frequency: ScheduleFrequency,
  dayOfWeek: number | null | undefined,
  dayOfMonth: number | null | undefined,
  timeOfDay: string,
  timezone: string,
  from: Date = new Date(),
): Date {
  const [hh, mm] = timeOfDay.split(":").map(Number);

  // Parse the current local date/time in the target timezone via Intl
  function localParts(d: Date): { year: number; month: number; day: number; hour: number; minute: number; dow: number } {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
    const year = get("year");
    const month = get("month"); // 1-12
    const day = get("day");
    // hour24: Intl can return "24" for midnight — normalise to 0
    const hour = get("hour") % 24;
    const minute = get("minute");
    const dow = new Date(
      new Date(d).toLocaleString("en-US", { timeZone: timezone }),
    ).getDay();
    return { year, month, day, hour, minute, dow };
  }

  // Build a UTC Date from local date components in the target timezone.
  // Two-pass approach: first naive, then correct for DST offset.
  function utcFromLocal(year: number, month: number, day: number, hour: number, minute: number): Date {
    // First pass: rough UTC estimate
    const naive = new Date(Date.UTC(year, month - 1, day, hour, minute));
    // What time does Intl think this UTC moment is in the target timezone?
    const p = localParts(naive);
    const diffH = hour - p.hour;
    const diffM = minute - p.minute;
    // Second pass: corrected
    return new Date(Date.UTC(year, month - 1, day, hour - diffH, minute - diffM));
  }

  const lp = localParts(from);

  if (frequency === ScheduleFrequency.DAILY) {
    // Today at timeOfDay if not yet passed, else tomorrow
    let candidate = utcFromLocal(lp.year, lp.month, lp.day, hh, mm);
    if (candidate.getTime() <= from.getTime()) {
      // advance one calendar day in local tz
      candidate = utcFromLocal(lp.year, lp.month, lp.day + 1, hh, mm);
    }
    return candidate;
  }

  if (frequency === ScheduleFrequency.WEEKLY) {
    const target = (dayOfWeek ?? 1) as number; // default Monday
    const current = lp.dow;
    let daysAhead = (target - current + 7) % 7;
    if (daysAhead === 0) {
      // Same day — check if time has passed
      const candidate = utcFromLocal(lp.year, lp.month, lp.day, hh, mm);
      if (candidate.getTime() <= from.getTime()) {
        daysAhead = 7;
      }
    }
    const candidate = utcFromLocal(lp.year, lp.month, lp.day + daysAhead, hh, mm);
    return candidate;
  }

  // MONTHLY
  const targetDay = (dayOfMonth ?? 1) as number;

  // Try this month first
  for (let monthOffset = 0; monthOffset <= 12; monthOffset++) {
    const year = lp.year + Math.floor((lp.month - 1 + monthOffset) / 12);
    const month = ((lp.month - 1 + monthOffset) % 12) + 1;
    // Check if the day actually exists in this month
    const daysInMonth = new Date(year, month, 0).getDate();
    if (targetDay > daysInMonth) continue; // skip months where day doesn't exist

    const candidate = utcFromLocal(year, month, targetDay, hh, mm);
    if (candidate.getTime() > from.getTime()) {
      return candidate;
    }
  }

  // Fallback: 30 days out (should never reach here)
  return new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);
}

export type CreateScheduleInput = {
  agentKind: string;
  title: string;
  instructions: string;
  frequency: ScheduleFrequency;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  timeOfDay: string;
  timezone?: string;
};

export type UpdateScheduleInput = Partial<CreateScheduleInput> & { enabled?: boolean };

export async function listSchedules(userId: string): Promise<ScheduleView[]> {
  const rows = await prisma.schedule.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  if (rows.length === 0) return [];

  // Fetch the latest completed task digest for each schedule (matched by title + agentKind)
  const digestMap = new Map<string, { digest: string; completedAt: Date }>();
  const recentTasks = await prisma.delegatedTask.findMany({
    where: {
      userId,
      triggerSource: "SCHEDULED",
      status: { in: ["DONE", "REVIEW"] },
      completionDigest: { not: null },
      title: { in: rows.map((r) => r.title) },
    },
    orderBy: { completedAt: "desc" },
    select: { title: true, toAgentTarget: true, completionDigest: true, completedAt: true },
    take: rows.length * 3, // fetch a few per schedule to find the right agentKind
  });

  for (const task of recentTasks) {
    const key = `${task.toAgentTarget}::${task.title}`;
    if (!digestMap.has(key) && task.completionDigest && task.completedAt) {
      digestMap.set(key, { digest: task.completionDigest, completedAt: task.completedAt });
    }
  }

  return rows.map((s) => {
    const hit = digestMap.get(`${s.agentKind}::${s.title}`);
    return toView(s, hit?.digest, hit?.completedAt);
  });
}

export async function createSchedule(userId: string, input: CreateScheduleInput): Promise<ScheduleView> {
  const nextRunAt = computeNextRunAt(
    input.frequency,
    input.dayOfWeek,
    input.dayOfMonth,
    input.timeOfDay,
    input.timezone ?? "UTC",
  );
  const row = await prisma.schedule.create({
    data: {
      userId,
      agentKind: input.agentKind,
      title: input.title,
      instructions: input.instructions,
      frequency: input.frequency,
      dayOfWeek: input.dayOfWeek ?? null,
      dayOfMonth: input.dayOfMonth ?? null,
      timeOfDay: input.timeOfDay,
      timezone: input.timezone ?? "UTC",
      nextRunAt,
    },
  });
  return toView(row);
}

export async function updateSchedule(userId: string, id: string, input: UpdateScheduleInput): Promise<ScheduleView> {
  // Verify ownership
  const existing = await prisma.schedule.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Schedule not found");

  // Merge fields
  const merged = {
    agentKind: input.agentKind ?? existing.agentKind,
    title: input.title ?? existing.title,
    instructions: input.instructions ?? existing.instructions,
    frequency: input.frequency ?? existing.frequency,
    dayOfWeek: input.dayOfWeek !== undefined ? input.dayOfWeek : existing.dayOfWeek,
    dayOfMonth: input.dayOfMonth !== undefined ? input.dayOfMonth : existing.dayOfMonth,
    timeOfDay: input.timeOfDay ?? existing.timeOfDay,
    timezone: input.timezone ?? existing.timezone,
    enabled: input.enabled !== undefined ? input.enabled : existing.enabled,
  };

  // Always recompute nextRunAt to prevent stale values on re-enable
  const nextRunAt = computeNextRunAt(
    merged.frequency,
    merged.dayOfWeek,
    merged.dayOfMonth,
    merged.timeOfDay,
    merged.timezone,
  );

  const updated = await prisma.schedule.update({
    where: { id },
    data: { ...merged, nextRunAt },
  });
  return toView(updated);
}

export async function deleteSchedule(userId: string, id: string): Promise<void> {
  const existing = await prisma.schedule.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Schedule not found");
  await prisma.schedule.delete({ where: { id } });
}

export async function getSchedulesDue(userId: string) {
  return prisma.schedule.findMany({
    where: {
      userId,
      enabled: true,
      nextRunAt: { lte: new Date() },
    },
  });
}

export async function markScheduleRan(id: string): Promise<void> {
  const row = await prisma.schedule.findUnique({ where: { id } });
  if (!row) return;
  const nextRunAt = computeNextRunAt(
    row.frequency,
    row.dayOfWeek,
    row.dayOfMonth,
    row.timeOfDay,
    row.timezone,
  );
  await prisma.schedule.update({
    where: { id },
    data: { lastRunAt: new Date(), nextRunAt },
  });
}

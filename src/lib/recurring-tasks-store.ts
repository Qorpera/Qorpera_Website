import { prisma } from "@/lib/db";

export type RecurringTaskView = {
  id: string;
  userId: string;
  agentTarget: string;
  title: string;
  instructions: string;
  scheduleTime: string;
  daysOfWeek: string[];
  isActive: boolean;
  lastRunAt: string | null;
  createdAt: string;
};

function toView(rt: {
  id: string;
  userId: string;
  agentTarget: string;
  title: string;
  instructions: string;
  scheduleTime: string;
  daysOfWeek: string;
  isActive: boolean;
  lastRunAt: Date | null;
  createdAt: Date;
}): RecurringTaskView {
  return {
    id: rt.id,
    userId: rt.userId,
    agentTarget: rt.agentTarget,
    title: rt.title,
    instructions: rt.instructions,
    scheduleTime: rt.scheduleTime,
    daysOfWeek: rt.daysOfWeek.split(",").map((s) => s.trim()).filter(Boolean),
    isActive: rt.isActive,
    lastRunAt: rt.lastRunAt ? rt.lastRunAt.toISOString() : null,
    createdAt: rt.createdAt.toISOString(),
  };
}

export async function listRecurringTasks(userId: string): Promise<RecurringTaskView[]> {
  const rows = await prisma.recurringTask.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toView);
}

export async function createRecurringTask(
  userId: string,
  input: {
    agentTarget: string;
    title: string;
    instructions: string;
    scheduleTime: string;
    daysOfWeek: string[];
  }
): Promise<RecurringTaskView> {
  if (!/^\d{2}:\d{2}$/.test(input.scheduleTime)) {
    throw new Error("scheduleTime must be HH:MM");
  }
  if (input.title.length > 240) throw new Error("title too long");
  if (input.instructions.length > 12000) throw new Error("instructions too long");

  const row = await prisma.recurringTask.create({
    data: {
      userId,
      agentTarget: input.agentTarget,
      title: input.title,
      instructions: input.instructions,
      scheduleTime: input.scheduleTime,
      daysOfWeek: input.daysOfWeek.join(","),
    },
  });
  return toView(row);
}

export async function updateRecurringTask(
  userId: string,
  id: string,
  patch: {
    isActive?: boolean;
    title?: string;
    instructions?: string;
    scheduleTime?: string;
    daysOfWeek?: string[];
  }
): Promise<RecurringTaskView> {
  const data: Record<string, unknown> = {};
  if (patch.isActive !== undefined) data.isActive = patch.isActive;
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.instructions !== undefined) data.instructions = patch.instructions;
  if (patch.scheduleTime !== undefined) data.scheduleTime = patch.scheduleTime;
  if (patch.daysOfWeek !== undefined) data.daysOfWeek = patch.daysOfWeek.join(",");

  const row = await prisma.recurringTask.update({
    where: { id, userId },
    data,
  });
  return toView(row);
}

export async function deleteRecurringTask(userId: string, id: string): Promise<void> {
  await prisma.recurringTask.delete({ where: { id, userId } });
}

/**
 * Task group store — manages agent-to-agent communication via shared task groups.
 */

import { prisma } from "@/lib/db";

export async function createTaskGroup(userId: string, title: string, parentTaskId?: string) {
  return prisma.taskGroup.create({
    data: { userId, title, parentTaskId: parentTaskId ?? null },
  });
}

export async function getTaskGroup(id: string) {
  return prisma.taskGroup.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 20 },
      workspace: true,
    },
  });
}

export async function linkTaskToGroup(taskId: string, taskGroupId: string) {
  await prisma.delegatedTask.update({
    where: { id: taskId },
    data: { taskGroupId },
  });
}

export async function sendAgentMessage(input: {
  taskGroupId: string;
  fromAgent: string;
  toAgent: string;
  messageType: string;
  content: string;
  metadata?: string;
}) {
  return prisma.agentMessage.create({
    data: {
      taskGroupId: input.taskGroupId,
      fromAgent: input.fromAgent,
      toAgent: input.toAgent,
      messageType: input.messageType,
      content: input.content.slice(0, 10000),
      metadata: input.metadata ?? null,
    },
  });
}

export async function getMessagesForAgent(taskGroupId: string, agentKind: string, limit = 20) {
  return prisma.agentMessage.findMany({
    where: {
      taskGroupId,
      OR: [{ toAgent: agentKind }, { toAgent: "*" }, { fromAgent: agentKind }],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function writeWorkspace(taskGroupId: string, key: string, value: string, writtenBy: string) {
  return prisma.workspaceEntry.upsert({
    where: { taskGroupId_key: { taskGroupId, key } },
    create: { taskGroupId, key, value: value.slice(0, 20000), writtenBy },
    update: { value: value.slice(0, 20000), writtenBy, version: { increment: 1 } },
  });
}

export async function readWorkspace(taskGroupId: string, key: string) {
  return prisma.workspaceEntry.findUnique({
    where: { taskGroupId_key: { taskGroupId, key } },
  });
}

export async function getWorkspaceSnapshot(taskGroupId: string) {
  const entries = await prisma.workspaceEntry.findMany({
    where: { taskGroupId },
    orderBy: { key: "asc" },
  });
  return Object.fromEntries(entries.map((e) => [e.key, { value: e.value, writtenBy: e.writtenBy, version: e.version }]));
}

export async function completeTaskGroup(id: string, status: "COMPLETED" | "FAILED") {
  await prisma.taskGroup.update({
    where: { id },
    data: { status },
  });
}

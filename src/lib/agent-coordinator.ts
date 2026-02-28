/**
 * Agent coordinator — high-level agent-to-agent collaboration primitives.
 */

import { prisma } from "@/lib/db";
import { createTaskGroup, sendAgentMessage, linkTaskToGroup, writeWorkspace, getWorkspaceSnapshot, completeTaskGroup } from "@/lib/task-group-store";
import { eventBus } from "@/lib/event-bus";

/**
 * Have one agent request help from another.
 * Creates a task group, REQUEST message, and delegated task for the helper agent.
 */
export async function requestAgentHelp(input: {
  userId: string;
  fromAgent: string;
  toAgent: string;
  title: string;
  instructions: string;
  parentTaskId?: string;
}): Promise<{ taskGroupId: string; helperTaskId: string }> {
  const group = await createTaskGroup(input.userId, input.title, input.parentTaskId);

  await sendAgentMessage({
    taskGroupId: group.id,
    fromAgent: input.fromAgent,
    toAgent: input.toAgent,
    messageType: "REQUEST",
    content: input.instructions,
  });

  const task = await prisma.delegatedTask.create({
    data: {
      userId: input.userId,
      fromAgent: input.fromAgent,
      toAgentTarget: input.toAgent,
      title: input.title,
      instructions: input.instructions,
      triggerSource: `AGENT_REQUEST:${input.fromAgent}`,
      taskGroupId: group.id,
      status: "QUEUED",
    },
  });

  await linkTaskToGroup(task.id, group.id);

  eventBus.emit({
    type: "AGENT_MESSAGE_SENT",
    userId: input.userId,
    taskGroupId: group.id,
    fromAgent: input.fromAgent,
    toAgent: input.toAgent,
    messageType: "REQUEST",
  });

  return { taskGroupId: group.id, helperTaskId: task.id };
}

/**
 * Launch parallel subtasks within a task group.
 */
export async function launchParallelSubtasks(input: {
  userId: string;
  taskGroupId: string;
  fromAgent: string;
  subtasks: Array<{ toAgent: string; title: string; instructions: string }>;
}): Promise<string[]> {
  const taskIds: string[] = [];

  for (const sub of input.subtasks) {
    await sendAgentMessage({
      taskGroupId: input.taskGroupId,
      fromAgent: input.fromAgent,
      toAgent: sub.toAgent,
      messageType: "REQUEST",
      content: sub.instructions,
    });

    const task = await prisma.delegatedTask.create({
      data: {
        userId: input.userId,
        fromAgent: input.fromAgent,
        toAgentTarget: sub.toAgent,
        title: sub.title,
        instructions: sub.instructions,
        triggerSource: `AGENT_PARALLEL:${input.fromAgent}`,
        taskGroupId: input.taskGroupId,
        status: "QUEUED",
      },
    });

    await linkTaskToGroup(task.id, input.taskGroupId);
    taskIds.push(task.id);
  }

  return taskIds;
}

/**
 * Aggregate results from all tasks in a group.
 */
export async function aggregateGroupResults(taskGroupId: string): Promise<{
  completed: number;
  failed: number;
  pending: number;
  results: Array<{ agent: string; status: string; digest: string }>;
}> {
  const tasks = await prisma.delegatedTask.findMany({
    where: { taskGroupId },
    select: { toAgentTarget: true, status: true, completionDigest: true },
  });

  const completed = tasks.filter((t) => t.status === "DONE").length;
  const failed = tasks.filter((t) => t.status === "FAILED").length;
  const pending = tasks.filter((t) => !["DONE", "FAILED"].includes(t.status)).length;

  return {
    completed,
    failed,
    pending,
    results: tasks.map((t) => ({
      agent: t.toAgentTarget,
      status: t.status,
      digest: t.completionDigest?.slice(0, 500) ?? "",
    })),
  };
}

/**
 * On task completion in a group, send RESULT message and check if group is done.
 */
export async function onGroupTaskCompleted(taskId: string, agentKind: string, digest: string) {
  const task = await prisma.delegatedTask.findUnique({
    where: { id: taskId },
    select: { taskGroupId: true, userId: true },
  });
  if (!task?.taskGroupId) return;

  await sendAgentMessage({
    taskGroupId: task.taskGroupId,
    fromAgent: agentKind,
    toAgent: "*",
    messageType: "RESULT",
    content: digest.slice(0, 5000),
  });

  // Write to workspace
  await writeWorkspace(task.taskGroupId, `result:${agentKind}:${taskId.slice(-6)}`, digest.slice(0, 10000), agentKind);

  // Check if all tasks in group are done
  const { pending } = await aggregateGroupResults(task.taskGroupId);
  if (pending === 0) {
    const { failed } = await aggregateGroupResults(task.taskGroupId);
    await completeTaskGroup(task.taskGroupId, failed > 0 ? "FAILED" : "COMPLETED");

    eventBus.emit({
      type: "TASK_GROUP_COMPLETED",
      userId: task.userId,
      taskGroupId: task.taskGroupId,
      status: failed > 0 ? "FAILED" : "COMPLETED",
    });
  }
}

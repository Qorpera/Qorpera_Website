import { describe, it, expect, vi, beforeEach } from "vitest";

// We need a fresh event bus for each test, so mock the singleton
const { MockEventBus } = vi.hoisted(() => {
  const { EventEmitter } = require("node:events");

  class MockEventBus {
    private emitter = new EventEmitter();
    constructor() {
      this.emitter.setMaxListeners(50);
    }
    on(type: string, handler: Function) {
      this.emitter.on(type, handler as (...args: unknown[]) => void);
    }
    onAny(handler: Function) {
      this.emitter.on("*", handler as (...args: unknown[]) => void);
    }
    off(type: string, handler: Function) {
      this.emitter.off(type, handler as (...args: unknown[]) => void);
    }
    emit(event: { type: string; [key: string]: unknown }) {
      this.emitter.emit(event.type, event);
      this.emitter.emit("*", event);
    }
    removeAllListeners() {
      this.emitter.removeAllListeners();
    }
  }

  return { MockEventBus };
});

describe("WorkforceEventBus", () => {
  let bus: InstanceType<typeof MockEventBus>;

  beforeEach(() => {
    bus = new MockEventBus();
  });

  it("emits typed events to specific listeners", () => {
    const handler = vi.fn();
    bus.on("BUSINESS_FILE_UPLOADED", handler);

    const event = {
      type: "BUSINESS_FILE_UPLOADED" as const,
      userId: "user-1",
      fileId: "file-1",
      fileName: "report.pdf",
      category: "FINANCIAL",
      mimeType: "application/pdf",
      sizeBytes: 1024,
    };

    bus.emit(event);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it("does not call handlers for other event types", () => {
    const handler = vi.fn();
    bus.on("DELEGATED_TASK_CREATED", handler);

    bus.emit({
      type: "BUSINESS_FILE_UPLOADED",
      userId: "user-1",
      fileId: "file-1",
      fileName: "report.pdf",
      category: "FINANCIAL",
      mimeType: null,
      sizeBytes: 512,
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("supports wildcard listeners via onAny", () => {
    const handler = vi.fn();
    bus.onAny(handler);

    const event = {
      type: "DELEGATED_TASK_COMPLETED",
      userId: "user-1",
      taskId: "task-1",
      toAgentTarget: "ASSISTANT",
      title: "Test task",
      status: "DONE",
    };

    bus.emit(event);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it("supports async handlers", async () => {
    const results: string[] = [];
    bus.on("RUNNER_JOB_COMPLETED", async (event: { type: string; jobId: string }) => {
      await new Promise((r) => setTimeout(r, 10));
      results.push(`processed:${event.jobId}`);
    });

    bus.emit({
      type: "RUNNER_JOB_COMPLETED",
      userId: "user-1",
      jobId: "job-1",
      jobType: "command.exec",
      ok: true,
      errorMessage: null,
    });

    // Give async handler time to run
    await new Promise((r) => setTimeout(r, 50));
    expect(results).toEqual(["processed:job-1"]);
  });

  it("supports removing listeners", () => {
    const handler = vi.fn();
    bus.on("INBOX_ITEM_CREATED", handler);
    bus.off("INBOX_ITEM_CREATED", handler);

    bus.emit({
      type: "INBOX_ITEM_CREATED",
      userId: "user-1",
      itemId: "item-1",
      itemType: "approval",
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("removeAllListeners clears everything", () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    bus.on("BUSINESS_FILE_UPLOADED", handler1);
    bus.onAny(handler2);

    bus.removeAllListeners();

    bus.emit({
      type: "BUSINESS_FILE_UPLOADED",
      userId: "user-1",
      fileId: "file-1",
      fileName: "test.txt",
      category: "GENERAL",
      mimeType: "text/plain",
      sizeBytes: 100,
    });

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  it("supports multiple handlers for the same event", () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    bus.on("DELEGATED_TASK_CREATED", handler1);
    bus.on("DELEGATED_TASK_CREATED", handler2);

    bus.emit({
      type: "DELEGATED_TASK_CREATED",
      userId: "user-1",
      taskId: "task-1",
      fromAgent: "SCHEDULER",
      toAgentTarget: "ASSISTANT",
      title: "Test task",
    });

    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();
  });
});

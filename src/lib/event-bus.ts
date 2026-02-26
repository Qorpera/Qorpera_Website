/**
 * Typed event bus for Zygenic.
 * Decouples inline event-like code into a clean pub/sub pattern.
 * Uses Node EventEmitter under the hood with typed event payloads.
 */

import { EventEmitter } from "node:events";

export type WorkforceEvent =
  | {
      type: "BUSINESS_FILE_UPLOADED";
      userId: string;
      fileId: string;
      fileName: string;
      category: string;
      mimeType: string | null;
      sizeBytes: number;
    }
  | {
      type: "DELEGATED_TASK_CREATED";
      userId: string;
      taskId: string;
      fromAgent: string;
      toAgentTarget: string;
      title: string;
    }
  | {
      type: "DELEGATED_TASK_COMPLETED";
      userId: string;
      taskId: string;
      toAgentTarget: string;
      title: string;
      status: string;
    }
  | {
      type: "INBOX_ITEM_CREATED";
      userId: string;
      itemId: string;
      itemType: string;
    }
  | {
      type: "RUNNER_JOB_COMPLETED";
      userId: string;
      jobId: string;
      jobType: string;
      ok: boolean;
      errorMessage: string | null;
    };

export type WorkforceEventType = WorkforceEvent["type"];

type EventHandler<T extends WorkforceEventType> = (
  event: Extract<WorkforceEvent, { type: T }>,
) => void | Promise<void>;

type WildcardHandler = (event: WorkforceEvent) => void | Promise<void>;

class WorkforceEventBus {
  private emitter = new EventEmitter();

  constructor() {
    // Allow many listeners since multiple handlers may register for same event
    this.emitter.setMaxListeners(50);
  }

  on<T extends WorkforceEventType>(type: T, handler: EventHandler<T>): void {
    this.emitter.on(type, handler as (event: WorkforceEvent) => void);
  }

  onAny(handler: WildcardHandler): void {
    this.emitter.on("*", handler);
  }

  off<T extends WorkforceEventType>(type: T, handler: EventHandler<T>): void {
    this.emitter.off(type, handler as (event: WorkforceEvent) => void);
  }

  emit(event: WorkforceEvent): void {
    // Emit to specific listeners
    this.emitter.emit(event.type, event);
    // Emit to wildcard listeners
    this.emitter.emit("*", event);
  }

  removeAllListeners(): void {
    this.emitter.removeAllListeners();
  }
}

// Singleton pattern (same approach as Prisma client in db.ts)
const globalForEventBus = globalThis as unknown as { eventBus?: WorkforceEventBus };

export const eventBus: WorkforceEventBus =
  globalForEventBus.eventBus ?? new WorkforceEventBus();

if (process.env.NODE_ENV !== "production") globalForEventBus.eventBus = eventBus;

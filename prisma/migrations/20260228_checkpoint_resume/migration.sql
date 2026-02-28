-- Phase 1C: Checkpoint/Resume for Long-Running Tasks

-- Expand DelegatedTask
ALTER TABLE "DelegatedTask" ADD COLUMN IF NOT EXISTS "isLongRunning" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DelegatedTask" ADD COLUMN IF NOT EXISTS "maxRuntimeHours" INTEGER NOT NULL DEFAULT 4;
ALTER TABLE "DelegatedTask" ADD COLUMN IF NOT EXISTS "currentPhase" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DelegatedTask" ADD COLUMN IF NOT EXISTS "totalPhases" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "DelegatedTask" ADD COLUMN IF NOT EXISTS "progressPct" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DelegatedTask" ADD COLUMN IF NOT EXISTS "lastCheckpointAt" TIMESTAMP(3);
ALTER TABLE "DelegatedTask" ADD COLUMN IF NOT EXISTS "taskGroupId" TEXT;
ALTER TABLE "DelegatedTask" ADD COLUMN IF NOT EXISTS "workflowRunId" TEXT;
ALTER TABLE "DelegatedTask" ADD COLUMN IF NOT EXISTS "workflowNodeId" TEXT;

-- New TaskCheckpoint table
CREATE TABLE IF NOT EXISTS "TaskCheckpoint" (
    "id" TEXT NOT NULL,
    "delegatedTaskId" TEXT NOT NULL,
    "phaseIndex" INTEGER NOT NULL,
    "phaseName" TEXT NOT NULL DEFAULT '',
    "messagesJson" TEXT,
    "tracesJson" TEXT,
    "intermediateOutput" TEXT,
    "turnsCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalToolCalls" INTEGER NOT NULL DEFAULT 0,
    "stateJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskCheckpoint_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "TaskCheckpoint" ADD CONSTRAINT "TaskCheckpoint_delegatedTaskId_fkey"
    FOREIGN KEY ("delegatedTaskId") REFERENCES "DelegatedTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "TaskCheckpoint_delegatedTaskId_phaseIndex_idx" ON "TaskCheckpoint"("delegatedTaskId", "phaseIndex");

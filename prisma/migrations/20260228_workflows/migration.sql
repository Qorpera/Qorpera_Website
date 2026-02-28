-- CreateTable
CREATE TABLE IF NOT EXISTS "Workflow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "graphJson" TEXT NOT NULL,
    "templateSlug" TEXT,
    "scheduleId" TEXT,
    "webhookEndpointId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
DO $$ BEGIN
  ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "WorkflowRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "graphSnapshotJson" TEXT NOT NULL,
    "nodeStatesJson" TEXT NOT NULL DEFAULT '{}',
    "triggerPayload" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT
);
DO $$ BEGIN
  ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_workflowId_fkey"
    FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Workflow_userId_status_idx" ON "Workflow"("userId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WorkflowRun_workflowId_status_idx" ON "WorkflowRun"("workflowId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WorkflowRun_userId_startedAt_idx" ON "WorkflowRun"("userId", "startedAt");

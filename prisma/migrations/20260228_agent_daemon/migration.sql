-- Phase 2A: Always-On Agent Daemon

-- Expand AgentAutomationConfig
ALTER TABLE "AgentAutomationConfig" ADD COLUMN IF NOT EXISTS "alwaysOn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AgentAutomationConfig" ADD COLUMN IF NOT EXISTS "daemonPriorityOrder" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "AgentAutomationConfig" ADD COLUMN IF NOT EXISTS "idleCheckIntervalMs" INTEGER NOT NULL DEFAULT 5000;
ALTER TABLE "AgentAutomationConfig" ADD COLUMN IF NOT EXISTS "maxConcurrentTasks" INTEGER NOT NULL DEFAULT 1;

-- New AgentDaemonHeartbeat table
CREATE TABLE IF NOT EXISTS "AgentDaemonHeartbeat" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "activeAgents" INTEGER NOT NULL DEFAULT 0,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgentDaemonHeartbeat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AgentDaemonHeartbeat_processId_key" ON "AgentDaemonHeartbeat"("processId");

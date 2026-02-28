-- Phase 3B: Agent-to-Agent Communication

-- TaskGroup
CREATE TABLE IF NOT EXISTS "TaskGroup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "parentTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TaskGroup_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TaskGroup_userId_status_idx" ON "TaskGroup"("userId", "status");

-- AgentMessage
CREATE TABLE IF NOT EXISTS "AgentMessage" (
    "id" TEXT NOT NULL,
    "taskGroupId" TEXT NOT NULL,
    "fromAgent" TEXT NOT NULL,
    "toAgent" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'INFO',
    "content" TEXT NOT NULL,
    "metadata" TEXT,
    "readByJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentMessage_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  ALTER TABLE "AgentMessage" ADD CONSTRAINT "AgentMessage_taskGroupId_fkey"
    FOREIGN KEY ("taskGroupId") REFERENCES "TaskGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "AgentMessage_taskGroupId_createdAt_idx" ON "AgentMessage"("taskGroupId", "createdAt");
CREATE INDEX IF NOT EXISTS "AgentMessage_taskGroupId_toAgent_idx" ON "AgentMessage"("taskGroupId", "toAgent");

-- WorkspaceEntry
CREATE TABLE IF NOT EXISTS "WorkspaceEntry" (
    "id" TEXT NOT NULL,
    "taskGroupId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "writtenBy" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkspaceEntry_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  ALTER TABLE "WorkspaceEntry" ADD CONSTRAINT "WorkspaceEntry_taskGroupId_fkey"
    FOREIGN KEY ("taskGroupId") REFERENCES "TaskGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceEntry_taskGroupId_key_key" ON "WorkspaceEntry"("taskGroupId", "key");
CREATE INDEX IF NOT EXISTS "WorkspaceEntry_taskGroupId_idx" ON "WorkspaceEntry"("taskGroupId");

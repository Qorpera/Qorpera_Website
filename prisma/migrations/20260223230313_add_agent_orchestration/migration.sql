-- CreateTable
CREATE TABLE "AgentAutomationConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "agentTarget" TEXT NOT NULL,
    "triggerMode" TEXT NOT NULL DEFAULT 'MANUAL',
    "wakeOnDelegation" BOOLEAN NOT NULL DEFAULT true,
    "scheduleEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dailyTimesCsv" TEXT NOT NULL DEFAULT '',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "runContinuously" BOOLEAN NOT NULL DEFAULT false,
    "integrationsCsv" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentAutomationConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DelegatedTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fromAgent" TEXT NOT NULL,
    "toAgentTarget" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "triggerSource" TEXT NOT NULL DEFAULT 'DELEGATED',
    "scheduledFor" DATETIME,
    "dueLabel" TEXT,
    "projectRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "DelegatedTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AgentAutomationConfig_userId_triggerMode_updatedAt_idx" ON "AgentAutomationConfig"("userId", "triggerMode", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentAutomationConfig_userId_agentTarget_key" ON "AgentAutomationConfig"("userId", "agentTarget");

-- CreateIndex
CREATE INDEX "DelegatedTask_userId_toAgentTarget_status_createdAt_idx" ON "DelegatedTask"("userId", "toAgentTarget", "status", "createdAt");

-- CreateIndex
CREATE INDEX "DelegatedTask_userId_createdAt_idx" ON "DelegatedTask"("userId", "createdAt");

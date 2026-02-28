-- 24/7 Autonomous Agent Capabilities
-- Adds heartbeat mode, heartbeat logging, and webhook endpoints

-- Heartbeat fields on AgentAutomationConfig
ALTER TABLE "AgentAutomationConfig" ADD COLUMN "heartbeatEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AgentAutomationConfig" ADD COLUMN "heartbeatIntervalMin" INTEGER NOT NULL DEFAULT 15;

-- HeartbeatLog table
CREATE TABLE "HeartbeatLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "agentTarget" TEXT NOT NULL,
    "checkResult" TEXT NOT NULL DEFAULT 'SKIP',
    "signalsFound" TEXT,
    "llmSavedMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "HeartbeatLog_userId_agentTarget_createdAt_idx" ON "HeartbeatLog"("userId", "agentTarget", "createdAt");
CREATE INDEX "HeartbeatLog_userId_createdAt_idx" ON "HeartbeatLog"("userId", "createdAt");

-- WebhookEndpoint table
CREATE TABLE "WebhookEndpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "agentTarget" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "secretHash" TEXT NOT NULL,
    "secretLast4" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastCalledAt" TIMESTAMP(3),
    "callCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "WebhookEndpoint_userId_agentTarget_key" ON "WebhookEndpoint"("userId", "agentTarget");
CREATE INDEX "WebhookEndpoint_userId_enabled_idx" ON "WebhookEndpoint"("userId", "enabled");

-- Task retry tracking
ALTER TABLE "DelegatedTask" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DelegatedTask" ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 3;

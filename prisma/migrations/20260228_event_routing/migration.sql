-- Phase 1B: Event Routing Rules

-- Expand WebhookEvent
ALTER TABLE "WebhookEvent" ADD COLUMN IF NOT EXISTS "routedToAgent" TEXT;
ALTER TABLE "WebhookEvent" ADD COLUMN IF NOT EXISTS "dispatchMode" TEXT NOT NULL DEFAULT 'QUEUED';
ALTER TABLE "WebhookEvent" ADD COLUMN IF NOT EXISTS "taskId" TEXT;

-- New EventRoutingRule table
CREATE TABLE IF NOT EXISTS "EventRoutingRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventPattern" TEXT NOT NULL,
    "agentTarget" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "conditionJson" TEXT,
    "transformJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventRoutingRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EventRoutingRule_userId_enabled_priority_idx" ON "EventRoutingRule"("userId", "enabled", "priority");
CREATE INDEX IF NOT EXISTS "EventRoutingRule_userId_provider_idx" ON "EventRoutingRule"("userId", "provider");

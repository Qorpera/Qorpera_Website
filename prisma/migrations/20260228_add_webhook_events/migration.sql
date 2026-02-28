-- Migration: Add WebhookEvent model and chainDepth/webhookEventId to DelegatedTask

CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WebhookEvent_userId_status_createdAt_idx" ON "WebhookEvent"("userId","status","createdAt");
CREATE INDEX "WebhookEvent_userId_provider_createdAt_idx" ON "WebhookEvent"("userId","provider","createdAt");
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DelegatedTask" ADD COLUMN "chainDepth" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DelegatedTask" ADD COLUMN "webhookEventId" TEXT;

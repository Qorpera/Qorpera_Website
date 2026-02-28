-- Phase 3C: Prompt Optimization from Feedback

-- PromptVariant
CREATE TABLE IF NOT EXISTS "PromptVariant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentKind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "patchText" TEXT NOT NULL,
    "sourceActionId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isControl" BOOLEAN NOT NULL DEFAULT false,
    "trafficPercent" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "taskCount" INTEGER NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "acceptRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revisionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PromptVariant_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PromptVariant_userId_agentKind_isActive_idx" ON "PromptVariant"("userId", "agentKind", "isActive");

-- PromptVariantTaskAssignment
CREATE TABLE IF NOT EXISTS "PromptVariantTaskAssignment" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "delegatedTaskId" TEXT NOT NULL,
    "rating" INTEGER,
    "accepted" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromptVariantTaskAssignment_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  ALTER TABLE "PromptVariantTaskAssignment" ADD CONSTRAINT "PromptVariantTaskAssignment_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "PromptVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "PromptVariantTaskAssignment_delegatedTaskId_key" ON "PromptVariantTaskAssignment"("delegatedTaskId");
CREATE INDEX IF NOT EXISTS "PromptVariantTaskAssignment_variantId_idx" ON "PromptVariantTaskAssignment"("variantId");

-- FeedbackPattern
CREATE TABLE IF NOT EXISTS "FeedbackPattern" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentKind" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "examples" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "addressed" BOOLEAN NOT NULL DEFAULT false,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeedbackPattern_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "FeedbackPattern_userId_agentKind_addressed_idx" ON "FeedbackPattern"("userId", "agentKind", "addressed");
CREATE INDEX IF NOT EXISTS "FeedbackPattern_userId_agentKind_severity_idx" ON "FeedbackPattern"("userId", "agentKind", "severity");

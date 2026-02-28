-- Phase 3A: Custom Skills

CREATE TABLE IF NOT EXISTS "CustomSkill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'general',
    "requirementsJson" TEXT,
    "skillMdContent" TEXT NOT NULL,
    "scriptsJson" TEXT,
    "referencesJson" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "shareToken" TEXT,
    "validationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "validationErrors" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestResult" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomSkill_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomSkill_shareToken_key" ON "CustomSkill"("shareToken");
CREATE INDEX IF NOT EXISTS "CustomSkill_userId_enabled_idx" ON "CustomSkill"("userId", "enabled");
CREATE INDEX IF NOT EXISTS "CustomSkill_shareToken_idx" ON "CustomSkill"("shareToken");

-- Add source column to PlanSubscription
ALTER TABLE "PlanSubscription" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'STRIPE';

-- Create FeatureFlag table
CREATE TABLE IF NOT EXISTS "FeatureFlag" (
  "id"        TEXT NOT NULL,
  "key"       TEXT NOT NULL,
  "label"     TEXT NOT NULL DEFAULT '',
  "enabled"   BOOLEAN NOT NULL DEFAULT false,
  "userId"    TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- Unique index: (key, userId) — NULLs treated as distinct in PG, which is fine
CREATE UNIQUE INDEX IF NOT EXISTS "FeatureFlag_key_userId_key" ON "FeatureFlag"("key", "userId");

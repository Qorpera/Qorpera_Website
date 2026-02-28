-- Phase 1A: Deeper Memory System

-- Expand AgentMemory model
ALTER TABLE "AgentMemory" ADD COLUMN IF NOT EXISTS "maxEntries" INTEGER NOT NULL DEFAULT 500;
ALTER TABLE "AgentMemory" ADD COLUMN IF NOT EXISTS "totalTokens" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AgentMemory" ADD COLUMN IF NOT EXISTS "lastCompactedAt" TIMESTAMP(3);

-- Expand AgentMemoryEntry model
ALTER TABLE "AgentMemoryEntry" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'general';
ALTER TABLE "AgentMemoryEntry" ADD COLUMN IF NOT EXISTS "tags" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AgentMemoryEntry" ADD COLUMN IF NOT EXISTS "accessCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AgentMemoryEntry" ADD COLUMN IF NOT EXISTS "lastAccessedAt" TIMESTAMP(3);
ALTER TABLE "AgentMemoryEntry" ADD COLUMN IF NOT EXISTS "decayScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0;
ALTER TABLE "AgentMemoryEntry" ADD COLUMN IF NOT EXISTS "embeddingJson" TEXT;
ALTER TABLE "AgentMemoryEntry" ADD COLUMN IF NOT EXISTS "sourceTaskId" TEXT;

-- New indexes for efficient retrieval
CREATE INDEX IF NOT EXISTS "AgentMemoryEntry_agentMemoryId_category_idx" ON "AgentMemoryEntry"("agentMemoryId", "category");
CREATE INDEX IF NOT EXISTS "AgentMemoryEntry_agentMemoryId_decayScore_idx" ON "AgentMemoryEntry"("agentMemoryId", "decayScore");

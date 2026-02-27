-- AgentOptimizationCycle: tracks each research + analysis run
CREATE TABLE "AgentOptimizationCycle" (
  "id"               TEXT NOT NULL,
  "userId"           TEXT NOT NULL,
  "agentKind"        TEXT NOT NULL,
  "status"           TEXT NOT NULL DEFAULT 'RUNNING',
  "researchJson"     TEXT,
  "synthesisText"    TEXT,
  "scoreJson"        TEXT,
  "improvementsJson" TEXT,
  "errorMessage"     TEXT,
  "nextRunAt"        TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentOptimizationCycle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentOptimizationCycle_userId_agentKind_createdAt_idx"
  ON "AgentOptimizationCycle"("userId", "agentKind", "createdAt");
CREATE INDEX "AgentOptimizationCycle_userId_status_createdAt_idx"
  ON "AgentOptimizationCycle"("userId", "status", "createdAt");

ALTER TABLE "AgentOptimizationCycle"
  ADD CONSTRAINT "AgentOptimizationCycle_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AgentOptimizationApplication: tracks which improvements have been applied
CREATE TABLE "AgentOptimizationApplication" (
  "id"            TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "cycleId"       TEXT NOT NULL,
  "agentKind"     TEXT NOT NULL,
  "improvementId" TEXT NOT NULL,
  "dimension"     TEXT NOT NULL,
  "title"         TEXT NOT NULL,
  "patchText"     TEXT NOT NULL,
  "appliedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentOptimizationApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentOptimizationApplication_userId_agentKind_appliedAt_idx"
  ON "AgentOptimizationApplication"("userId", "agentKind", "appliedAt");
CREATE INDEX "AgentOptimizationApplication_cycleId_idx"
  ON "AgentOptimizationApplication"("cycleId");

ALTER TABLE "AgentOptimizationApplication"
  ADD CONSTRAINT "AgentOptimizationApplication_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgentOptimizationApplication"
  ADD CONSTRAINT "AgentOptimizationApplication_cycleId_fkey"
  FOREIGN KEY ("cycleId") REFERENCES "AgentOptimizationCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

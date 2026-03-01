-- Goal status, priority, step status, and task outcome enums
-- (PostgreSQL enums)

DO $$ BEGIN
  CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "GoalPriority" AS ENUM ('URGENT', 'HIGH', 'NORMAL', 'LOW');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "GoalStepStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'FAILED', 'BLOCKED', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TaskOutcome" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILURE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Goals table
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "parentGoalId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" "GoalPriority" NOT NULL DEFAULT 'NORMAL',
    "agentTarget" TEXT,
    "totalSteps" INTEGER NOT NULL DEFAULT 0,
    "completedSteps" INTEGER NOT NULL DEFAULT 0,
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Goal_parentGoalId_fkey" FOREIGN KEY ("parentGoalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Goal_userId_status_priority_idx" ON "Goal"("userId", "status", "priority");
CREATE INDEX "Goal_userId_agentTarget_status_idx" ON "Goal"("userId", "agentTarget", "status");
CREATE INDEX "Goal_parentGoalId_idx" ON "Goal"("parentGoalId");

-- Goal Steps table
CREATE TABLE "GoalStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL DEFAULT '',
    "status" "GoalStepStatus" NOT NULL DEFAULT 'PENDING',
    "agentTarget" TEXT,
    "dependsOnJson" TEXT NOT NULL DEFAULT '[]',
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "GoalStep_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "GoalStep_goalId_stepOrder_idx" ON "GoalStep"("goalId", "stepOrder");
CREATE INDEX "GoalStep_goalId_status_idx" ON "GoalStep"("goalId", "status");

-- Task Outcome Records table
CREATE TABLE "TaskOutcomeRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "agentTarget" TEXT NOT NULL,
    "outcome" "TaskOutcome" NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "toolsUsedJson" TEXT NOT NULL DEFAULT '[]',
    "turnsUsed" INTEGER NOT NULL DEFAULT 0,
    "runtimeMs" INTEGER NOT NULL DEFAULT 0,
    "wasApproved" BOOLEAN,
    "errorSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskOutcomeRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TaskOutcomeRecord_taskId_key" ON "TaskOutcomeRecord"("taskId");
CREATE INDEX "TaskOutcomeRecord_userId_agentTarget_createdAt_idx" ON "TaskOutcomeRecord"("userId", "agentTarget", "createdAt");
CREATE INDEX "TaskOutcomeRecord_userId_category_createdAt_idx" ON "TaskOutcomeRecord"("userId", "category", "createdAt");

-- Add goalStepId to DelegatedTask
ALTER TABLE "DelegatedTask" ADD COLUMN "goalStepId" TEXT;

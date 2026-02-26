ALTER TABLE "AgentAutomationConfig" ADD COLUMN "maxLoopIterations" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "AgentAutomationConfig" ADD COLUMN "maxAgentCallsPerRun" INTEGER NOT NULL DEFAULT 6;
ALTER TABLE "AgentAutomationConfig" ADD COLUMN "maxToolRetries" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "AgentAutomationConfig" ADD COLUMN "maxRuntimeSeconds" INTEGER NOT NULL DEFAULT 120;
ALTER TABLE "AgentAutomationConfig" ADD COLUMN "requireApprovalForExternalActions" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AgentAutomationConfig" ADD COLUMN "allowAgentDelegation" BOOLEAN NOT NULL DEFAULT true;

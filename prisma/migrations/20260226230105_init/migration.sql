-- CreateEnum
CREATE TYPE "RunSchedule" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "AgentKind" AS ENUM ('ASSISTANT', 'PROJECT_MANAGER', 'SALES_REP', 'CUSTOMER_SUCCESS', 'MARKETING_COORDINATOR', 'FINANCE_ANALYST', 'OPERATIONS_MANAGER', 'EXECUTIVE_ASSISTANT');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('IDLE', 'WORKING', 'OFFLINE');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('SUBMITTED', 'ACCEPTED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "InboxItemState" AS ENUM ('OPEN', 'APPROVED', 'NEEDS_CHANGES', 'AGENT_FOLLOWUP', 'PAUSED');

-- CreateEnum
CREATE TYPE "DefaultAutonomy" AS ENUM ('DRAFT_ONLY', 'APPROVAL', 'AUTO');

-- CreateEnum
CREATE TYPE "ConnectorCheckCadence" AS ENUM ('HOURLY', 'DAILY', 'MANUAL');

-- CreateEnum
CREATE TYPE "ProjectHealth" AS ENUM ('GREEN', 'YELLOW', 'RED');

-- CreateEnum
CREATE TYPE "ProjectTaskColumn" AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('RUNNING', 'DRAFTING', 'BLOCKED', 'FINISHED');

-- CreateEnum
CREATE TYPE "ProviderName" AS ENUM ('OPENAI', 'ANTHROPIC', 'GOOGLE');

-- CreateEnum
CREATE TYPE "CredentialMode" AS ENUM ('MANAGED', 'BYOK');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('CONNECTED', 'NEEDS_ATTENTION', 'PENDING');

-- CreateEnum
CREATE TYPE "ModelProvider" AS ENUM ('OPENAI', 'OLLAMA', 'ANTHROPIC', 'GOOGLE');

-- CreateEnum
CREATE TYPE "BusinessLogCategory" AS ENUM ('FINANCIAL', 'PROJECT', 'COLLABORATION', 'OPERATIONS', 'SALES', 'MARKETING', 'LEGAL', 'GENERAL');

-- CreateEnum
CREATE TYPE "BusinessLogSource" AS ENUM ('OWNER', 'AGENT', 'IMPORT');

-- CreateEnum
CREATE TYPE "BusinessFileCategory" AS ENUM ('FINANCIAL', 'PROJECT', 'COLLABORATION', 'OPERATIONS', 'SALES', 'MARKETING', 'LEGAL', 'GENERAL');

-- CreateEnum
CREATE TYPE "AgentTriggerMode" AS ENUM ('MANUAL', 'DELEGATED', 'SCHEDULED', 'HYBRID');

-- CreateEnum
CREATE TYPE "DelegatedTaskStatus" AS ENUM ('QUEUED', 'RUNNING', 'REVIEW', 'DONE', 'FAILED', 'PAUSED');

-- CreateEnum
CREATE TYPE "RunnerNodeStatus" AS ENUM ('PENDING', 'ONLINE', 'OFFLINE', 'REVOKED');

-- CreateEnum
CREATE TYPE "RunnerJobStatus" AS ENUM ('QUEUED', 'LEASED', 'RUNNING', 'NEEDS_APPROVAL', 'SUCCEEDED', 'FAILED', 'CANCELED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HiredJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "agentKind" "AgentKind" NOT NULL,
    "schedule" "RunSchedule" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HiredJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentPurchaseOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentKind" "AgentKind" NOT NULL,
    "schedule" "RunSchedule" NOT NULL,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "checkoutSessionId" TEXT,
    "stripeEventId" TEXT,
    "stripePaymentId" TEXT,
    "stripeSubscriptionId" TEXT,
    "failureReason" TEXT,
    "fulfilledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentPurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "kind" "AgentKind" NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT,
    "status" "AgentStatus" NOT NULL DEFAULT 'IDLE',
    "headline" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentKind" "AgentKind" NOT NULL,
    "title" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "rating" INTEGER,
    "correction" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultAutonomy" "DefaultAutonomy" NOT NULL DEFAULT 'APPROVAL',
    "requirePreview" BOOLEAN NOT NULL DEFAULT true,
    "enableRollback" BOOLEAN NOT NULL DEFAULT true,
    "justDoItMode" BOOLEAN NOT NULL DEFAULT true,
    "compactDashboard" BOOLEAN NOT NULL DEFAULT false,
    "highlightApprovals" BOOLEAN NOT NULL DEFAULT true,
    "connectorChecks" "ConnectorCheckCadence" NOT NULL DEFAULT 'DAILY',
    "maxAgentOutputTokens" INTEGER NOT NULL DEFAULT 8192,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxItemStatus" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "state" "InboxItemState" NOT NULL DEFAULT 'OPEN',
    "stateLabel" TEXT NOT NULL DEFAULT 'Open',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboxItemStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'draft',
    "summary" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "state" "InboxItemState" NOT NULL DEFAULT 'OPEN',
    "stateLabel" TEXT NOT NULL DEFAULT 'Open',
    "sourceType" TEXT NOT NULL DEFAULT 'DELEGATED_TASK',
    "sourceId" TEXT,
    "digest" TEXT,
    "pendingActionsJson" TEXT,
    "executionResultJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboxItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "workflow" TEXT NOT NULL,
    "permissions" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateAgentRole" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TemplateAgentRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "workforceHealth" "ProjectHealth" NOT NULL DEFAULT 'GREEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTask" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "etaLabel" TEXT NOT NULL,
    "column" "ProjectTaskColumn" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectArtifact" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL,
    "etaLabel" TEXT NOT NULL,
    "soulSnapshotVersion" TEXT,
    "soulSnapshotJson" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalConnector" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connector" TEXT NOT NULL,
    "label" TEXT,
    "encryptedKey" TEXT,
    "keyLast4" TEXT,
    "fromAddress" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalConnector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "ProviderName" NOT NULL,
    "mode" "CredentialMode" NOT NULL DEFAULT 'MANAGED',
    "label" TEXT,
    "encryptedKey" TEXT,
    "keyLast4" TEXT,
    "status" "CredentialStatus" NOT NULL DEFAULT 'PENDING',
    "monthlyRequestLimit" INTEGER NOT NULL DEFAULT 500,
    "monthlyRequestCount" INTEGER NOT NULL DEFAULT 0,
    "monthlyUsdLimit" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "monthlyEstimatedUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usageMonthKey" TEXT,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestStatus" TEXT,
    "lastTestMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySoul" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT '',
    "oneLinePitch" TEXT NOT NULL DEFAULT '',
    "mission" TEXT NOT NULL DEFAULT '',
    "idealCustomers" TEXT NOT NULL DEFAULT '',
    "coreOffers" TEXT NOT NULL DEFAULT '',
    "revenueModel" TEXT NOT NULL DEFAULT '',
    "strategicGoals" TEXT NOT NULL DEFAULT '',
    "constraints" TEXT NOT NULL DEFAULT '',
    "brandVoice" TEXT NOT NULL DEFAULT '',
    "departments" TEXT NOT NULL DEFAULT '',
    "operatingCadence" TEXT NOT NULL DEFAULT '',
    "approvalRules" TEXT NOT NULL DEFAULT '',
    "toolsAndSystems" TEXT NOT NULL DEFAULT '',
    "keyMetrics" TEXT NOT NULL DEFAULT '',
    "glossary" TEXT NOT NULL DEFAULT '',
    "notesForAgents" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySoul_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelRoutePreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "provider" "ModelProvider" NOT NULL DEFAULT 'OPENAI',
    "modelName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelRoutePreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessLogEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "BusinessLogCategory" NOT NULL DEFAULT 'GENERAL',
    "source" "BusinessLogSource" NOT NULL DEFAULT 'OWNER',
    "authorLabel" TEXT,
    "body" TEXT NOT NULL,
    "relatedRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessFile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "BusinessFileCategory" NOT NULL DEFAULT 'GENERAL',
    "mimeType" TEXT,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "storagePath" TEXT NOT NULL,
    "textExtract" TEXT,
    "source" "BusinessLogSource" NOT NULL DEFAULT 'OWNER',
    "authorLabel" TEXT,
    "relatedRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripePayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeEventId" TEXT,
    "checkoutSessionId" TEXT NOT NULL,
    "paymentIntentId" TEXT,
    "amountTotal" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "paymentStatus" TEXT NOT NULL DEFAULT 'unknown',
    "mode" TEXT NOT NULL DEFAULT 'payment',
    "agentKind" TEXT,
    "schedule" TEXT,
    "metadataJson" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripePriceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'incomplete',
    "agentKind" TEXT,
    "schedule" TEXT,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvisorSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvisorSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvisorMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT,
    "modelName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdvisorMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentAutomationConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentTarget" TEXT NOT NULL,
    "triggerMode" "AgentTriggerMode" NOT NULL DEFAULT 'MANUAL',
    "wakeOnDelegation" BOOLEAN NOT NULL DEFAULT true,
    "scheduleEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dailyTimesCsv" TEXT NOT NULL DEFAULT '',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "runContinuously" BOOLEAN NOT NULL DEFAULT false,
    "maxLoopIterations" INTEGER NOT NULL DEFAULT 3,
    "maxAgentCallsPerRun" INTEGER NOT NULL DEFAULT 6,
    "maxToolRetries" INTEGER NOT NULL DEFAULT 2,
    "maxRuntimeSeconds" INTEGER NOT NULL DEFAULT 120,
    "requireApprovalForExternalActions" BOOLEAN NOT NULL DEFAULT true,
    "allowAgentDelegation" BOOLEAN NOT NULL DEFAULT true,
    "integrationsCsv" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentAutomationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DelegatedTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromAgent" TEXT NOT NULL,
    "toAgentTarget" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "status" "DelegatedTaskStatus" NOT NULL DEFAULT 'QUEUED',
    "triggerSource" TEXT NOT NULL DEFAULT 'DELEGATED',
    "scheduledFor" TIMESTAMP(3),
    "dueLabel" TEXT,
    "projectRef" TEXT,
    "completionDigest" TEXT,
    "inputFromTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DelegatedTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DelegatedTaskToolCall" (
    "id" TEXT NOT NULL,
    "delegatedTaskId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER,
    "inputSummary" TEXT,
    "outputSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DelegatedTaskToolCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunnerNode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'desktop',
    "status" "RunnerNodeStatus" NOT NULL DEFAULT 'PENDING',
    "authTokenHash" TEXT NOT NULL,
    "authTokenLast4" TEXT,
    "label" TEXT,
    "hostName" TEXT,
    "osName" TEXT,
    "runnerVersion" TEXT,
    "capabilitiesJson" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "lastIp" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunnerNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunnerJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "runnerNodeId" TEXT,
    "jobType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "RunnerJobStatus" NOT NULL DEFAULT 'QUEUED',
    "riskLevel" TEXT NOT NULL DEFAULT 'medium',
    "payloadJson" TEXT NOT NULL,
    "resultJson" TEXT,
    "errorMessage" TEXT,
    "leaseToken" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "requestedBy" TEXT,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunnerJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunnerJobEvent" (
    "id" TEXT NOT NULL,
    "runnerJobId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "dataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunnerJobEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunnerJobControl" (
    "id" TEXT NOT NULL,
    "runnerJobId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payloadJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "RunnerJobControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunnerPolicy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL DEFAULT 'default',
    "templateName" TEXT NOT NULL DEFAULT 'Default workspace template',
    "version" INTEGER NOT NULL DEFAULT 1,
    "rulesJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunnerPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "varName" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "keyLast4" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "parametersJson" TEXT NOT NULL,
    "executionMode" TEXT NOT NULL DEFAULT 'in_process',
    "category" TEXT NOT NULL DEFAULT 'general',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentKindToolSet" (
    "id" TEXT NOT NULL,
    "agentKind" TEXT NOT NULL,
    "toolDefinitionId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentKindToolSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OllamaUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OllamaUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "AgentPurchaseOrder_checkoutSessionId_key" ON "AgentPurchaseOrder"("checkoutSessionId");

-- CreateIndex
CREATE INDEX "AgentPurchaseOrder_userId_createdAt_idx" ON "AgentPurchaseOrder"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentPurchaseOrder_userId_status_createdAt_idx" ON "AgentPurchaseOrder"("userId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_kind_key" ON "Agent"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_username_key" ON "Agent"("username");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InboxItemStatus_userId_itemId_key" ON "InboxItemStatus"("userId", "itemId");

-- CreateIndex
CREATE INDEX "InboxItem_userId_state_createdAt_idx" ON "InboxItem"("userId", "state", "createdAt");

-- CreateIndex
CREATE INDEX "InboxItem_userId_sourceType_sourceId_idx" ON "InboxItem"("userId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_scope_createdAt_idx" ON "AuditLog"("userId", "scope", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Template_slug_key" ON "Template"("slug");

-- CreateIndex
CREATE INDEX "TemplateAgentRole_templateId_sortOrder_idx" ON "TemplateAgentRole"("templateId", "sortOrder");

-- CreateIndex
CREATE INDEX "Project_userId_createdAt_idx" ON "Project"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Project_userId_slug_key" ON "Project"("userId", "slug");

-- CreateIndex
CREATE INDEX "ProjectTask_projectId_column_sortOrder_idx" ON "ProjectTask"("projectId", "column", "sortOrder");

-- CreateIndex
CREATE INDEX "ProjectArtifact_projectId_createdAt_idx" ON "ProjectArtifact"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Run_userId_status_createdAt_idx" ON "Run"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ExternalConnector_userId_enabled_idx" ON "ExternalConnector"("userId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalConnector_userId_connector_key" ON "ExternalConnector"("userId", "connector");

-- CreateIndex
CREATE INDEX "ProviderCredential_userId_provider_updatedAt_idx" ON "ProviderCredential"("userId", "provider", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCredential_userId_provider_key" ON "ProviderCredential"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySoul_userId_key" ON "CompanySoul"("userId");

-- CreateIndex
CREATE INDEX "ModelRoutePreference_userId_target_idx" ON "ModelRoutePreference"("userId", "target");

-- CreateIndex
CREATE UNIQUE INDEX "ModelRoutePreference_userId_target_key" ON "ModelRoutePreference"("userId", "target");

-- CreateIndex
CREATE INDEX "BusinessLogEntry_userId_createdAt_idx" ON "BusinessLogEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessLogEntry_userId_category_createdAt_idx" ON "BusinessLogEntry"("userId", "category", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessFile_userId_createdAt_idx" ON "BusinessFile"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessFile_userId_category_createdAt_idx" ON "BusinessFile"("userId", "category", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StripePayment_checkoutSessionId_key" ON "StripePayment"("checkoutSessionId");

-- CreateIndex
CREATE INDEX "StripePayment_userId_createdAt_idx" ON "StripePayment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "StripePayment_userId_paidAt_idx" ON "StripePayment"("userId", "paidAt");

-- CreateIndex
CREATE INDEX "StripePayment_userId_paymentStatus_createdAt_idx" ON "StripePayment"("userId", "paymentStatus", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StripeSubscription_stripeSubscriptionId_key" ON "StripeSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "StripeSubscription_userId_createdAt_idx" ON "StripeSubscription"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "StripeSubscription_userId_status_updatedAt_idx" ON "StripeSubscription"("userId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "AdvisorSession_userId_updatedAt_idx" ON "AdvisorSession"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "AdvisorMessage_sessionId_createdAt_idx" ON "AdvisorMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentAutomationConfig_userId_triggerMode_updatedAt_idx" ON "AgentAutomationConfig"("userId", "triggerMode", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentAutomationConfig_userId_agentTarget_key" ON "AgentAutomationConfig"("userId", "agentTarget");

-- CreateIndex
CREATE INDEX "DelegatedTask_userId_toAgentTarget_status_createdAt_idx" ON "DelegatedTask"("userId", "toAgentTarget", "status", "createdAt");

-- CreateIndex
CREATE INDEX "DelegatedTask_userId_createdAt_idx" ON "DelegatedTask"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DelegatedTaskToolCall_delegatedTaskId_createdAt_idx" ON "DelegatedTaskToolCall"("delegatedTaskId", "createdAt");

-- CreateIndex
CREATE INDEX "RunnerNode_userId_createdAt_idx" ON "RunnerNode"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RunnerNode_userId_status_updatedAt_idx" ON "RunnerNode"("userId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "RunnerNode_lastSeenAt_idx" ON "RunnerNode"("lastSeenAt");

-- CreateIndex
CREATE INDEX "RunnerJob_userId_status_createdAt_idx" ON "RunnerJob"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "RunnerJob_runnerNodeId_status_updatedAt_idx" ON "RunnerJob"("runnerNodeId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "RunnerJob_leaseExpiresAt_idx" ON "RunnerJob"("leaseExpiresAt");

-- CreateIndex
CREATE INDEX "RunnerJobEvent_runnerJobId_createdAt_idx" ON "RunnerJobEvent"("runnerJobId", "createdAt");

-- CreateIndex
CREATE INDEX "RunnerJobControl_runnerJobId_status_createdAt_idx" ON "RunnerJobControl"("runnerJobId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RunnerPolicy_userId_key" ON "RunnerPolicy"("userId");

-- CreateIndex
CREATE INDEX "RunnerPolicy_templateKey_updatedAt_idx" ON "RunnerPolicy"("templateKey", "updatedAt");

-- CreateIndex
CREATE INDEX "SkillCredential_userId_idx" ON "SkillCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillCredential_userId_varName_key" ON "SkillCredential"("userId", "varName");

-- CreateIndex
CREATE UNIQUE INDEX "ToolDefinition_name_key" ON "ToolDefinition"("name");

-- CreateIndex
CREATE INDEX "ToolDefinition_category_enabled_idx" ON "ToolDefinition"("category", "enabled");

-- CreateIndex
CREATE INDEX "AgentKindToolSet_agentKind_enabled_idx" ON "AgentKindToolSet"("agentKind", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "AgentKindToolSet_agentKind_toolDefinitionId_key" ON "AgentKindToolSet"("agentKind", "toolDefinitionId");

-- CreateIndex
CREATE INDEX "OllamaUsage_userId_idx" ON "OllamaUsage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OllamaUsage_userId_monthKey_key" ON "OllamaUsage"("userId", "monthKey");

-- AddForeignKey
ALTER TABLE "HiredJob" ADD CONSTRAINT "HiredJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentPurchaseOrder" ADD CONSTRAINT "AgentPurchaseOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxItemStatus" ADD CONSTRAINT "InboxItemStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateAgentRole" ADD CONSTRAINT "TemplateAgentRole_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectArtifact" ADD CONSTRAINT "ProjectArtifact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalConnector" ADD CONSTRAINT "ExternalConnector_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCredential" ADD CONSTRAINT "ProviderCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySoul" ADD CONSTRAINT "CompanySoul_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelRoutePreference" ADD CONSTRAINT "ModelRoutePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessLogEntry" ADD CONSTRAINT "BusinessLogEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessFile" ADD CONSTRAINT "BusinessFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripePayment" ADD CONSTRAINT "StripePayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripeSubscription" ADD CONSTRAINT "StripeSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvisorSession" ADD CONSTRAINT "AdvisorSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvisorMessage" ADD CONSTRAINT "AdvisorMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AdvisorSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAutomationConfig" ADD CONSTRAINT "AgentAutomationConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegatedTask" ADD CONSTRAINT "DelegatedTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegatedTaskToolCall" ADD CONSTRAINT "DelegatedTaskToolCall_delegatedTaskId_fkey" FOREIGN KEY ("delegatedTaskId") REFERENCES "DelegatedTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunnerNode" ADD CONSTRAINT "RunnerNode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunnerJob" ADD CONSTRAINT "RunnerJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunnerJob" ADD CONSTRAINT "RunnerJob_runnerNodeId_fkey" FOREIGN KEY ("runnerNodeId") REFERENCES "RunnerNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunnerJobEvent" ADD CONSTRAINT "RunnerJobEvent_runnerJobId_fkey" FOREIGN KEY ("runnerJobId") REFERENCES "RunnerJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunnerJobControl" ADD CONSTRAINT "RunnerJobControl_runnerJobId_fkey" FOREIGN KEY ("runnerJobId") REFERENCES "RunnerJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunnerPolicy" ADD CONSTRAINT "RunnerPolicy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillCredential" ADD CONSTRAINT "SkillCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentKindToolSet" ADD CONSTRAINT "AgentKindToolSet_toolDefinitionId_fkey" FOREIGN KEY ("toolDefinitionId") REFERENCES "ToolDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OllamaUsage" ADD CONSTRAINT "OllamaUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

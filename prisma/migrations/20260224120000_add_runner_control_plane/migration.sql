-- CreateTable
CREATE TABLE "RunnerNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'desktop',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "authTokenHash" TEXT NOT NULL,
    "authTokenLast4" TEXT,
    "label" TEXT,
    "hostName" TEXT,
    "osName" TEXT,
    "runnerVersion" TEXT,
    "capabilitiesJson" TEXT,
    "lastSeenAt" DATETIME,
    "lastIp" TEXT,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RunnerNode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RunnerJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "runnerNodeId" TEXT,
    "jobType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "riskLevel" TEXT NOT NULL DEFAULT 'medium',
    "payloadJson" TEXT NOT NULL,
    "resultJson" TEXT,
    "errorMessage" TEXT,
    "leaseToken" TEXT,
    "leaseExpiresAt" DATETIME,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "requestedBy" TEXT,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" DATETIME,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RunnerJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RunnerJob_runnerNodeId_fkey" FOREIGN KEY ("runnerNodeId") REFERENCES "RunnerNode" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RunnerJobEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runnerJobId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "dataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RunnerJobEvent_runnerJobId_fkey" FOREIGN KEY ("runnerJobId") REFERENCES "RunnerJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RunnerNode_userId_createdAt_idx" ON "RunnerNode"("userId", "createdAt");
CREATE INDEX "RunnerNode_userId_status_updatedAt_idx" ON "RunnerNode"("userId", "status", "updatedAt");
CREATE INDEX "RunnerNode_lastSeenAt_idx" ON "RunnerNode"("lastSeenAt");

-- CreateIndex
CREATE INDEX "RunnerJob_userId_status_createdAt_idx" ON "RunnerJob"("userId", "status", "createdAt");
CREATE INDEX "RunnerJob_runnerNodeId_status_updatedAt_idx" ON "RunnerJob"("runnerNodeId", "status", "updatedAt");
CREATE INDEX "RunnerJob_leaseExpiresAt_idx" ON "RunnerJob"("leaseExpiresAt");

-- CreateIndex
CREATE INDEX "RunnerJobEvent_runnerJobId_createdAt_idx" ON "RunnerJobEvent"("runnerJobId", "createdAt");

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "defaultAutonomy" TEXT NOT NULL DEFAULT 'APPROVAL',
    "requirePreview" BOOLEAN NOT NULL DEFAULT true,
    "enableRollback" BOOLEAN NOT NULL DEFAULT true,
    "justDoItMode" BOOLEAN NOT NULL DEFAULT true,
    "compactDashboard" BOOLEAN NOT NULL DEFAULT false,
    "highlightApprovals" BOOLEAN NOT NULL DEFAULT true,
    "connectorChecks" TEXT NOT NULL DEFAULT 'DAILY',
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InboxItemStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'OPEN',
    "stateLabel" TEXT NOT NULL DEFAULT 'Open',
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InboxItemStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InboxItemStatus_userId_itemId_key" ON "InboxItemStatus"("userId", "itemId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_scope_createdAt_idx" ON "AuditLog"("userId", "scope", "createdAt");

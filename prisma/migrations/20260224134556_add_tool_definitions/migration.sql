-- CreateTable
CREATE TABLE "ToolDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "parametersJson" TEXT NOT NULL,
    "executionMode" TEXT NOT NULL DEFAULT 'in_process',
    "category" TEXT NOT NULL DEFAULT 'general',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AgentKindToolSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentKind" TEXT NOT NULL,
    "toolDefinitionId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentKindToolSet_toolDefinitionId_fkey" FOREIGN KEY ("toolDefinitionId") REFERENCES "ToolDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RunnerPolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL DEFAULT 'default',
    "templateName" TEXT NOT NULL DEFAULT 'Default workspace template',
    "version" INTEGER NOT NULL DEFAULT 1,
    "rulesJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RunnerPolicy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RunnerPolicy" ("createdAt", "id", "rulesJson", "templateKey", "templateName", "updatedAt", "userId", "version") SELECT "createdAt", "id", "rulesJson", "templateKey", "templateName", "updatedAt", "userId", "version" FROM "RunnerPolicy";
DROP TABLE "RunnerPolicy";
ALTER TABLE "new_RunnerPolicy" RENAME TO "RunnerPolicy";
CREATE UNIQUE INDEX "RunnerPolicy_userId_key" ON "RunnerPolicy"("userId");
CREATE INDEX "RunnerPolicy_templateKey_updatedAt_idx" ON "RunnerPolicy"("templateKey", "updatedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ToolDefinition_name_key" ON "ToolDefinition"("name");

-- CreateIndex
CREATE INDEX "ToolDefinition_category_enabled_idx" ON "ToolDefinition"("category", "enabled");

-- CreateIndex
CREATE INDEX "AgentKindToolSet_agentKind_enabled_idx" ON "AgentKindToolSet"("agentKind", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "AgentKindToolSet_agentKind_toolDefinitionId_key" ON "AgentKindToolSet"("agentKind", "toolDefinitionId");

-- Auto-approval rules for inbox actions
CREATE TABLE IF NOT EXISTS "AutoApprovalRule" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "userId"        TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name"          TEXT NOT NULL DEFAULT '',
  "toolName"      TEXT NOT NULL,
  "conditionJson" TEXT,
  "enabled"       BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AutoApprovalRule_userId_enabled_idx" ON "AutoApprovalRule"("userId", "enabled");

-- Database connections for SQL query tool
CREATE TABLE IF NOT EXISTS "DatabaseConnection" (
  "id"                        TEXT NOT NULL PRIMARY KEY,
  "userId"                    TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name"                      TEXT NOT NULL,
  "encryptedConnectionString" TEXT NOT NULL,
  "allowedTablesJson"         TEXT,
  "enabled"                   BOOLEAN NOT NULL DEFAULT true,
  "lastTestedAt"              TIMESTAMP(3),
  "lastTestStatus"            TEXT,
  "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "DatabaseConnection_userId_enabled_idx" ON "DatabaseConnection"("userId", "enabled");

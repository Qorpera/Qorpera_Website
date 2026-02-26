-- Add persisted runner policy (per user)
CREATE TABLE "RunnerPolicy" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "templateKey" TEXT NOT NULL DEFAULT 'default',
  "templateName" TEXT NOT NULL DEFAULT 'Default workspace template',
  "version" INTEGER NOT NULL DEFAULT 1,
  "rulesJson" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "RunnerPolicy_userId_key" ON "RunnerPolicy"("userId");
CREATE INDEX "RunnerPolicy_templateKey_updatedAt_idx" ON "RunnerPolicy"("templateKey", "updatedAt");

INSERT INTO "RunnerPolicy" ("id", "userId", "templateKey", "templateName", "version", "rulesJson", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(12))), u."id", 'default', 'Default workspace template', 1,
  '{"defaultRule":{"riskLevel":"medium","approvalRequired":true},"jobTypeRules":{"health.check":{"riskLevel":"low","approvalRequired":false},"file.read":{"riskLevel":"low","approvalRequired":false},"file.write":{"riskLevel":"medium","approvalRequired":true},"command.exec":{"riskLevel":"medium","approvalRequired":true}}}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User" u
WHERE NOT EXISTS (SELECT 1 FROM "RunnerPolicy" rp WHERE rp."userId" = u."id");

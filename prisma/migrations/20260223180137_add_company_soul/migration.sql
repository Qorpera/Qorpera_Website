-- CreateTable
CREATE TABLE "CompanySoul" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CompanySoul_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanySoul_userId_key" ON "CompanySoul"("userId");

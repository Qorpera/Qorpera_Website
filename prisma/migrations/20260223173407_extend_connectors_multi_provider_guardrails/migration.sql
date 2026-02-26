-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProviderCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'MANAGED',
    "label" TEXT,
    "encryptedKey" TEXT,
    "keyLast4" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "monthlyRequestLimit" INTEGER NOT NULL DEFAULT 500,
    "monthlyRequestCount" INTEGER NOT NULL DEFAULT 0,
    "monthlyUsdLimit" REAL NOT NULL DEFAULT 10,
    "monthlyEstimatedUsd" REAL NOT NULL DEFAULT 0,
    "usageMonthKey" TEXT,
    "lastTestedAt" DATETIME,
    "lastTestStatus" TEXT,
    "lastTestMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProviderCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProviderCredential" ("createdAt", "encryptedKey", "id", "keyLast4", "label", "mode", "provider", "status", "updatedAt", "userId") SELECT "createdAt", "encryptedKey", "id", "keyLast4", "label", "mode", "provider", "status", "updatedAt", "userId" FROM "ProviderCredential";
DROP TABLE "ProviderCredential";
ALTER TABLE "new_ProviderCredential" RENAME TO "ProviderCredential";
CREATE INDEX "ProviderCredential_userId_provider_updatedAt_idx" ON "ProviderCredential"("userId", "provider", "updatedAt");
CREATE UNIQUE INDEX "ProviderCredential_userId_provider_key" ON "ProviderCredential"("userId", "provider");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

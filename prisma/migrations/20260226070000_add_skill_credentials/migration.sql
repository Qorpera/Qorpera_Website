-- CreateTable
CREATE TABLE "SkillCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "varName" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "keyLast4" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SkillCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SkillCredential_userId_idx" ON "SkillCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillCredential_userId_varName_key" ON "SkillCredential"("userId", "varName");

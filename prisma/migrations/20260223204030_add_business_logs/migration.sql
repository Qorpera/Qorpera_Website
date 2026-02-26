-- CreateTable
CREATE TABLE "BusinessLogEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "source" TEXT NOT NULL DEFAULT 'OWNER',
    "authorLabel" TEXT,
    "body" TEXT NOT NULL,
    "relatedRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BusinessLogEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BusinessLogEntry_userId_createdAt_idx" ON "BusinessLogEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessLogEntry_userId_category_createdAt_idx" ON "BusinessLogEntry"("userId", "category", "createdAt");

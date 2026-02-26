-- CreateTable
CREATE TABLE "DelegatedTaskToolCall" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "delegatedTaskId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER,
    "inputSummary" TEXT,
    "outputSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DelegatedTaskToolCall_delegatedTaskId_fkey" FOREIGN KEY ("delegatedTaskId") REFERENCES "DelegatedTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DelegatedTaskToolCall_delegatedTaskId_createdAt_idx" ON "DelegatedTaskToolCall"("delegatedTaskId", "createdAt");

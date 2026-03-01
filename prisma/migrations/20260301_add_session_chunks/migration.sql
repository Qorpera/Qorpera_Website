-- Session Chunks for advisor transcript search
CREATE TABLE "SessionChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "chunkText" TEXT NOT NULL,
    "embeddingJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SessionChunk_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AdvisorSession"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SessionChunk_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SessionChunk_userId_sessionId_idx" ON "SessionChunk"("userId", "sessionId");
CREATE INDEX "SessionChunk_sessionId_chunkIndex_idx" ON "SessionChunk"("sessionId", "chunkIndex");

-- Watermark for incremental indexing
ALTER TABLE "AdvisorSession" ADD COLUMN "lastIndexedMessageId" TEXT;

CREATE TABLE "RunnerJobControl" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "runnerJobId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "payloadJson" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "appliedAt" DATETIME,
  CONSTRAINT "RunnerJobControl_runnerJobId_fkey" FOREIGN KEY ("runnerJobId") REFERENCES "RunnerJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "RunnerJobControl_runnerJobId_status_createdAt_idx" ON "RunnerJobControl"("runnerJobId", "status", "createdAt");

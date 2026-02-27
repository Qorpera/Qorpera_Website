CREATE TABLE "RecurringTask" (
    "id"           TEXT         NOT NULL,
    "userId"       TEXT         NOT NULL,
    "agentTarget"  TEXT         NOT NULL,
    "title"        TEXT         NOT NULL,
    "instructions" TEXT         NOT NULL,
    "scheduleTime" TEXT         NOT NULL,
    "daysOfWeek"   TEXT         NOT NULL DEFAULT '1,2,3,4,5',
    "isActive"     BOOLEAN      NOT NULL DEFAULT true,
    "lastRunAt"    TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RecurringTask_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RecurringTask_userId_isActive_idx" ON "RecurringTask"("userId", "isActive");
ALTER TABLE "RecurringTask" ADD CONSTRAINT "RecurringTask_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

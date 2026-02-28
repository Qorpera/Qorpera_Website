CREATE TYPE "ScheduleFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

CREATE TABLE "Schedule" (
  "id"           TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "agentKind"    TEXT NOT NULL,
  "title"        TEXT NOT NULL,
  "instructions" TEXT NOT NULL,
  "frequency"    "ScheduleFrequency" NOT NULL,
  "dayOfWeek"    INTEGER,
  "dayOfMonth"   INTEGER,
  "timeOfDay"    TEXT NOT NULL,
  "timezone"     TEXT NOT NULL DEFAULT 'UTC',
  "enabled"      BOOLEAN NOT NULL DEFAULT true,
  "lastRunAt"    TIMESTAMP(3),
  "nextRunAt"    TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Schedule_enabled_nextRunAt_idx" ON "Schedule"("enabled", "nextRunAt");
CREATE INDEX "Schedule_userId_idx" ON "Schedule"("userId");

ALTER TABLE "Schedule"
  ADD CONSTRAINT "Schedule_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

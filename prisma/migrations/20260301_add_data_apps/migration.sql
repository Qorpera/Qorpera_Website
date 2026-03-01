CREATE TABLE "DataApp" (
  "id"            TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "title"         TEXT NOT NULL,
  "appType"       TEXT NOT NULL,
  "dataJson"      TEXT NOT NULL,
  "layoutJson"    TEXT NOT NULL DEFAULT '{}',
  "sourceContext" TEXT NOT NULL DEFAULT '',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DataApp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DataApp_userId_createdAt_idx" ON "DataApp"("userId", "createdAt");
CREATE INDEX "DataApp_userId_appType_idx" ON "DataApp"("userId", "appType");

ALTER TABLE "DataApp"
  ADD CONSTRAINT "DataApp_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

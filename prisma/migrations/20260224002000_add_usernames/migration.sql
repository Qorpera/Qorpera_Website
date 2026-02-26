ALTER TABLE "User" ADD COLUMN "username" TEXT;
ALTER TABLE "Agent" ADD COLUMN "username" TEXT;

UPDATE "Agent" SET "username" = 'mara' WHERE "kind" = 'ASSISTANT' AND ("username" IS NULL OR "username" = '');
UPDATE "Agent" SET "username" = 'ilan' WHERE "kind" = 'PROJECT_MANAGER' AND ("username" IS NULL OR "username" = '');

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "Agent_username_key" ON "Agent"("username");

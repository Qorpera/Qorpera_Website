ALTER TABLE "UserPreference" ADD COLUMN "notifyApprovalNeeded" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "UserPreference" ADD COLUMN "notifySubmissionReady" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "UserPreference" ADD COLUMN "notifyTaskCompleted" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "UserPreference" ADD COLUMN "notifyTaskFailed" BOOLEAN NOT NULL DEFAULT true;

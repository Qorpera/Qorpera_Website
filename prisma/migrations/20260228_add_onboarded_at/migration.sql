-- Add onboarding tracking columns to User
ALTER TABLE "User" ADD COLUMN "onboardedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "tourCompletedAt" TIMESTAMP(3);

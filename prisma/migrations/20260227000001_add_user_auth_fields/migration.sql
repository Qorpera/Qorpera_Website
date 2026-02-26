-- AlterTable: add email verification and session/reset token fields missing from init migration
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "emailVerifyToken" TEXT;
ALTER TABLE "User" ADD COLUMN "emailVerifyExp" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "resetToken" TEXT;
ALTER TABLE "User" ADD COLUMN "resetTokenExp" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "sessionRevokedAt" TIMESTAMP(3);

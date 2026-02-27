-- CreateEnum
CREATE TYPE "LicenseKeyStatus" AS ENUM ('ACTIVE', 'REDEEMED', 'REVOKED');

-- CreateTable
CREATE TABLE "AgentLicenseKey" (
    "id" TEXT NOT NULL,
    "creatorUserId" TEXT NOT NULL,
    "agentKind" "AgentKind" NOT NULL,
    "schedule" "RunSchedule" NOT NULL,
    "code" TEXT NOT NULL,
    "status" "LicenseKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "redeemedById" TEXT,
    "redeemedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentLicenseKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentKind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentLicenseKey_code_key" ON "AgentLicenseKey"("code");
CREATE INDEX "AgentLicenseKey_creatorUserId_createdAt_idx" ON "AgentLicenseKey"("creatorUserId", "createdAt");
CREATE INDEX "AgentLicenseKey_redeemedById_idx" ON "AgentLicenseKey"("redeemedById");

-- CreateIndex
CREATE INDEX "AgentFeedback_userId_createdAt_idx" ON "AgentFeedback"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AgentLicenseKey" ADD CONSTRAINT "AgentLicenseKey_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentLicenseKey" ADD CONSTRAINT "AgentLicenseKey_redeemedById_fkey" FOREIGN KEY ("redeemedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentFeedback" ADD CONSTRAINT "AgentFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

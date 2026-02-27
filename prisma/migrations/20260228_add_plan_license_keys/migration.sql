-- CreateTable
CREATE TABLE "PlanLicenseKey" (
    "id" TEXT NOT NULL,
    "creatorUserId" TEXT NOT NULL,
    "tier" "PlanTier" NOT NULL,
    "code" TEXT NOT NULL,
    "status" "LicenseKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "redeemedById" TEXT,
    "redeemedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanLicenseKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanLicenseKey_code_key" ON "PlanLicenseKey"("code");

-- CreateIndex
CREATE INDEX "PlanLicenseKey_creatorUserId_createdAt_idx" ON "PlanLicenseKey"("creatorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "PlanLicenseKey_redeemedById_idx" ON "PlanLicenseKey"("redeemedById");

-- AddForeignKey
ALTER TABLE "PlanLicenseKey" ADD CONSTRAINT "PlanLicenseKey_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanLicenseKey" ADD CONSTRAINT "PlanLicenseKey_redeemedById_fkey" FOREIGN KEY ("redeemedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

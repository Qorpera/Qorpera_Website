-- CreateEnum: PlanTier
CREATE TYPE "PlanTier" AS ENUM ('SOLO', 'SMALL_BUSINESS', 'MID_SIZE');

-- CreateTable: Plan
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "tier" "PlanTier" NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headline" TEXT NOT NULL DEFAULT '',
    "monthlyCents" INTEGER NOT NULL,
    "agentCap" INTEGER NOT NULL,
    "stripePriceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "featuresJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Plan.slug unique
CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");

-- CreateTable: PlanSubscription
CREATE TABLE "PlanSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "checkoutSessionId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: PlanSubscription unique constraints
CREATE UNIQUE INDEX "PlanSubscription_stripeSubscriptionId_key" ON "PlanSubscription"("stripeSubscriptionId");
CREATE UNIQUE INDEX "PlanSubscription_checkoutSessionId_key" ON "PlanSubscription"("checkoutSessionId");

-- CreateIndex: PlanSubscription.userId+status
CREATE INDEX "PlanSubscription_userId_status_idx" ON "PlanSubscription"("userId", "status");

-- AddForeignKey: PlanSubscription.userId -> User.id
ALTER TABLE "PlanSubscription" ADD CONSTRAINT "PlanSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: PlanSubscription.planId -> Plan.id
ALTER TABLE "PlanSubscription" ADD CONSTRAINT "PlanSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: PlanInquiry
CREATE TABLE "PlanInquiry" (
    "id" TEXT NOT NULL,
    "tier" "PlanTier" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT '',
    "employeeCount" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanInquiry_pkey" PRIMARY KEY ("id")
);

-- AlterTable: AgentPurchaseOrder — add purchaseMode
ALTER TABLE "AgentPurchaseOrder" ADD COLUMN "purchaseMode" TEXT NOT NULL DEFAULT 'LEGACY_AGENT';

-- Seed: Create the three plan tiers
INSERT INTO "Plan" ("id", "tier", "slug", "name", "headline", "monthlyCents", "agentCap", "stripePriceId", "isActive", "featuresJson", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'SOLO', 'solo', 'Solo', 'Everything you need to run your business with AI', 29900, 4, NULL, true,
   '["Up to 4 AI agents","AI advisor included","Full agent customization","Email notifications","Local AI support"]',
   NOW(), NOW()),
  (gen_random_uuid()::text, 'SMALL_BUSINESS', 'small-business', 'Small Business', 'Scale your team with dedicated AI workforce', 150000, 8, NULL, true,
   '["Up to 8 AI agents","Priority support","Custom agent training","Advanced analytics","Team collaboration","Dedicated onboarding"]',
   NOW(), NOW()),
  (gen_random_uuid()::text, 'MID_SIZE', 'mid-size', 'Mid-size', 'Enterprise-grade AI workforce for growing companies', 500000, 20, NULL, true,
   '["Up to 20 AI agents","Enterprise support","Custom integrations","SLA guarantees","Dedicated account manager","Custom agent development","SOC 2 compliance"]',
   NOW(), NOW());

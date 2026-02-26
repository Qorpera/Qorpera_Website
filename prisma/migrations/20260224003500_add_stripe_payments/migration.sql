CREATE TABLE "StripePayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "stripeEventId" TEXT,
    "checkoutSessionId" TEXT NOT NULL,
    "paymentIntentId" TEXT,
    "amountTotal" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "paymentStatus" TEXT NOT NULL DEFAULT 'unknown',
    "mode" TEXT NOT NULL DEFAULT 'payment',
    "agentKind" TEXT,
    "schedule" TEXT,
    "metadataJson" TEXT,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StripePayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StripePayment_checkoutSessionId_key" ON "StripePayment"("checkoutSessionId");
CREATE INDEX "StripePayment_userId_createdAt_idx" ON "StripePayment"("userId", "createdAt");
CREATE INDEX "StripePayment_userId_paidAt_idx" ON "StripePayment"("userId", "paidAt");
CREATE INDEX "StripePayment_userId_paymentStatus_createdAt_idx" ON "StripePayment"("userId", "paymentStatus", "createdAt");

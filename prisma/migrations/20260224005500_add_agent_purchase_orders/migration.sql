CREATE TABLE "AgentPurchaseOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "agentKind" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "checkoutSessionId" TEXT,
    "stripeEventId" TEXT,
    "stripePaymentId" TEXT,
    "failureReason" TEXT,
    "fulfilledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentPurchaseOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AgentPurchaseOrder_checkoutSessionId_key" ON "AgentPurchaseOrder"("checkoutSessionId");
CREATE INDEX "AgentPurchaseOrder_userId_createdAt_idx" ON "AgentPurchaseOrder"("userId", "createdAt");
CREATE INDEX "AgentPurchaseOrder_userId_status_createdAt_idx" ON "AgentPurchaseOrder"("userId", "status", "createdAt");

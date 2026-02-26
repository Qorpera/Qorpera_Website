-- CreateTable
CREATE TABLE "ModelRoutePreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'OPENAI',
    "modelName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ModelRoutePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ModelRoutePreference_userId_target_idx" ON "ModelRoutePreference"("userId", "target");

-- CreateIndex
CREATE UNIQUE INDEX "ModelRoutePreference_userId_target_key" ON "ModelRoutePreference"("userId", "target");

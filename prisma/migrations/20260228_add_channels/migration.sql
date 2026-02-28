-- Phase 2B: Multi-Channel Presence

-- ChannelType enum
DO $$ BEGIN
  CREATE TYPE "ChannelType" AS ENUM ('SLACK', 'EMAIL', 'WHATSAPP', 'SMS', 'VOICE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ChannelConfig
CREATE TABLE IF NOT EXISTS "ChannelConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelType" "ChannelType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "configJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChannelConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ChannelConfig_userId_channelType_key" ON "ChannelConfig"("userId", "channelType");
CREATE INDEX IF NOT EXISTS "ChannelConfig_userId_enabled_idx" ON "ChannelConfig"("userId", "enabled");

-- ChannelConversation
CREATE TABLE IF NOT EXISTS "ChannelConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelType" "ChannelType" NOT NULL,
    "externalThreadId" TEXT,
    "externalContactId" TEXT,
    "agentTarget" TEXT,
    "delegatedTaskId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChannelConversation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ChannelConversation_userId_channelType_status_idx" ON "ChannelConversation"("userId", "channelType", "status");
CREATE INDEX IF NOT EXISTS "ChannelConversation_userId_externalThreadId_idx" ON "ChannelConversation"("userId", "externalThreadId");

-- ChannelMessage
CREATE TABLE IF NOT EXISTS "ChannelMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "senderLabel" TEXT NOT NULL,
    "contentText" TEXT NOT NULL,
    "contentHtml" TEXT,
    "contentJson" TEXT,
    "externalId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChannelMessage_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  ALTER TABLE "ChannelMessage" ADD CONSTRAINT "ChannelMessage_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "ChannelConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "ChannelMessage_conversationId_createdAt_idx" ON "ChannelMessage"("conversationId", "createdAt");

-- ContactChannelMapping
CREATE TABLE IF NOT EXISTS "ContactChannelMapping" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "channelType" "ChannelType" NOT NULL,
    "contactName" TEXT NOT NULL DEFAULT '',
    "agentTarget" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContactChannelMapping_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ContactChannelMapping_userId_externalId_channelType_key" ON "ContactChannelMapping"("userId", "externalId", "channelType");
CREATE INDEX IF NOT EXISTS "ContactChannelMapping_userId_channelType_idx" ON "ContactChannelMapping"("userId", "channelType");

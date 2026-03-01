-- Entity Ontology: unified cross-integration context

-- Enums
CREATE TYPE "EntityType" AS ENUM ('PERSON', 'COMPANY', 'DEAL', 'PROJECT');
CREATE TYPE "EntityRelationType" AS ENUM ('WORKS_AT', 'OWNS', 'ASSIGNED_TO', 'BELONGS_TO', 'PART_OF', 'RELATED_TO');

-- Entity
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "EntityType" NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "domain" TEXT,
    "metadataJson" TEXT,
    "mergedIntoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- EntityExternalRef
CREATE TABLE "EntityExternalRef" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "label" TEXT,
    "metadataJson" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityExternalRef_pkey" PRIMARY KEY ("id")
);

-- EntityRelationship
CREATE TABLE "EntityRelationship" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromEntityId" TEXT NOT NULL,
    "toEntityId" TEXT NOT NULL,
    "relationType" "EntityRelationType" NOT NULL,
    "label" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityRelationship_pkey" PRIMARY KEY ("id")
);

-- EntityMention
CREATE TABLE "EntityMention" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "snippet" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityMention_pkey" PRIMARY KEY ("id")
);

-- Indexes: Entity
CREATE INDEX "Entity_userId_type_updatedAt_idx" ON "Entity"("userId", "type", "updatedAt");
CREATE INDEX "Entity_userId_email_idx" ON "Entity"("userId", "email");
CREATE INDEX "Entity_userId_displayName_idx" ON "Entity"("userId", "displayName");
CREATE INDEX "Entity_userId_domain_idx" ON "Entity"("userId", "domain");
CREATE INDEX "Entity_userId_mergedIntoId_idx" ON "Entity"("userId", "mergedIntoId");

-- Indexes: EntityExternalRef
CREATE UNIQUE INDEX "EntityExternalRef_entityId_provider_externalId_key" ON "EntityExternalRef"("entityId", "provider", "externalId");
CREATE INDEX "EntityExternalRef_provider_externalId_idx" ON "EntityExternalRef"("provider", "externalId");

-- Indexes: EntityRelationship
CREATE UNIQUE INDEX "EntityRelationship_fromEntityId_toEntityId_relationType_key" ON "EntityRelationship"("fromEntityId", "toEntityId", "relationType");
CREATE INDEX "EntityRelationship_userId_fromEntityId_idx" ON "EntityRelationship"("userId", "fromEntityId");
CREATE INDEX "EntityRelationship_userId_toEntityId_idx" ON "EntityRelationship"("userId", "toEntityId");

-- Indexes: EntityMention
CREATE INDEX "EntityMention_entityId_createdAt_idx" ON "EntityMention"("entityId", "createdAt");
CREATE INDEX "EntityMention_sourceType_sourceId_idx" ON "EntityMention"("sourceType", "sourceId");

-- Foreign keys
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EntityExternalRef" ADD CONSTRAINT "EntityExternalRef_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntityRelationship" ADD CONSTRAINT "EntityRelationship_fromEntityId_fkey" FOREIGN KEY ("fromEntityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntityRelationship" ADD CONSTRAINT "EntityRelationship_toEntityId_fkey" FOREIGN KEY ("toEntityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntityMention" ADD CONSTRAINT "EntityMention_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

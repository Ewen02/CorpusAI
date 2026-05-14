-- Introduce document versioning: every upload now creates a `DocumentVersion`
-- row pinned to its parent `Document`. The version flagged `isActive` is the
-- one exposed to retrieval (Qdrant). Rollback flips `isActive` and re-upserts
-- the chunks of the restored version, which avoids re-embedding.
--
-- Migration steps:
--   1. Add `documentVersionId` (nullable) to `Chunk` for backfill safety.
--   2. Create the `DocumentVersion` table.
--   3. Backfill: create version 1 (active) for every existing `Document`,
--      then link existing chunks to that version.
--   4. Add the composite index on `Document(aiId, filename)` used by the
--      versioning flow to detect re-uploads.

-- 1. Chunk gains a nullable pointer to its version (kept nullable for legacy chunks).
ALTER TABLE "Chunk" ADD COLUMN "documentVersionId" TEXT;

-- 2. Create the DocumentVersion table.
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "wordCount" INTEGER,
    "pageCount" INTEGER,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentVersion_documentId_version_key" ON "DocumentVersion"("documentId", "version");
CREATE INDEX "DocumentVersion_documentId_isActive_idx" ON "DocumentVersion"("documentId", "isActive");

ALTER TABLE "DocumentVersion"
    ADD CONSTRAINT "DocumentVersion_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Backfill: every existing document gets a version 1 marked active,
--    then we link existing chunks to that version.
INSERT INTO "DocumentVersion" (
    "id", "documentId", "version", "filename", "mimeType", "size", "url",
    "chunkCount", "wordCount", "pageCount", "status", "uploadedAt", "isActive", "metadata"
)
SELECT
    'dv_' || "id",
    "id",
    1,
    "filename",
    "mimeType",
    "size",
    "url",
    "chunkCount",
    "wordCount",
    "pageCount",
    "status",
    "createdAt",
    true,
    jsonb_strip_nulls(jsonb_build_object(
        'title', "title",
        'author', "author",
        'language', "language"
    ))
FROM "Document";

UPDATE "Chunk"
SET "documentVersionId" = 'dv_' || "documentId"
WHERE "documentVersionId" IS NULL;

-- 4. Foreign key + indexes for the chunk pointer.
ALTER TABLE "Chunk"
    ADD CONSTRAINT "Chunk_documentVersionId_fkey"
    FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Chunk_documentVersionId_idx" ON "Chunk"("documentVersionId");

-- 5. Composite (aiId, filename) lookup used by the versioning flow.
CREATE INDEX "Document_aiId_filename_idx" ON "Document"("aiId", "filename");

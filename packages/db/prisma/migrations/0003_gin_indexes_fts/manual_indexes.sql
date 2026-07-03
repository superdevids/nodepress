-- GIN indexes for JSONB fields
CREATE INDEX IF NOT EXISTS idx_content_entry_data_gin ON "content_entries" USING GIN ("data");
CREATE INDEX IF NOT EXISTS idx_revision_data_gin ON "revisions" USING GIN ("data");

-- Full-text search
ALTER TABLE "content_entries" ADD COLUMN IF NOT EXISTS "searchVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(data->>'title', '') || ' ' || coalesce(data->>'content', ''))
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_content_entry_search ON "content_entries" USING GIN ("searchVector");

-- Partial indexes
CREATE INDEX IF NOT EXISTS idx_content_entry_published ON "content_entries" ("publishedAt" DESC)
  WHERE "status" = 'PUBLISHED';
CREATE INDEX IF NOT EXISTS idx_content_entry_drafts ON "content_entries" ("updatedAt" DESC)
  WHERE "status" IN ('DRAFT', 'PENDING_REVIEW');
CREATE INDEX IF NOT EXISTS idx_content_entry_trashed ON "content_entries" ("updatedAt" DESC)
  WHERE "status" = 'TRASHED';
CREATE INDEX IF NOT EXISTS idx_content_entry_sticky ON "content_entries" ("isSticky")
  WHERE "isSticky" = true;

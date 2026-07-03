-- ============================================================
-- NodePress — Migration: GIN Indexes, Full-Text Search, Partial Indexes
-- Prisma Schema v3
-- PostgreSQL 16
-- ============================================================
-- This migration must be applied AFTER the initial Prisma migration
-- that creates all tables (0001_initial_schema).
--
-- Run with: psql -d nodepress -f migration.sql
-- Or via Prisma: npx prisma db execute --file migration.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. GIN JSONB Indexes
-- ============================================================
-- These enable efficient querying inside JSONB data columns.
-- jsonb_path_ops is more efficient for @> contains queries
-- (e.g., WHERE data @> '{"price": 100}')
-- compared to the default jsonb_ops strategy.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_entries_data_gin
  ON content_entries
  USING GIN (data jsonb_path_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_revisions_data_gin
  ON revisions
  USING GIN (data jsonb_path_ops);

-- Additional GIN indexes for meta tables (EAV pattern)
-- Optimizes queries like: WHERE key = 'subtitle' AND value @> '"some value"'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_meta_key_value_gin
  ON content_meta
  USING GIN (value jsonb_path_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_meta_key_value_gin
  ON user_meta
  USING GIN (value jsonb_path_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_term_meta_key_value_gin
  ON term_meta
  USING GIN (value jsonb_path_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comment_meta_key_value_gin
  ON comment_meta
  USING GIN (value jsonb_path_ops);

-- ============================================================
-- 3. Full-Text Search (tsvector)
-- ============================================================
-- Creates a tsvector column that auto-updates via triggers,
-- enabling fast full-text search across content entries.
-- ============================================================

-- 3a. Function: Update search vector on INSERT or UPDATE
CREATE OR REPLACE FUNCTION update_content_search_vector()
RETURNS TRIGGER AS $$
DECLARE
  title_text   TEXT;
  excerpt_text TEXT;
  body_text    TEXT;
BEGIN
  -- Extract text fields from the JSONB data column.
  -- The exact keys depend on the content type schema,
  -- but 'title', 'excerpt', and 'body' are conventions.
  title_text   := COALESCE(NEW.data->>'title', '');
  excerpt_text := COALESCE(NEW.excerpt, COALESCE(NEW.data->>'excerpt', ''));
  body_text    := COALESCE(NEW.data->>'body', COALESCE(NEW.data->>'content', ''));

  -- Use 'english' text search configuration.
  -- For multi-language support, this can be extended to use
  -- the entry's language or a configurable default.
  NEW.search_vector := to_tsvector('english',
    title_text || ' ' || excerpt_text || ' ' || body_text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3b. Trigger: Auto-update search vector before insert/update
DROP TRIGGER IF EXISTS trg_content_search_vector ON content_entries;
CREATE TRIGGER trg_content_search_vector
  BEFORE INSERT OR UPDATE OF data, excerpt
  ON content_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_content_search_vector();

-- 3c. GIN index on the tsvector column for fast full-text search queries
-- This enables queries like:
--   SELECT * FROM content_entries
--   WHERE search_vector @@ to_tsquery('english', 'search & terms');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_entries_search_gin
  ON content_entries
  USING GIN (search_vector);

-- 3d. Trigger function to maintain search_vector on UPDATE of data column only
-- (The BEFORE INSERT OR UPDATE trigger above handles both)
COMMENT ON FUNCTION update_content_search_vector() IS
  'Auto-updates the search_vector tsvector column from data->>title, excerpt, and data->>body';

-- ============================================================
-- 4. Partial Indexes
-- ============================================================
-- Partial indexes are smaller and faster than full-table indexes
-- because they only index rows matching the WHERE condition.

-- 4a. Published entries — sorted by publish date descending
-- Used by: public facing queries, feed generation, sitemap
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_entries_published
  ON content_entries ("publishedAt" DESC)
  WHERE status = 'PUBLISHED';

-- 4b. Published entries by content type — for content-type-specific listing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_entries_published_by_type
  ON content_entries ("contentTypeId", "publishedAt" DESC)
  WHERE status = 'PUBLISHED';

-- 4c. Draft & pending review entries — sorted by creation date
-- Used by: admin panel "My Drafts" and "Pending Review" lists
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_entries_drafts
  ON content_entries ("createdAt" DESC)
  WHERE status IN ('DRAFT', 'PENDING_REVIEW');

-- 4d. Draft & pending by author — for "My Drafts" filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_entries_drafts_by_author
  ON content_entries ("authorId", "createdAt" DESC)
  WHERE status IN ('DRAFT', 'PENDING_REVIEW');

-- 4e. Scheduled entries — for cron-based publishing worker
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_entries_scheduled
  ON content_entries ("publishedAt")
  WHERE status = 'SCHEDULED';

-- 4f. Trashed entries — for auto-purge cleanup jobs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_entries_trashed
  ON content_entries ("updatedAt")
  WHERE status = 'TRASHED';

-- 4g. Sticky published entries — for "sticky first" sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_entries_sticky_published
  ON content_entries ("isSticky" DESC, "publishedAt" DESC)
  WHERE status = 'PUBLISHED';

-- ============================================================
-- 5. Additional Composite Indexes
-- ============================================================

-- 5a. Term relation: lookup by term (find all entries with a specific term)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_term_relations_term_entry
  ON term_relations ("termId", "entryId");

-- 5b. Comments: efficient lookup by entry + status + date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_entry_status_date
  ON comments ("entryId", status, "createdAt" DESC);

-- 5c. Notifications: unread notifications for a user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread
  ON notifications ("userId", "readAt")
  WHERE "readAt" IS NULL;

-- 5d. Audit log: recent actions by actor
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_actor_recent
  ON audit_logs ("actorId", "createdAt" DESC);

-- 5e. Audit log: recent actions by action type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action_recent
  ON audit_logs (action, "createdAt" DESC);

-- 5f. Sessions: active sessions cleanup (TTL-based expiry)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expiry
  ON sessions ("expiresAt")
  WHERE "expiresAt" < NOW();

-- ============================================================
-- 6. Stats & Maintenance Views (Optional but Recommended)
-- ============================================================

-- 6a. Content stats summary view
CREATE OR REPLACE VIEW view_content_stats AS
SELECT
  ct.name AS content_type,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE ce.status = 'PUBLISHED') AS published,
  COUNT(*) FILTER (WHERE ce.status = 'DRAFT') AS drafts,
  COUNT(*) FILTER (WHERE ce.status = 'TRASHED') AS trashed,
  COUNT(*) FILTER (WHERE ce.isSticky = true AND ce.status = 'PUBLISHED') AS sticky,
  MAX(ce."publishedAt") AS last_published
FROM content_entries ce
JOIN content_types ct ON ct.id = ce."contentTypeId"
GROUP BY ct.name
ORDER BY ct.name;

COMMENT ON VIEW view_content_stats IS
  'Aggregated content statistics per content type for dashboard display';

-- ============================================================
-- 7. Verification Queries (uncomment to run manually)
-- ============================================================
/*
-- Check that all indexes exist:
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE tablename IN (
  'content_entries', 'revisions', 'content_meta', 'user_meta',
  'term_meta', 'comment_meta', 'term_relations', 'comments',
  'notifications', 'audit_logs', 'sessions'
)
ORDER BY tablename, indexname;

-- Check GIN indexes specifically:
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE indexdef LIKE '%GIN%'
ORDER BY tablename, indexname;

-- Test full-text search:
SELECT id, slug, "publishedAt"
FROM content_entries
WHERE search_vector @@ to_tsquery('english', 'example & query')
AND status = 'PUBLISHED'
LIMIT 10;
*/

COMMIT;

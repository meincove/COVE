BEGIN;

-- Extensions (safe to re-run; if you lack perms, skip and tell me)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Generated search text from title + text
ALTER TABLE ai_core.docs
  ADD COLUMN IF NOT EXISTS search_text TEXT GENERATED ALWAYS AS (
    unaccent(lower(coalesce(title,'') || ' ' || coalesce(text,'')))
  ) STORED;

-- tsvector column for ranking/filtering
ALTER TABLE ai_core.docs
  ADD COLUMN IF NOT EXISTS tsv tsvector;

-- Keep tsv in sync
CREATE OR REPLACE FUNCTION ai_core_docs_tsv_update() RETURNS trigger AS $$
BEGIN
  NEW.tsv := to_tsvector('simple', NEW.search_text);
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_core_docs_tsv_update_t ON ai_core.docs;
CREATE TRIGGER ai_core_docs_tsv_update_t
  BEFORE INSERT OR UPDATE OF title, text ON ai_core.docs
  FOR EACH ROW EXECUTE PROCEDURE ai_core_docs_tsv_update();

-- Backfill existing rows (fires the trigger)
UPDATE ai_core.docs SET title = title;

-- Indexes for speed
CREATE INDEX IF NOT EXISTS idx_ai_docs_tsv  ON ai_core.docs USING GIN (tsv);
CREATE INDEX IF NOT EXISTS idx_ai_docs_trgm ON ai_core.docs USING GIN (search_text gin_trgm_ops);

COMMIT;

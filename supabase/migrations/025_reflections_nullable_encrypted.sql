-- ============================================================
-- Migration 025: Make reflection_encrypted nullable
-- ============================================================
-- The new reflections spec stores data in content_json (JSONB).
-- The legacy reflection_encrypted column is no longer required.

ALTER TABLE reflections
  ALTER COLUMN reflection_encrypted DROP NOT NULL;

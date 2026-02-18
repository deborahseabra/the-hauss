-- ============================================================
-- Migration 016: Optional subhead (subtitle) on entries
-- ============================================================
ALTER TABLE entries
  ADD COLUMN IF NOT EXISTS subhead_encrypted BYTEA;

COMMENT ON COLUMN entries.subhead_encrypted IS 'Optional subtitle; encrypted like title_encrypted.';

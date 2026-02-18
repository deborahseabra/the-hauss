-- ============================================================
-- Migration 009: Add publication city and temperature to editions
-- Stores a snapshot of the city and temperature at publish time.
-- ============================================================

ALTER TABLE editions
  ADD COLUMN IF NOT EXISTS publication_city TEXT,
  ADD COLUMN IF NOT EXISTS publication_temperature NUMERIC;

-- ============================================================
-- Migration 006: Public edition sharing (cover/full)
-- ============================================================

ALTER TABLE editions
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_mode TEXT NOT NULL DEFAULT 'cover'
    CHECK (share_mode IN ('cover', 'full')),
  ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_editions_public_mode
  ON editions (is_public, share_mode, week_start DESC)
  WHERE is_public = true;

-- Public can read published editions
DROP POLICY IF EXISTS "Anyone can view public editions" ON editions;
CREATE POLICY "Anyone can view public editions"
  ON editions FOR SELECT
  USING (is_public = true);

-- Public can read edition_entries only for published editions
DROP POLICY IF EXISTS "Anyone can view edition_entries in public editions" ON edition_entries;
CREATE POLICY "Anyone can view edition_entries in public editions"
  ON edition_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM editions e
      WHERE e.id = edition_entries.edition_id
        AND e.is_public = true
    )
  );

-- Public can read entries included in public FULL-mode editions
DROP POLICY IF EXISTS "Anyone can view entries in public full editions" ON entries;
CREATE POLICY "Anyone can view entries in public full editions"
  ON entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM edition_entries ee
      JOIN editions e ON e.id = ee.edition_id
      WHERE ee.entry_id = entries.id
        AND e.is_public = true
        AND e.share_mode = 'full'
    )
  );

-- Public can read attachment metadata of entries in public FULL-mode editions
DROP POLICY IF EXISTS "Anyone can view attachments in public full editions" ON attachments;
CREATE POLICY "Anyone can view attachments in public full editions"
  ON attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM edition_entries ee
      JOIN editions e ON e.id = ee.edition_id
      WHERE ee.entry_id = attachments.entry_id
        AND e.is_public = true
        AND e.share_mode = 'full'
    )
  );

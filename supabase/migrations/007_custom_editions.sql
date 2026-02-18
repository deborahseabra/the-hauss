-- ============================================================
-- Migration 007: Custom editions for Publisher tier
-- ============================================================

-- New fields on editions for custom (Publisher-created) editions
ALTER TABLE editions
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_title TEXT,
  ADD COLUMN IF NOT EXISTS custom_week_at_glance JSONB;

-- edition_links: external recommendations (read, watch, listen, visit)
CREATE TABLE IF NOT EXISTS edition_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'read'
    CHECK (type IN ('read', 'watch', 'listen', 'visit')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edition_links_edition
  ON edition_links (edition_id, display_order);

-- RLS for edition_links
ALTER TABLE edition_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own edition_links"
  ON edition_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own edition_links"
  ON edition_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own edition_links"
  ON edition_links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own edition_links"
  ON edition_links FOR DELETE
  USING (auth.uid() = user_id);

-- Public can view edition_links for public editions
CREATE POLICY "Anyone can view edition_links in public editions"
  ON edition_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM editions e
      WHERE e.id = edition_links.edition_id
        AND e.is_public = true
    )
  );

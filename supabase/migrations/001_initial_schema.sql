-- ============================================================
-- THE HAUSS — Initial Database Schema
-- ============================================================
-- Run this migration in the Supabase SQL Editor or via CLI.
-- All user content is stored encrypted (AES-256-GCM) at the
-- application layer. BYTEA columns hold: [IV 16B][AuthTag 16B][Ciphertext].
-- ============================================================

-- ============================================================
-- 0. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. HELPER: updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. TABLES
-- ============================================================

-- 2.1 profiles ------------------------------------------------
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  avatar_url      TEXT,
  plan            TEXT NOT NULL DEFAULT 'free'
                    CHECK (plan IN ('free', 'pro', 'team')),
  publication_name TEXT NOT NULL DEFAULT 'Notebook',
  motto           TEXT NOT NULL DEFAULT 'All the life that''s fit to print',
  theme_mode      TEXT NOT NULL DEFAULT 'light'
                    CHECK (theme_mode IN ('light', 'dark')),
  theme_accent    TEXT NOT NULL DEFAULT 'red'
                    CHECK (theme_accent IN ('red', 'blue', 'green', 'purple')),
  timezone        TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS 'User profile and publication settings';

-- 2.2 entries --------------------------------------------------
CREATE TABLE entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title_encrypted BYTEA,
  body_encrypted  BYTEA NOT NULL,
  section         TEXT NOT NULL DEFAULT 'dispatch'
                    CHECK (section IN ('dispatch', 'essay', 'letter', 'review', 'photo')),
  mood            SMALLINT
                    CHECK (mood IS NULL OR mood BETWEEN 0 AND 4),
  is_public       BOOLEAN NOT NULL DEFAULT false,
  source          TEXT NOT NULL DEFAULT 'app'
                    CHECK (source IN ('app', 'telegram', 'whatsapp', 'api')),
  word_count      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE entries IS 'Journal entries with encrypted content';
COMMENT ON COLUMN entries.mood IS '0=Bright, 1=Calm, 2=Heavy, 3=Electric, 4=Reflective';
COMMENT ON COLUMN entries.body_encrypted IS 'AES-256-GCM: [IV 16B][AuthTag 16B][Ciphertext]';

-- 2.3 ai_edits -------------------------------------------------
CREATE TABLE ai_edits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id            UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mode                TEXT NOT NULL
                        CHECK (mode IN ('proofread', 'rewrite')),
  tone                TEXT
                        CHECK (tone IS NULL OR tone IN ('intimate', 'literary', 'journalistic')),
  original_encrypted  BYTEA NOT NULL,
  result_encrypted    BYTEA NOT NULL,
  headline_encrypted  BYTEA,
  subhead_encrypted   BYTEA,
  changes_count       INTEGER,
  applied             BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_edits IS 'History of AI editor operations on entries';

-- 2.4 editions -------------------------------------------------
CREATE TABLE editions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start          DATE NOT NULL,
  week_end            DATE NOT NULL,
  volume              INTEGER NOT NULL,
  number              INTEGER NOT NULL,
  entry_count         INTEGER NOT NULL DEFAULT 0,
  word_count          INTEGER NOT NULL DEFAULT 0,
  editorial_encrypted BYTEA,
  top_story_id        UUID REFERENCES entries(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT editions_user_week_unique UNIQUE (user_id, week_start),
  CONSTRAINT editions_week_range_valid CHECK (week_end > week_start)
);

COMMENT ON TABLE editions IS 'Weekly compiled editions';

-- 2.5 edition_entries ------------------------------------------
CREATE TABLE edition_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id      UUID NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  entry_id        UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  display_order   INTEGER NOT NULL DEFAULT 0,
  is_featured     BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT edition_entries_unique UNIQUE (edition_id, entry_id)
);

COMMENT ON TABLE edition_entries IS 'Many-to-many: which entries appear in which edition';

-- 2.6 attachments ----------------------------------------------
CREATE TABLE attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id        UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            TEXT NOT NULL
                    CHECK (type IN ('photo', 'location', 'link')),
  url             TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE attachments IS 'Photos, locations, and links attached to entries';

-- 2.7 reflections ----------------------------------------------
CREATE TABLE reflections (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period                  TEXT NOT NULL
                            CHECK (period IN ('week', 'month', 'quarter', 'all')),
  period_start            DATE NOT NULL,
  period_end              DATE NOT NULL,
  reflection_encrypted    BYTEA NOT NULL,
  connections             JSONB NOT NULL DEFAULT '[]',
  themes                  JSONB NOT NULL DEFAULT '[]',
  mood_data               JSONB NOT NULL DEFAULT '[]',
  stats                   JSONB NOT NULL DEFAULT '{}',
  questions               JSONB NOT NULL DEFAULT '[]',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT reflections_user_period_unique UNIQUE (user_id, period, period_start),
  CONSTRAINT reflections_period_range_valid CHECK (period_end >= period_start)
);

COMMENT ON TABLE reflections IS 'AI-generated reflections cached per period';

-- ============================================================
-- 3. INDEXES
-- ============================================================
CREATE INDEX idx_entries_user_created   ON entries (user_id, created_at DESC);
CREATE INDEX idx_entries_user_section   ON entries (user_id, section);
CREATE INDEX idx_entries_user_public    ON entries (user_id, is_public) WHERE is_public = true;
CREATE INDEX idx_entries_user_mood      ON entries (user_id, mood) WHERE mood IS NOT NULL;
CREATE INDEX idx_ai_edits_entry         ON ai_edits (entry_id);
CREATE INDEX idx_ai_edits_user          ON ai_edits (user_id);
CREATE INDEX idx_editions_user_week     ON editions (user_id, week_start DESC);
CREATE INDEX idx_edition_entries_edition ON edition_entries (edition_id);
CREATE INDEX idx_edition_entries_entry   ON edition_entries (entry_id);
CREATE INDEX idx_attachments_entry      ON attachments (entry_id);
CREATE INDEX idx_attachments_user       ON attachments (user_id);
CREATE INDEX idx_reflections_user_period ON reflections (user_id, period, period_start DESC);

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

-- 4.1 profiles -------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4.2 entries --------------------------------------------------
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entries"
  ON entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public entries"
  ON entries FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can insert own entries"
  ON entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
  ON entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
  ON entries FOR DELETE
  USING (auth.uid() = user_id);

-- 4.3 ai_edits ------------------------------------------------
ALTER TABLE ai_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai_edits"
  ON ai_edits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai_edits"
  ON ai_edits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai_edits"
  ON ai_edits FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ai_edits"
  ON ai_edits FOR DELETE
  USING (auth.uid() = user_id);

-- 4.4 editions -------------------------------------------------
ALTER TABLE editions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own editions"
  ON editions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own editions"
  ON editions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own editions"
  ON editions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own editions"
  ON editions FOR DELETE
  USING (auth.uid() = user_id);

-- 4.5 edition_entries ------------------------------------------
-- Secured via the edition's ownership (JOIN-based check)
ALTER TABLE edition_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own edition_entries"
  ON edition_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM editions
      WHERE editions.id = edition_entries.edition_id
        AND editions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own edition_entries"
  ON edition_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM editions
      WHERE editions.id = edition_entries.edition_id
        AND editions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own edition_entries"
  ON edition_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM editions
      WHERE editions.id = edition_entries.edition_id
        AND editions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own edition_entries"
  ON edition_entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM editions
      WHERE editions.id = edition_entries.edition_id
        AND editions.user_id = auth.uid()
    )
  );

-- 4.6 attachments ----------------------------------------------
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attachments"
  ON attachments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attachments"
  ON attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attachments"
  ON attachments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own attachments"
  ON attachments FOR DELETE
  USING (auth.uid() = user_id);

-- 4.7 reflections ----------------------------------------------
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reflections"
  ON reflections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reflections"
  ON reflections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reflections"
  ON reflections FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reflections"
  ON reflections FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 5. TRIGGERS
-- ============================================================

-- 5.1 Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5.2 Auto-update updated_at timestamps
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_entries
  BEFORE UPDATE ON entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_reflections
  BEFORE UPDATE ON reflections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 6. STORAGE
-- ============================================================

-- Create private bucket for user attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can only manage files in their own folder
CREATE POLICY "Users can upload own attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own attachments"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- DONE. Schema ready for The Hauss.
-- ============================================================

-- ============================================================
-- Migration 012: Letter to Self — scheduled open date + notifications
-- ============================================================
-- Letters can have an optional open_at date. Until that date,
-- the content is hidden. User gets email + in-app notification when it opens.

-- Add letter_open_at to entries (nullable, only meaningful when section = 'letter')
ALTER TABLE entries
  ADD COLUMN IF NOT EXISTS letter_open_at TIMESTAMPTZ;

COMMENT ON COLUMN entries.letter_open_at IS 'For section=letter: hide body/title until this datetime. Optional.';

CREATE INDEX IF NOT EXISTS idx_entries_letter_open_at
  ON entries (letter_open_at)
  WHERE letter_open_at IS NOT NULL;

-- Notifications table (in-app)
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            TEXT NOT NULL DEFAULT 'letter_opened'
                    CHECK (type IN ('letter_opened')),
  entry_id        UUID REFERENCES entries(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON notifications (user_id, read_at)
  WHERE read_at IS NULL;

COMMENT ON TABLE notifications IS 'In-app notifications (e.g. letter opened today)';

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- INSERT: only via service role (edge function); anon/authenticated cannot insert

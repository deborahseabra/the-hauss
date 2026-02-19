-- ============================================================
-- Migration 017: Reflections spec — ask_editor_log, usage_limits, content_json
-- ============================================================

-- 1. ask_editor_log — log Ask Your Editor usage for limits
CREATE TABLE IF NOT EXISTS ask_editor_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  response_json JSONB NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ask_editor_user_month ON ask_editor_log(user_id, created_at);

ALTER TABLE ask_editor_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ask_editor_log"
  ON ask_editor_log FOR SELECT USING (auth.uid() = user_id);

-- Insert only via service role (Edge Function)
CREATE POLICY "No insert for users on ask_editor_log"
  ON ask_editor_log FOR INSERT WITH CHECK (false);

COMMENT ON TABLE ask_editor_log IS 'Log of Ask Your Editor questions for usage limits';

-- 2. usage_limits — limits per role/feature (editable in Admin)
CREATE TABLE IF NOT EXISTS usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('reader', 'editor', 'publisher', 'admin')),
  feature TEXT NOT NULL,
  limit_value INTEGER NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('day', 'week', 'month')),
  UNIQUE(role, feature)
);

ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;

-- Only admins can read/update (via service role or is_admin())
CREATE POLICY "Admins can manage usage_limits"
  ON usage_limits FOR ALL USING (public.is_admin());

-- Seed initial limits
INSERT INTO usage_limits (role, feature, limit_value, period) VALUES
  ('reader', 'ask_editor', 0, 'month'),
  ('reader', 'ai_edits', 0, 'month'),
  ('reader', 'reflections_periods', 0, 'month'),
  ('editor', 'ask_editor', 10, 'month'),
  ('editor', 'ai_edits', -1, 'month'),
  ('editor', 'reflections_periods', -1, 'month'),
  ('publisher', 'ask_editor', 50, 'month'),
  ('publisher', 'ai_edits', -1, 'month'),
  ('publisher', 'reflections_periods', -1, 'month'),
  ('admin', 'ask_editor', -1, 'month'),
  ('admin', 'ai_edits', -1, 'month'),
  ('admin', 'reflections_periods', -1, 'month')
ON CONFLICT (role, feature) DO NOTHING;

COMMENT ON TABLE usage_limits IS 'Usage limits per role and feature; -1 = unlimited';

-- 3. reflections — add content_json and period_type for new spec (backward compatible)
ALTER TABLE reflections
  ADD COLUMN IF NOT EXISTS content_json JSONB,
  ADD COLUMN IF NOT EXISTS period_type TEXT CHECK (period_type IN ('week', 'month', 'quarter', 'year')),
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Map existing period 'all' -> 'year' for period_type
UPDATE reflections SET period_type = CASE period WHEN 'all' THEN 'year' ELSE period END WHERE period_type IS NULL;

COMMENT ON COLUMN reflections.content_json IS 'New spec: full reflection content (reflection, connections, themes, mood)';
COMMENT ON COLUMN reflections.period_type IS 'week | month | quarter | year (spec); mirrors period for legacy';

-- 4. RPC: get ask_editor usage for current user (used this month, limit from usage_limits by role)
CREATE OR REPLACE FUNCTION public.get_ask_editor_usage()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  user_role TEXT;
  lim INTEGER;
  period_start TIMESTAMPTZ;
  used_count INTEGER;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('used', 0, 'limit', 0, 'allowed', false);
  END IF;
  SELECT role INTO user_role FROM profiles WHERE id = uid;
  IF user_role IS NULL THEN
    user_role := 'reader';
  END IF;
  SELECT limit_value INTO lim FROM usage_limits WHERE usage_limits.role = user_role AND feature = 'ask_editor';
  IF lim IS NULL THEN
    lim := 0;
  END IF;
  IF lim = -1 THEN
    RETURN jsonb_build_object('used', 0, 'limit', -1, 'allowed', true);
  END IF;
  period_start := date_trunc('month', now())::timestamptz;
  SELECT count(*)::INTEGER INTO used_count FROM ask_editor_log WHERE user_id = uid AND created_at >= period_start;
  RETURN jsonb_build_object(
    'used', used_count,
    'limit', lim,
    'allowed', used_count < lim
  );
END;
$$;

COMMENT ON FUNCTION public.get_ask_editor_usage() IS 'Returns ask_editor usage for current user (used, limit, allowed) for the current month';

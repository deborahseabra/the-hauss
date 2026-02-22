-- ============================================================
-- Migration 021: Rename role "reader" to "writer"
-- ============================================================
-- Updates profiles, usage_limits, and get_ask_editor_usage.
-- Do not modify already-applied migrations 003 or 017.

-- 1. profiles: drop old CHECK, update data, then add new CHECK and default
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

UPDATE profiles SET role = 'writer' WHERE role = 'reader';

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'writer', 'editor', 'publisher'));

ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'writer';

-- 2. usage_limits: drop old CHECK, update data, then add new CHECK
ALTER TABLE usage_limits DROP CONSTRAINT IF EXISTS usage_limits_role_check;

UPDATE usage_limits SET role = 'writer' WHERE role = 'reader';

ALTER TABLE usage_limits ADD CONSTRAINT usage_limits_role_check
  CHECK (role IN ('writer', 'editor', 'publisher', 'admin'));

-- 3. get_ask_editor_usage: fallback role writer
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
    user_role := 'writer';
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

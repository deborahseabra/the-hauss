-- ============================================================
-- Migration 023: Referral code — alphanumeric only (min 6 chars, no name)
-- ============================================================

-- 1) Replace make_referral_code with alphanumeric-only generator (8 chars from a-z0-9)
CREATE OR REPLACE FUNCTION public.make_referral_code(base_name TEXT DEFAULT NULL, user_uuid UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  candidate TEXT;
  i INT;
  tries INTEGER := 0;
BEGIN
  LOOP
    candidate := '';
    FOR i IN 1..8 LOOP
      candidate := candidate || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = candidate);
    tries := tries + 1;
    EXIT WHEN tries > 30;
  END LOOP;

  IF candidate = '' OR EXISTS (SELECT 1 FROM profiles WHERE referral_code = candidate) THEN
    candidate := encode(gen_random_bytes(4), 'hex');
  END IF;

  RETURN candidate;
END;
$$;

-- 2) Backfill: set all existing profiles to a new unique alphanumeric code
DO $$
DECLARE
  r RECORD;
  new_code TEXT;
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  i INT;
  attempt INT;
  done BOOLEAN;
BEGIN
  FOR r IN SELECT id FROM profiles LOOP
    done := FALSE;
    FOR attempt IN 1..50 LOOP
      new_code := '';
      FOR i IN 1..8 LOOP
        new_code := new_code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
      END LOOP;
      IF NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = new_code) THEN
        UPDATE profiles SET referral_code = new_code WHERE id = r.id;
        done := TRUE;
        EXIT;
      END IF;
    END LOOP;
    IF NOT done THEN
      new_code := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
      UPDATE profiles SET referral_code = new_code WHERE id = r.id;
    END IF;
  END LOOP;
END;
$$;

-- 3) handle_new_user: keep calling make_referral_code (now ignores name/uuid for format)
-- No change needed: make_referral_code(NULL, NEW.id) or make_referral_code(v_name, NEW.id) still works; we just ignore the args for the new format.

COMMENT ON FUNCTION public.make_referral_code(TEXT, UUID) IS 'Returns a unique 8-char alphanumeric referral code (a-z0-9). Arguments kept for API compatibility but not used.';

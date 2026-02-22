-- ============================================================
-- Migration 022: Refer-a-Friend (RAF)
-- ============================================================

-- 1) profiles fields for referrals
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_code TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_referral_code_key'
      AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);
  END IF;
END
$$;

-- 2) referrals tracking table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'signed_up' CHECK (status IN ('signed_up', 'converted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_at TIMESTAMPTZ,
  UNIQUE (referrer_id, referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);

-- 3) helper for deterministic-ish + unique referral code generation
CREATE OR REPLACE FUNCTION public.make_referral_code(base_name TEXT, user_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slug TEXT;
  candidate TEXT;
  tries INTEGER := 0;
BEGIN
  slug := left(regexp_replace(lower(coalesce(base_name, 'user')), '[^a-z0-9]', '', 'g'), 10);
  IF slug = '' THEN
    slug := 'user';
  END IF;

  LOOP
    tries := tries + 1;
    IF tries = 1 THEN
      candidate := slug || '-' || substr(replace(user_uuid::text, '-', ''), 1, 4);
    ELSE
      candidate := slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);
    END IF;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = candidate);
    EXIT WHEN tries > 20;
  END LOOP;

  IF candidate IS NULL OR EXISTS (SELECT 1 FROM profiles WHERE referral_code = candidate) THEN
    candidate := slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  END IF;

  RETURN candidate;
END;
$$;

-- Backfill existing profiles
UPDATE profiles p
SET referral_code = public.make_referral_code(coalesce(p.name, split_part(p.email, '@', 1)), p.id)
WHERE p.referral_code IS NULL;

ALTER TABLE profiles
  ALTER COLUMN referral_code SET NOT NULL;

-- 4) handle_new_user now sets referral fields and tracks signed_up referrals
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_referred_raw TEXT;
  v_referred_by UUID;
  v_referral_code TEXT;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  v_referral_code := public.make_referral_code(v_name, NEW.id);

  v_referred_raw := NEW.raw_user_meta_data->>'referred_by_id';
  v_referred_by := NULL;
  IF v_referred_raw IS NOT NULL
     AND v_referred_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    v_referred_by := v_referred_raw::UUID;
  END IF;

  IF v_referred_by = NEW.id THEN
    v_referred_by := NULL;
  END IF;

  IF v_referred_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_referred_by) THEN
    v_referred_by := NULL;
  END IF;

  INSERT INTO public.profiles (id, name, email, city, referral_code, referred_by)
  VALUES (
    NEW.id,
    v_name,
    NEW.email,
    NEW.raw_user_meta_data->>'city',
    v_referral_code,
    v_referred_by
  );

  IF v_referred_by IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, status)
    VALUES (v_referred_by, NEW.id, 'signed_up')
    ON CONFLICT (referrer_id, referred_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 5) convert referral status when referred user upgrades to editor/publisher
CREATE OR REPLACE FUNCTION public.handle_referral_conversion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'writer'
     AND NEW.role IN ('editor', 'publisher')
     AND NEW.referred_by IS NOT NULL THEN
    UPDATE referrals
      SET status = 'converted',
          converted_at = coalesce(converted_at, now())
    WHERE referred_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_role_updated_referral ON profiles;
CREATE TRIGGER on_profile_role_updated_referral
AFTER UPDATE OF role ON profiles
FOR EACH ROW
WHEN (OLD.role IS DISTINCT FROM NEW.role)
EXECUTE FUNCTION public.handle_referral_conversion();

-- Backfill conversion for already-upgraded referred users
UPDATE referrals r
SET status = 'converted',
    converted_at = coalesce(r.converted_at, now())
FROM profiles p
WHERE r.referred_id = p.id
  AND p.role IN ('editor', 'publisher');

-- 6) API RPCs
CREATE OR REPLACE FUNCTION public.referral_me()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  my_code TEXT;
  my_count INTEGER;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('referral_code', NULL, 'referral_count', 0);
  END IF;

  SELECT referral_code INTO my_code
  FROM profiles
  WHERE id = uid;

  SELECT count(*)::INTEGER INTO my_count
  FROM referrals
  WHERE referrer_id = uid;

  RETURN jsonb_build_object(
    'referral_code', my_code,
    'referral_count', coalesce(my_count, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.referral_resolve(code TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM profiles
  WHERE referral_code = lower(trim(code))
  LIMIT 1
$$;

COMMENT ON FUNCTION public.referral_me() IS 'Returns current user referral code and joined referrals count';
COMMENT ON FUNCTION public.referral_resolve(TEXT) IS 'Resolves a referral code into a referrer profile id';

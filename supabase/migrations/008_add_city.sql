-- ============================================================
-- Migration 008: Add city to profiles for publication location
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS city TEXT;

-- Update handle_new_user to set city from user_metadata at signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, city)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'city'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

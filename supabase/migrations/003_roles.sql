-- ============================================================
-- Migration 003: Role-based tier system + is_tester flag
-- ============================================================

-- 1. Add new columns
ALTER TABLE profiles
  ADD COLUMN role TEXT NOT NULL DEFAULT 'reader'
    CHECK (role IN ('admin', 'reader', 'editor', 'publisher')),
  ADD COLUMN is_tester BOOLEAN NOT NULL DEFAULT false;

-- 2. Migrate existing plan data to role
UPDATE profiles SET role = 'editor' WHERE plan = 'pro';
UPDATE profiles SET role = 'publisher' WHERE plan = 'team';
UPDATE profiles SET role = 'admin' WHERE is_master = true;

-- 3. Drop the plan column (and its CHECK constraint)
ALTER TABLE profiles DROP COLUMN plan;

-- 4. Helper functions (SECURITY DEFINER bypasses RLS, avoids infinite recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_my_is_tester()
RETURNS boolean AS $$
  SELECT is_tester FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_my_is_master()
RETURNS boolean AS $$
  SELECT is_master FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 5. RLS: replace update policy to prevent users from self-promoting
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = public.get_my_role()
    AND is_tester = public.get_my_is_tester()
    AND is_master = public.get_my_is_master()
  );

-- 6. Admin-wide read policy for profiles (admin panel)
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (public.is_admin());

-- 7. Admin-wide read policy for entries (dashboard queries)
CREATE POLICY "Admins can view all entries" ON entries
  FOR SELECT USING (public.is_admin());

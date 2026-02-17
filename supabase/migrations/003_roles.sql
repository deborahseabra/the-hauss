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

-- 4. RLS: replace update policy to prevent users from self-promoting
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    AND is_tester = (SELECT is_tester FROM profiles WHERE id = auth.uid())
    AND is_master = (SELECT is_master FROM profiles WHERE id = auth.uid())
  );

-- 5. Admin-wide read policy for profiles (admin panel)
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 6. Admin-wide read policy for entries (dashboard queries)
CREATE POLICY "Admins can view all entries" ON entries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

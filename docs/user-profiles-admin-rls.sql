-- Admins need to read and update every user_profiles row regardless
-- of status — otherwise the /admin/members page can't see pending
-- registrations (the existing "Public profiles are viewable by
-- everyone" policy filters on status = 'active', so pending and
-- suspended rows are invisible to the admin UI through the browser
-- client).
--
-- Apply via the Supabase SQL editor; idempotent.

DROP POLICY IF EXISTS "Editors and admins can read all user_profiles" ON user_profiles;
CREATE POLICY "Editors and admins can read all user_profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles me
      WHERE me.id = auth.uid()
        AND me.role IN ('editor', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update any user_profile" ON user_profiles;
CREATE POLICY "Admins can update any user_profile" ON user_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles me
      WHERE me.id = auth.uid()
        AND me.role = 'admin'
    )
  );

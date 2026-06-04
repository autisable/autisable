-- Fix for the recursive RLS that the earlier user-profiles-admin-rls.sql
-- migration introduced. The original policies did EXISTS (SELECT ...
-- FROM user_profiles ...) inside policies on user_profiles, which makes
-- Postgres detect infinite recursion and refuse the query — Joel lost
-- admin access because the admin-role lookup couldn't complete.
--
-- Canonical Supabase fix: do the role check in a SECURITY DEFINER
-- function. The function runs as its owner (postgres), bypassing RLS,
-- so the policy can call it without triggering itself.
--
-- Apply via the Supabase SQL editor; idempotent.

-- Drop the broken policies first.
DROP POLICY IF EXISTS "Editors and admins can read all user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any user_profile" ON user_profiles;

-- Helper functions that read role without going through RLS. STABLE so
-- Postgres can cache within a single query; SET search_path = public
-- pins schema lookups for safety (recommended pattern for any function
-- marked SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_editor_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
      AND role IN ('editor', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- Re-add the admin SELECT/UPDATE policies, now using the helpers so
-- they don't recurse.
DROP POLICY IF EXISTS "Editors and admins can read all user_profiles v2" ON user_profiles;
CREATE POLICY "Editors and admins can read all user_profiles v2" ON user_profiles
  FOR SELECT USING (public.current_user_is_editor_or_admin());

DROP POLICY IF EXISTS "Admins can update any user_profile v2" ON user_profiles;
CREATE POLICY "Admins can update any user_profile v2" ON user_profiles
  FOR UPDATE USING (public.current_user_is_admin());

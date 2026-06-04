-- Auto-create user_profiles row on signup, atomically with the
-- auth.users insert. Replaces the client-side /api/auth/create-profile
-- call, which was fragile in two ways:
--   1. No error surfacing — `await fetch(...)` ignored failures, so
--      a 500 produced "Application Received" with no row in the DB.
--   2. Potential FK race — the auth user may not be visible to the
--      service-role insert in the moments after signup.
--
-- This trigger fires inside the same transaction as the auth user
-- insert, so the row always lands and the profile is guaranteed.
--
-- Also backfills any orphaned auth.users that don't yet have a
-- profile row — picks up Joel's earlier test accounts that fell
-- through the cracks.
--
-- Apply via the Supabase SQL editor; idempotent.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name, status, role, date_of_birth)
  VALUES (
    NEW.id,
    NEW.email,
    -- display_name comes from the metadata the register form sends
    -- via supabase.auth.signUp({ options: { data: { display_name }}}).
    -- Fall back to the email prefix so we never end up with NULL.
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    -- New accounts always land in pending_approval; admins flip
    -- to active via /admin/members.
    'pending_approval',
    'member',
    NULLIF(NEW.raw_user_meta_data->>'date_of_birth', '')::date
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: every auth.users without a profile gets one. Same fields,
-- same defaults. Done after the trigger so future inserts use the
-- trigger path; this just cleans up what's already there.
INSERT INTO public.user_profiles (id, email, display_name, status, role, date_of_birth)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)),
  'pending_approval',
  'member',
  NULLIF(u.raw_user_meta_data->>'date_of_birth', '')::date
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.id = u.id
WHERE p.id IS NULL
  AND u.email IS NOT NULL
ON CONFLICT (id) DO NOTHING;

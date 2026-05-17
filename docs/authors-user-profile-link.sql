-- Unify authors with user_profiles.
--
-- Background: the `authors` table holds blog-post byline metadata
-- (display name, bio, avatar, social links). It's separate from
-- `user_profiles` (member identity). When a member edits their member
-- profile, their byline doesn't update — and vice versa. This was
-- fine when most authors were external (RSS bloggers, syndicated
-- contributors) but breaks the "member submits content for editors"
-- flow: the member's profile edits never reach their byline.
--
-- Strategy: keep `authors` as the byline source of truth so external
-- authors continue to work, but add a `user_profile_id` link so
-- member-authors can have their byline rendered from the live
-- user_profile. Resolve-at-read in the blog template: if linked, the
-- byline fields (display_name, bio, avatar, socials) come from
-- user_profiles; if not, from authors.
--
-- Apply via the Supabase SQL editor; idempotent.

ALTER TABLE authors
  ADD COLUMN IF NOT EXISTS user_profile_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_authors_user_profile ON authors(user_profile_id);

-- Backfill: link each unlinked author to a user_profile when there's
-- exactly one display_name match (case-insensitive, trimmed). If two
-- members share a display name we skip — manual linking via the admin
-- UI is safer than a coin flip.
UPDATE authors a
SET user_profile_id = up.id
FROM user_profiles up
WHERE a.user_profile_id IS NULL
  AND LOWER(TRIM(up.display_name)) = LOWER(TRIM(a.display_name))
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles up2
    WHERE up2.id <> up.id
      AND LOWER(TRIM(up2.display_name)) = LOWER(TRIM(a.display_name))
  )
  AND NOT EXISTS (
    SELECT 1 FROM authors a2
    WHERE a2.id <> a.id
      AND a2.user_profile_id = up.id
  );

-- The existing schema only had a SELECT policy on `authors`. Admin
-- edits via the browser client were silently being rejected by RLS
-- and the admin/authors page never noticed because it didn't .select()
-- after the update. Add explicit ALL policy for editor+ roles so edits
-- actually persist.
DROP POLICY IF EXISTS "Editors can manage authors" ON authors;
CREATE POLICY "Editors can manage authors" ON authors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('editor', 'admin')
    )
  );

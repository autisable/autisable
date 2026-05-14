-- Adds visibility to status updates so the composer can scope a post to
-- "All Members" (default) or "Followers Only". Mirrors the existing
-- journal_entries.visibility model — same semantics, same defaults.
-- Idempotent.

ALTER TABLE activity_feed
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'all_members'
  CHECK (visibility IN ('all_members', 'followers'));

-- Backfills any pre-existing rows to 'all_members' (matches the column
-- default; explicit UPDATE so re-runs are safe even on rows that ended
-- up NULL through some other path).
UPDATE activity_feed SET visibility = 'all_members' WHERE visibility IS NULL;

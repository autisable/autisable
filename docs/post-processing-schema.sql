-- Autisable Post Processing Agent (APPA) — Phase 1 schema.
--
-- Stores the agent's per-post output. Phase 1 scope is the indexation
-- pillar; Phase 2 (priority_score + eeat_flags) is reserved in the
-- schema so we don't need a destructive migration when those land.
--
-- Apply via the Supabase SQL editor; idempotent.

CREATE TABLE IF NOT EXISTS post_processing_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,

  -- Indexation pillar (Phase 1)
  canonical_present BOOLEAN,
  canonical_correct BOOLEAN,                -- "correct" = self-canonical for owned content,
                                            -- canonical-to-origin for syndicated.
  canonical_url TEXT,                       -- what we observed at check time
  syndication_canonical_source TEXT
    CHECK (syndication_canonical_source IN ('autisable', 'origin', 'missing', 'not_applicable')),
  sitemap_present BOOLEAN,                  -- URL is included in /sitemap.xml
  gsc_indexed BOOLEAN,                      -- NULL = unknown (GSC API not configured)
  gsc_indexed_checked_at TIMESTAMPTZ,
  wayback_archived BOOLEAN,                 -- snapshot exists on web.archive.org
  wayback_snapshot_url TEXT,

  -- Priority + EEAT pillars (Phase 2 — reserved, not populated yet)
  priority_score INT CHECK (priority_score IS NULL OR (priority_score BETWEEN 0 AND 100)),
  priority_reasons TEXT[],
  eeat_flags TEXT[],

  -- Editor override. The agent advises; the editor decides. Any non-null
  -- override field takes precedence in UI badging.
  override_status TEXT CHECK (override_status IN ('ok', 'needs_attention', 'ignored') OR override_status IS NULL),
  override_note TEXT,
  override_by UUID REFERENCES auth.users(id),
  override_at TIMESTAMPTZ,

  checked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- We only keep the latest check per post — re-running overwrites. If we
  -- ever want history, drop this constraint and rely on checked_at desc.
  UNIQUE (post_id)
);

CREATE INDEX IF NOT EXISTS idx_post_processing_log_post ON post_processing_log(post_id);
CREATE INDEX IF NOT EXISTS idx_post_processing_log_checked ON post_processing_log(checked_at DESC);

ALTER TABLE post_processing_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read post_processing_log" ON post_processing_log;
CREATE POLICY "Admins can read post_processing_log" ON post_processing_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('editor', 'admin'))
  );

DROP POLICY IF EXISTS "Admins can manage post_processing_log" ON post_processing_log;
CREATE POLICY "Admins can manage post_processing_log" ON post_processing_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('editor', 'admin'))
  );

-- Scoring weights live in the database so Phase 2 tuning doesn't need a
-- code deploy. Pre-seeded with the suggested weights from the spec; admins
-- update via /admin/post-processing → Settings (Phase 2).
CREATE TABLE IF NOT EXISTS post_processing_weights (
  key TEXT PRIMARY KEY,
  weight INT NOT NULL DEFAULT 0,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO post_processing_weights (key, weight, description) VALUES
  ('seasonal_relevance',       30, 'Post tags + publish date vs. calendar events'),
  ('trending_topic',           50, 'Google Trends / GSC query match'),
  ('audience_alignment',       30, 'Post category + tag taxonomy match'),
  ('syndicated_partner',       50, 'Author/source is from a partner feed'),
  ('marabio_alignment',        50, 'Keyword match against MARAbio topic list'),
  ('affiliate_ready',          25, 'Tag match against affiliate trigger taxonomy'),
  ('internal_link_opportunity', 15, 'Topic overlap with existing post inventory'),
  ('age_and_traffic',          30, 'GSC + GA4 signal on existing performance')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE post_processing_weights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read post_processing_weights" ON post_processing_weights;
CREATE POLICY "Admins can read post_processing_weights" ON post_processing_weights
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('editor', 'admin'))
  );

DROP POLICY IF EXISTS "Admins can manage post_processing_weights" ON post_processing_weights;
CREATE POLICY "Admins can manage post_processing_weights" ON post_processing_weights
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('editor', 'admin'))
  );

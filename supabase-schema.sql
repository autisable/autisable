-- Autisable Database Schema
-- Run this in Supabase SQL Editor to set up all tables

-- Site Settings (key-value config)
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Navigation Links
CREATE TABLE IF NOT EXISTS nav_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  is_external BOOLEAN DEFAULT FALSE,
  is_visible BOOLEAN DEFAULT TRUE,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  date_of_birth DATE,
  location TEXT,
  pronouns TEXT,
  website TEXT,
  social_twitter TEXT,
  social_facebook TEXT,
  social_instagram TEXT,
  social_linkedin TEXT,
  social_youtube TEXT,
  social_tiktok TEXT,
  cover_photo_url TEXT, -- profile hub banner image
  self_id_tags TEXT[], -- subset of: 'parent_guardian', 'neurodiverse', 'professional'
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'contributor', 'moderator', 'admin')),
  status TEXT DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'active', 'suspended', 'removed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog Posts
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  excerpt TEXT,
  image TEXT,
  category TEXT,
  tags TEXT[], -- Free-form tags (comma-separated in editor); used for /blog/?tag=… filtering and SEO keywords fallback. Added by scripts/migrate-tags.ts.
  date TIMESTAMPTZ DEFAULT NOW(),
  date_modified TIMESTAMPTZ,
  read_time TEXT,
  author_name TEXT,
  author_id UUID REFERENCES authors(id), -- production references authors(id), not user_profiles(id)
  meta_title TEXT,
  meta_description TEXT,
  og_image TEXT,
  focus_keyword TEXT, -- Yoast-style focus keyphrase, added by scripts/migrate-yoast-keywords.ts
  keywords TEXT[],    -- Additional keyphrases (Yoast premium parity)
  is_published BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  featured_position INT,
  is_syndicated BOOLEAN DEFAULT FALSE,
  canonical_url TEXT,
  draft_status TEXT, -- in_progress | pending_review | ready_for_scheduling | rejected | trash | NULL
  comments_enabled BOOLEAN DEFAULT TRUE, -- editor toggle: hide comments section on a per-post basis
  submitted_by_user_id UUID REFERENCES auth.users(id), -- M6: who originally submitted this for review (member-submitted journals); used to email approve/reject/published notifications back to them
  rejection_reason TEXT, -- M6: editor-supplied reason when draft_status flips to rejected; included in rejection email
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- M6: also add as ALTERs so existing deployments pick them up without recreating the table
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS submitted_by_user_id UUID REFERENCES auth.users(id);
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
-- L7: trace blog posts back to the journal entry that was submitted to create them.
-- Used by the editorial-decision flow to sync submission_status back so the
-- author's journal entry unlocks (returned/published) instead of being stuck
-- in "submitted" forever after an editor acts.
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS source_journal_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL;

-- Podcast Episodes
CREATE TABLE IF NOT EXISTS podcast_episodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  show_slug TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  duration TEXT,
  audio_url TEXT,
  embed_url TEXT,
  image TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(show_slug, slug)
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page TEXT NOT NULL,
  name TEXT NOT NULL,
  comment TEXT NOT NULL,
  likes INT DEFAULT 0,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  is_approved BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL DEFAULT '',
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'followers', 'all_members')),
  submission_status TEXT CHECK (submission_status IN ('none', 'submitted', 'under_review', 'approved', 'published', 'returned')),
  comments_allowed BOOLEAN DEFAULT TRUE, -- member toggle for their own followers/public entries; private entries ignore this
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Feed
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT, -- L2/Q8: optional image attached to a status update
  type TEXT DEFAULT 'post' CHECK (type IN ('post', 'journal')),
  source_id UUID,
  reactions_count INT DEFAULT 0,
  replies_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Follows
CREATE TABLE IF NOT EXISTS follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows are publicly readable" ON follows FOR SELECT USING (true);
CREATE POLICY "Members can follow on their own behalf" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Members can unfollow on their own behalf" ON follows FOR DELETE USING (auth.uid() = follower_id);

-- Feed reactions (likes on community feed items)
CREATE TABLE IF NOT EXISTS feed_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_item_id UUID NOT NULL,
  feed_item_type TEXT NOT NULL CHECK (feed_item_type IN ('activity', 'journal')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction TEXT DEFAULT 'like' CHECK (reaction IN ('like')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(feed_item_id, feed_item_type, user_id, reaction)
);
ALTER TABLE feed_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reactions readable by members" ON feed_reactions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Members can react on own behalf" ON feed_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members can remove own reactions" ON feed_reactions FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_feed_reactions_item ON feed_reactions(feed_item_id, feed_item_type);

-- Feed replies (threaded comments on community feed items)
CREATE TABLE IF NOT EXISTS feed_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_item_id UUID NOT NULL,
  feed_item_type TEXT NOT NULL CHECK (feed_item_type IN ('activity', 'journal')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE feed_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Replies readable by members" ON feed_replies FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Members can reply on own behalf" ON feed_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members can delete own replies" ON feed_replies FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_feed_replies_item ON feed_replies(feed_item_id, feed_item_type, created_at);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Newsletter Subscribers
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  unsubscribe_token TEXT UNIQUE,
  unsubscribed_at TIMESTAMPTZ,
  unsubscribe_reason TEXT,
  email_frequency TEXT DEFAULT 'all',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Messages
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  reason TEXT,
  message TEXT NOT NULL,
  resolved_at TIMESTAMPTZ, -- M5: when an admin marked this as actioned (null = open)
  resolved_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS resolved_by_user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_open ON contact_messages(created_at DESC) WHERE resolved_at IS NULL;

-- Authors (separate from user_profiles; created during WP migration via scripts/migrate-authors.ts)
-- blog_posts.author_id and rss_feeds.author_id both reference this table.
CREATE TABLE IF NOT EXISTS authors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wp_user_id TEXT,
  display_name TEXT NOT NULL,
  bio TEXT,
  website TEXT,
  twitter TEXT,
  facebook TEXT,
  instagram TEXT,
  linkedin TEXT,
  youtube TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(display_name)
);
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authors are viewable by everyone" ON authors FOR SELECT USING (true);

-- RSS Feeds
CREATE TABLE IF NOT EXISTS rss_feeds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_polled TIMESTAMPTZ,
  author_id UUID REFERENCES authors(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSS Queue (items imported from feeds, pending review)
CREATE TABLE IF NOT EXISTS rss_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_id UUID REFERENCES rss_feeds(id),
  feed_name TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  excerpt TEXT,
  source_url TEXT UNIQUE NOT NULL,
  published_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  assigned_author_id UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSS Feed Errors
CREATE TABLE IF NOT EXISTS rss_feed_errors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_id UUID REFERENCES rss_feeds(id),
  error TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSS tables: admin-only via the user_profiles.role check.
-- The cron poller writes via the service role and bypasses RLS.
ALTER TABLE rss_feeds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read rss_feeds" ON rss_feeds FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin')
);
CREATE POLICY "Admins can insert rss_feeds" ON rss_feeds FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin')
);
CREATE POLICY "Admins can update rss_feeds" ON rss_feeds FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin')
);
CREATE POLICY "Admins can delete rss_feeds" ON rss_feeds FOR DELETE USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin')
);

ALTER TABLE rss_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read rss_queue" ON rss_queue FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin')
);
CREATE POLICY "Admins can insert rss_queue" ON rss_queue FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin')
);
CREATE POLICY "Admins can update rss_queue" ON rss_queue FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin')
);
CREATE POLICY "Admins can delete rss_queue" ON rss_queue FOR DELETE USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin')
);

ALTER TABLE rss_feed_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read rss_feed_errors" ON rss_feed_errors FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin')
);

-- Moderation Reports
CREATE TABLE IF NOT EXISTS moderation_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES auth.users(id),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  moderator_id UUID REFERENCES auth.users(id),
  moderator_action TEXT,
  moderator_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- Row Level Security Policies

-- User profiles: users can read all active profiles, update their own
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON user_profiles FOR SELECT USING (status = 'active');
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Journal entries: users can only see their own private entries
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own journal entries" ON journal_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Members can see shared journal entries" ON journal_entries FOR SELECT USING (visibility IN ('followers', 'all_members'));

-- Comments: anyone can read, authenticated users can insert
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are viewable by everyone" ON comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can post comments" ON comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Activity feed: viewable by authenticated users
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Feed is viewable by authenticated users" ON activity_feed FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can post to feed" ON activity_feed FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notifications: users can only see their own
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Blog posts: published posts are public; admins can do everything
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published posts are viewable by everyone" ON blog_posts FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can read all posts" ON blog_posts FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin')
);
CREATE POLICY "Admins can insert posts" ON blog_posts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin')
);
CREATE POLICY "Admins can update posts" ON blog_posts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin')
);
CREATE POLICY "Admins can delete posts" ON blog_posts FOR DELETE USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(is_published, date DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_comments_page ON comments(page);
CREATE INDEX IF NOT EXISTS idx_journal_user ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_rss_queue_status ON rss_queue(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);

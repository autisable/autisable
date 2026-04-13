# Autisable — Platform Requirements

---

## 1. Vision & Identity

### 1.1 What Autisable Is

Autisable.com has been a home for the autism community since 2008 — one of the longest-running independent platforms dedicated to open, honest conversation about autism. It serves parents, autistic individuals, professionals, advocates, and allied organizations. It is not a clinical resource. It is not a news aggregator. It is a community: a place where people connected by autism can tell their own stories, find each other, and talk about difficult things without being shut down.

The platform is free to join. Every member receives the same full access to the community — journal, social feed, profiles, help center, and all editorial content. Patron tiers through Patreon offer additional benefits for those who choose to support the platform, phased in after launch.

The rebuild is not a cosmetic refresh. It is a complete replacement of the technical foundation to match what the platform has always aspired to be: fast, safe, modern, and genuinely useful to a community that deserves better than an aging WordPress installation.

### 1.2 The Triangle Puzzle Piece

The Autisable logo is a triangle puzzle piece. The designer must understand and honor its specific meaning before touching anything visual.

The standard puzzle piece carries significant negative history in the autism community — long associated with the idea that autistic people are incomplete or need to be solved. That is not what Autisable's logo means. The triangle puzzle piece represents the community itself: every person a piece that belongs, and the complete picture only possible when they come together. It is about wholeness, not absence.

The logo evolves — cleaner, more contemporary — but is never abandoned. If a logo refinement is in scope, Joel approves it before any other design work proceeds. The meaning must be communicated wherever the logo appears: a brand tagline, an about page, an onboarding screen. The visual direction reinforces pieces fitting together, community forming a whole. Never a missing piece. Never incompleteness.

### 1.3 Community Philosophy — The Autcraft Model

The guiding model for how this community operates is drawn from Autcraft — Stuart Duncan's Minecraft server for autistic children and their families, widely regarded as the gold standard for autism-specific community safety. These principles are values translated into policy, reflected in every design and technical decision:

- Moderation prevents situations — it does not punish people. Gentle guidance before any action taken.
- No private staff-to-member conversations. All staff interaction is visible within the community.
- Rules are stated in plain language, enforced through reminders, not sanctions.
- The community earns trust through demonstrated behavior, not applications.
- Difficult topics are discussed openly. That is the point of the platform.
- The space is safe because it is designed to be — not because it relies on users to self-police.
- Recognition and celebration are built into the community — milestones, spotlights, earned roles.
- When things go wrong, the community collaborates with the person to understand and explain — not to exclude.

### 1.4 The Social Media Flagging Problem

Autism parenting and advocacy content is routinely auto-flagged by social media platforms. Topics that are entirely legitimate — medical decisions, behavioral interventions, mental health, caregiving — share keyword patterns with content those platforms suppress for unrelated reasons. This affects Autisable's ability to share its own content and its members' ability to discuss these topics freely.

The new platform addresses this at two levels. Public-facing content carries precise Open Graph metadata, structured data, and clean canonical URLs — posts shared to social media always include headline, excerpt, and featured image via Metricool's automated posting, never a bare URL. Behind the membership wall, private content is architecturally invisible to external platforms. Journal entries, social feed posts, and member comments have no public URL for any algorithm to scan. What happens inside the wall cannot be flagged because it cannot be seen.

---

## 2. Technical Stack

### 2.1 Stack Overview

WordPress and GoDaddy hosting are replaced entirely. No WordPress installation remains in the production architecture. The new stack is purpose-built for Autisable's actual needs: a fast editorial platform, a safe member community, automated content syndication, a sustainable monetization layer, and marketing and outreach infrastructure — all on modern, maintainable, scalable services.

### 2.2 Why Each Tool Was Chosen

**Sanity (CMS)**

Sanity is the strongest Next.js/Vercel CMS available. The editorial dashboard — Sanity Studio — is a clean React interface that is genuinely easier to learn than WordPress admin for a single editor. Content schemas are defined in code by the programmer once, then managed by Joel through the Studio UI without further developer involvement. Content updates to the live site via Incremental Static Regeneration take under 60 seconds. The free tier covers Autisable's scale at launch indefinitely for a single editor.

Sanity includes a free internal Editorial Notes field added to every post document schema — a plain text area visible only inside Sanity Studio, never rendered publicly. This gives Joel and any future editors a place to leave notes, feedback, or instructions on any post during the review and editing process. It covers the occasional editorial collaboration use case at zero additional cost. If the editorial team grows to the point where inline field comments with @mentions and resolution threads are needed, Sanity Growth at $15/seat/month adds that capability — but this is deferred until the team actually grows.

Sanity AI Assist is a native Sanity Studio plugin that automates SEO field population directly inside the editorial interface — replacing the current Make.com + OpenAI + Yoast workflow with a single integrated tool. The programmer installs and configures it during Phase 1 Studio setup at no additional Sanity cost. Joel connects the existing OpenAI API key in Sanity Studio settings once. Thereafter, when writing or editing any post, a single button press auto-populates: meta title, meta description, focus keyword, Open Graph title, Open Graph description, post excerpt, and suggested category tags — all generated from the post content and editable before publishing. Joel reviews and adjusts, then publishes. No switching tools, no checking whether automation fired correctly, no silent failures.

Sanity supports scheduled publishing natively — a post can be written at any time and set to publish automatically at a specific future date and time. Joel targets 3–4 published posts per day. The programmer configures the @sanity/scheduled-publishing plugin during Phase 1 Studio setup. This is a free Sanity plugin requiring no additional cost. Scheduled posts trigger the same ISR update, Metricool RSS pickup, and Resend newsletter broadcast as immediate publishes — the full automation pipeline fires on schedule without Joel needing to be present.

**Clerk (Authentication)**

Clerk is purpose-built for Next.js. Registration, login, social login (Google, Facebook, Apple), profile management, and role-based access control are all handled natively. The membership wall is implemented as Next.js middleware — one configuration file locks any route or page segment to authenticated users only. Member migration from Ultimate Member is handled via Clerk's bulk import API. The free tier supports up to 50,000 monthly active users.

**Supabase (Database & Realtime)**

Supabase is an open-source Postgres database with a built-in REST API, Row Level Security, Realtime pub/sub, and file storage. It stores everything that is not editorial content: member profiles, journal entries (with visibility state), activity feed posts, comments, notifications, moderation records, and RSS import queues. Row Level Security ensures members can only query content their visibility settings permit. Daily backups are included in the Pro plan. Private journal entries are encrypted at rest.

**Metricool Starter (Social Auto-Posting)**

Metricool's RSS Autolist feature pulls from Autisable's published RSS feed and automatically schedules posts across all connected social platforms — 3 to 4 posts per day on Autisable's accounts. A second brand slot on the same plan handles Joel's personal brand, expanding reach without additional cost. No developer webhook integration required — Metricool monitors the RSS feed natively. X/Twitter posting is budgeted as a Phase 2 addition.

**Resend + Inngest (Email & Onboarding)**

Resend handles all transactional email and newsletter broadcasts via a clean Next.js SDK. React Email templates are designed on-brand and render correctly across all major email clients. Inngest handles the behavioral drip onboarding sequence — emails respond to what a member has and has not done, not just to elapsed time. The Resend Broadcasts feature powers opt-in newsletter subscriptions for both members and non-members across multiple topic categories.

**HubSpot Free (CRM & Outreach)**

HubSpot manages all external relationships — sponsors, affiliate partners, press contacts, podcast guests, and syndication partners. It is completely separate from the on-platform member system. Joel already knows HubSpot and uses the free tier. No retraining required. The division is clean: HubSpot for everyone outside the wall, Resend for everyone inside it.

**Make.com — Retired at Launch**

Make.com is shut down when the new platform launches. Every workflow it currently handles is replaced natively: Metricool's RSS Autolist handles social posting without any intermediary, Vercel Cron handles RSS feed imports, Next.js API routes handle all webhook processing, and Inngest handles onboarding event sequencing. No automation tool outside the platform is needed. Retiring Make.com removes $11/month from the platform cost.

---

## 3. Site Architecture

### 3.1 Public-Facing Site

All pages in this section are publicly accessible — no login required. These are the editorial, content, and community preview layers of the site. Contextual affiliate placements and display ads appear only on these pages, never behind the membership wall.

#### Home Page

The home page does four things in sequence as a visitor scrolls:

1. **Orient** — hero section with the Autisable brand statement, triangle puzzle piece logo, and two calls to action: Join the Community (primary) and Explore Stories (secondary). Short, direct, warm copy. No stock autism photography. No puzzle piece imagery that implies incompleteness.
2. **Introduce the content pillars** — Stories, Podcasts, Music, Community — presented as distinct visual destinations with real weight, not just navigation links. A first-time visitor understands the full scope of the site in one scroll.
3. **Show the community is alive** — a live feed of recent blog posts and community content. Author names, faces, real content. Social proof that this is an active place worth joining.
4. **Convert** — a membership prompt before the footer. Plain language: what members get, why it matters, one join button. Warm invitation, not aggressive marketing.

#### Stories Section

- **Stories hub** — overview of all editorial content with featured posts and category navigation
- **Advocacy & Awareness** — category archive, filterable by topic
- **Personal Stories & Experiences** — category archive
- **Travel** — sensory-friendly and autism-family travel content
- **Individual blog post** — clean reading experience, generous typography, author bio card (member-controlled: display name, short bio, profile photo, website URL, social media links), related posts (determined by matching category tags — up to 3 most recent posts sharing at least one category tag with the current post, fetched via Sanity query), contextual affiliate placements, social share, comment section (members only — non-members see a warm join prompt; all posts launch with zero comments; comments post immediately; community flag on every comment)
- **Individual syndicated blog post** — same template with Read Original Post footer treatment, canonical URL pointing to original source, and full author bio card linking back to the original author's site and social profiles. Autisable imports blog post content only — original site comments are never imported. Members can comment on Autisable's version independently. The original author's comment section and Autisable's are entirely separate.

#### Podcasts Section

Three podcast brands, each with its own dedicated space. All share the same underlying page template; content populates from the RSS importer and Sanity. Partnership terms for Hope Saves the Day and The Autism Dad must be confirmed in Phase 0.

- **Podcasts hub** — overview of all three shows with latest episodes across all
- **Autisable Dads: Life with Autism** — dedicated landing page, full episode archive, embedded audio player, associated blog posts filtered by tag
- **Hope Saves the Day (Autism Radio)** — dedicated landing page, episode archive, canonical URLs pointing to Autism Radio, associated blog posts
- **The Autism Dad (Rob Gorski)** — dedicated landing page, episode archive syndicated via RSS from theautismdad.com with canonical URLs, associated blog posts
- **Individual podcast episode page** — description, embedded audio player, show notes, linked blog post if applicable. Default embed source is Spotify. If a show is hosted on a different platform, that platform's embed player is used instead. Podcast audio is never self-hosted on Autisable — all audio is embedded from the external hosting platform via iframe embed code. The programmer uses react-lite-youtube-embed pattern (lazy load) for podcast embeds to protect Core Web Vitals.

#### Music Section

A dedicated page for Autisable's AI-assisted music initiative — one of the platform's most distinctive and forward-looking features.

- **Music landing page** — embedded YouTube playlist from Autisable's channel (loaded via react-lite-youtube-embed for Core Web Vitals compliance), editorial statement about the project and its mission, associated blog posts filtered by music tag
- **Individual music blog posts** — standard editorial template, tagged to surface on the music page automatically

#### Community Preview (Public)

- **Community feed preview** — recent member posts visible publicly, truncated after the first few with a warm join prompt. Enough to show the community is real and active.
- **Member directory preview** — names and avatars only. Full profiles and bios accessible to members only.

#### Resources & Affiliates Page

Replaces the WooCommerce shop entirely. A curated, editorially-framed page of recommended books, tools, and resources. Links to Joel's existing Bookshop.org online store (affiliate account active), Joel's existing Special Learning online store, and Amazon Associates. No storefront UI, no cart, no checkout on Autisable. Clean, editorial, trustworthy feel — a curated recommendations page that links out to the stores where purchases are completed.

#### Newsletter Subscription

An email capture field appears on the home page, on every public blog post footer, on podcast pages, and in the site footer. No account required. Subscribers opt into one or more topic categories:

- **New blog posts** — every public post published to the site
- **New podcast episodes** — optionally broken down per show
- **Music** — new releases and updates from the music project
- **Autisable announcements** — site news and updates (members only topic)

When Joel publishes a post in Sanity, a webhook fires simultaneously to Metricool (social posting) and Resend (newsletter broadcast to relevant subscribers). One publish action. Everything goes out automatically.

#### Standard Public Pages

- **About Autisable** — mission, triangle puzzle piece meaning, community history since 2008, Joel's voice
- **Contact Us** — single HubSpot form embed; the only page on the site where visitor data is collected outside the Autisable platform and sent to an external system (HubSpot CRM). Plain language note on the page informs visitors of this. Appropriate for: sponsor inquiries, press, podcast guest outreach, syndication requests, and general partnership contact.
- **Join / Register** — age-gated registration flow with pending approval state
- **Login**
- **Search results** — full-text search scoped to: published blog posts (editorial, submitted, and syndicated) and public-facing pages (About, Resources, Help Center public content). Search does not index member profiles, journal entries, or any content behind the membership wall. Members and non-members see identical search results — further detail on any topic requires joining. Implemented via Sanity's native search API for editorial content. Search bar is persistent in the site header on all public pages.
- **404 / Error** — warm, on-brand, helpful
- **Privacy Policy** — plain language, genuinely readable, no legalese
- **Terms of Use** — plain language
- **Under-16 notice** — shown to users under 16 who attempt registration; kind and clear

### 3.2 Behind the Membership Wall

All content in this section is accessible only to authenticated members. No display ads. No affiliate links. No analytics that capture content. No external tracking scripts of any kind on any authenticated page.

#### Member Dashboard

The member's home inside the wall. Recent activity from people they follow — including journal entries shared by followed members — their own latest journal entries, pending notifications, a profile completeness prompt if applicable, and quick links to write, submit, and explore.

#### Personal Journal

The journal is the creative and personal heart of the member experience. Every entry has a visibility setting the member controls at any time. Entries are never publicly indexed, never accessible to external systems, and never visible outside the membership wall regardless of visibility setting.

- **Journal entry list** — all the member's entries, newest first, with visibility state clearly labeled on each
- **Write / edit journal entry** — rich text editor, auto-save, full formatting support
- **Visibility Settings:**
  - **Private only** — visible to the member alone. No one else can see it under any circumstance.
  - **Followers** — visible to members who follow this member. Appears in their social feed labeled as a journal entry.
  - **All members** — visible to the entire authenticated community. Appears in the community-wide social feed labeled as a journal entry. Comments on journal entries are visible to members only regardless of journal visibility setting — journal comments are never publicly visible.
- The member can change the visibility setting on any entry at any time — including pulling a Followers or All Members entry back to Private. Once an entry has been submitted to editors and accepted for publication as a public blog post, the visibility setting can no longer be changed and the entry cannot be deleted.
- **Submit to Editors** — At any point the member may choose to submit a journal entry for promotion to a public blog post outside the membership wall. Before the submission is sent, the member sees a clear, plain-language disclosure screen. The member confirms the disclosure and the entry moves into the editorial review queue. The member can revoke the submission at any time while it is still under review — before Joel approves and publishes it. Once published, the post belongs to Autisable and cannot be withdrawn.

#### Social Activity Feed

The community's public square — visible to all members, invisible to the outside world. Members post short updates, share thoughts, react to others' posts, and reply in threads. Journal entries shared with Followers or All Members also appear in the feed, clearly labeled as journal entries so the context is always clear.

- Feed of posts from members the user follows, plus community-wide posts
- Post composer — text with optional image attachment
- Reactions — a meaningful acknowledgment system designed for this community, not just a like count
- Replies — members can reply to any feed post or journal entry shared to Followers or All Members
- No direct messaging — all interaction is open, visible to moderators
- Community reporting — any member can flag a post as concerning. Goes to moderation queue for human review. No auto-removal.
- Realtime updates — new posts and reactions appear live without page refresh via Supabase Realtime

#### Member Profiles

- **Own profile** — editable: avatar, display name, short bio, location (optional), pronouns, role descriptor (parent, autistic individual, professional, advocate), website URL, social media links (X/Twitter, Facebook, Instagram, LinkedIn, YouTube, TikTok — any combination)
- The profile bio and links are the member's author card — they appear on every piece of content published under their name on Autisable. Members control this entirely. Keeping it current is in their direct interest: every published post, syndicated article, and podcast association is a promotional opportunity pointing back to their own platforms.
- **Other member profiles** — avatar, bio, public posts, follower and following counts, follow button
- **Verified member badge** — granted by admin when identity or age confirmed via optional document verification (Phase 2)
- **Patron badge** — automatically applied when a member's Patreon tier is active (Phase 2)
- **Profile completeness prompt** — gentle progress indicator encouraging members to complete their profile

#### Member Directory (Full)

Full searchable, filterable directory available to members only. Filter by role, location, interests. Supabase full-text search. Designed to help members find each other — not to expose personal information. Location is never required and never displayed beyond city or region level if provided.

#### Notifications

Realtime notification center. Alerts for: new follower, reply to a post, post approved, post returned with editor note, post published, Autisable announcements, onboarding milestones. All notifications link to the relevant content and can be dismissed individually or cleared in bulk.

#### Account Settings

- Edit profile information and custom fields
- Change email address and password
- Notification preferences — granular control over what triggers an email vs. in-app notice
- Newsletter subscription preferences — manage topic subscriptions
- Privacy settings — control what parts of the profile are visible to other members
- Connect Patreon account — links existing Patreon membership to Autisable role (Phase 2)
- Delete account — self-service, permanent, purges all Supabase data including journal entries

#### Autisable Announcements

A dedicated, clean feed of posts from Autisable itself — new features, community news, platform updates, behind-the-scenes context. Read-only for members; members can react but not reply publicly. No ads, no affiliate links, no external tracking.

#### Help Center

A structured knowledge base authored by Joel in Sanity, gated behind Clerk auth. Built in two phases:

**Phase 1 — Static Help Content (at launch)**

- How to write a journal entry and set its visibility
- How to share a journal entry with followers or all members
- How to submit a journal entry to the editors for blog publication — including what to expect during the process
- How to submit a post to the editors
- How to complete and update your profile
- How the activity feed works
- Community guidelines — plain language, warm tone
- Frequently asked questions

**Phase 3 — AI-Assisted Help (phased in with Patreon)**

Three distinct AI assistance modes, all running via the Anthropic Claude API, called directly from authenticated Next.js API routes — no intermediary automation tool. Gated behind Clerk auth. No member content is ever sent to external logging systems — the AI responds in session only, nothing is retained. Phased in alongside Patreon integration once the core platform is stable and growing.

- **For parents** — a guided Q&A that surfaces relevant resources, articles, and community posts. Patient librarian, not search engine.
- **For autistic members** — a social communication assistant. Helps draft replies to feed posts in the member's own voice. Non-condescending by design.
- **For professionals** — a communication guide. Context on how to engage respectfully with this community, common missteps, how to listen first.

---

## 4. Patreon Integration & Monetization

### 4.1 Overview

Autisable is free. Every member receives full access to the community at no cost. Patreon is a separate, voluntary layer for members who choose to financially support the platform. Patreon integration is a Phase 2 feature — the core platform launches first, and Patreon is connected after launch once the community is stable.

Patreon becomes the payment and subscription management layer. Autisable becomes the experience layer. Patrons consume content, receive recognition, and engage with the community on Autisable — Patreon is where they manage their pledge and billing. All patron content is authored in Sanity, not on Patreon's platform, keeping everything in one editorial dashboard.

### 4.2 Three Patron Tiers

Three tiers sit above free membership. Every tier stacks on the one below — Tier 3 patrons receive all Tier 1 and 2 benefits as well as their own. The content posted for each tier is authored in Sanity with an Access Level field — Joel selects the appropriate tier from a dropdown when writing. No separate dashboard, no separate workflow.

**Tier 1 — Supporter**

The entry tier. The obvious yes for someone who values Autisable and wants to contribute something.

- Supporter badge on their Autisable community profile — visible recognition
- Early access — blog posts and content visible to Supporters 24 hours before public publication
- Autisable Insider feed — a Supporter-only feed of behind-the-scenes updates from Joel about platform direction, upcoming content, and community news
- Name listed on the Autisable Supporters page (public, opt-out available)

**Tier 2 — Advocate**

The core tier. Everything in Tier 1, plus content that doesn't fit the public blog — more personal, less polished, more direct.

- Exclusive Advocate content — extended podcast thoughts, Joel's personal commentary on autism news and advocacy topics, bonus music releases
- Voting rights — polls on upcoming content, site features, podcast topics; results shared with all Advocates
- Early access to new Autisable platform features before general release

**Tier 3 — Champion**

Everything in Tier 1 and 2, plus direct access and genuine influence on Autisable's direction.

- Champion feed — a private space where Joel posts personally, speaks directly, and responds to questions. Short, conversational, unfiltered. Designed to feel like a direct conversation, not a published piece.
- Input on Autisable's direction — Champions are consulted on major decisions before announcement
- Annual Champion Spotlight — each Champion's story told on Autisable with their permission
- First access to any new Autisable initiatives, partnerships, or programs

### 4.3 Access Level Architecture

Content access is controlled by a single field in Sanity on each post, page, or content item. Joel selects from a dropdown. The platform handles the rest.

### 4.4 Technical Implementation

- Patreon API is free — no cost to integrate
- Members connect their Patreon account in Account Settings — one-time step after the integration goes live
- On connection, the Patreon API checks active patron status and current tier
- Clerk grants the appropriate role automatically — Supporter, Advocate, or Champion
- Patreon webhooks fire in real time when a pledge is created, updated, or cancelled — Clerk roles update immediately, no manual management
- When a patron cancels, their role reverts to standard Member — they keep community access, lose tier benefits
- A tasteful prompt visible to free members shows what each patron tier includes and links to the Autisable Patreon page — informative, never pushy
- Privacy note: members who want to keep their Patreon identity separate from their Autisable identity can do so — the connection is voluntary, not required for free membership

---

## 5. Admin Panel

The admin panel is a custom Next.js section accessible only to accounts with the admin role in Clerk. It is the operational center of the platform — where Joel and any future moderators manage the community, review content, and control the automated systems. It is purpose-built for how Autisable actually works.

### Content Review Queue

- **Member post submissions** — entries submitted from journals for editorial promotion to the public blog. Shows full entry text, author, submission date, and original visibility setting. Actions: Approve (pushes to Sanity draft for Joel's final edit, SEO optimization, and affiliate tagging before publish), Return with note, Decline with note. Member notified automatically via Resend at each stage. Revoked submissions are removed from the queue automatically with a notification to Joel.
- **Syndicated RSS content queue** — new items imported from the 70+ individual RSS feeds (parents, autistic individuals, professionals, organizations) awaiting review. Shows headline, source, full text preview, detected author, and author bio completeness indicator. Actions: Assign to member account, Approve (writes to Sanity with canonical URL and Read Original Post footer applied automatically — bio completeness required to approve), Notify author (sends Resend email prompting profile completion), Skip, Remove. The Approve action is inactive until the assigned author's bio meets the completeness requirement.

### RSS Feed Manager

- List of all active feeds with status — active, paused, or error
- Add new feed — URL input, auto-detect feed type, assign default category and member account
- Pause or resume individual feeds without deleting them
- Last import timestamp and item count per feed
- Error log — feeds that have not returned content in 48 hours are flagged automatically

### Member Management

- Registration approval queue — new registrations held pending review; one-click approve or decline with optional note; decline sends a kind, plain-language email to the applicant
- Member list — searchable and filterable by role, status, and join date
- Member detail view — full profile, post history, flag history, journal entry count by visibility state (not content — moderators never see private journal entries)
- Role management — assign Member, Contributor, Moderator, or Admin roles
- Account actions — warn (sends a private notice), suspend (temporary), remove (permanent with optional data purge)

### Moderation Queue

- Community-reported content awaiting human review — covers: blog post comments (editorial, submitted, and syndicated), social feed posts and replies, and journal entry comments
- Full context shown — the flagged content, the thread it sits in, who flagged it, and when
- Actions: Dismiss flag (content stays, flag resolved), Send private notice to member, Remove content (member notified with a plain-language reason), Escalate to suspension
- No content is ever auto-removed. All moderation actions are human decisions.
- Keyword alert queue — posts containing configured terms surface here for review. Terms are never disclosed to members. Content remains live while under review.
- All moderation actions logged with moderator, action, reason, and timestamp — protects both the community and the platform

### Affiliate Tag Manager

Controls which affiliate components appear on which public posts. In Sanity, each post has an optional Affiliate Context Tags field. Joel selects applicable tags when writing. The appropriate affiliate component renders automatically. No affiliate content ever appears on authenticated pages.

- **Books / Reading** → Bookshop.org — links to Joel's existing Bookshop.org online store (affiliate account already active, 10% commission); Amazon Associates as secondary for items not on Bookshop
- **Legal / Advocacy / IEP** → LegalShield — contextual link to the LegalShield URL provided by Joel; no header or banner placement
- **Therapy / Educational Tools** → Special Learning — links to Joel's existing Special Learning online store (same affiliate model as Bookshop.org)
- **Visual Scheduling / AAC / Autism Tools** → VizyPlan placement
- **General Resources** → Amazon Associates

### Newsletter & Subscriber Management

- Subscriber list with topic preferences per contact
- Broadcast history — all newsletters sent, open rates, click rates from Resend
- Topic management — add or adjust subscription topics
- Unsubscribe handling is fully automatic via Resend — no manual management required

### Social Post Log

Log of all posts published via Metricool's RSS Autolist. Confirms what went out, when, and to which platforms. Useful for verifying coverage and diagnosing any platform-specific issues.

### Onboarding Email Manager

View of the active Inngest drip sequence. Shows which steps exist, how many members are at each step, open rates from Resend, and the ability to pause or edit individual steps without a code deploy.

### 5.2 Author Bio System

The author bio is the single most important incentive for contributors, syndicating bloggers, and organizations to engage with Autisable. Every piece of published content — promoted journal entries, editorial posts, and syndicated RSS articles — carries a full author bio card at the bottom. The member controls this entirely from their profile settings.

**Required fields for publication (bio completeness gate):**

The following four fields must be completed before any content can be approved for publication under that member's name. This applies to both member-submitted journal entries and syndicated RSS content assigned to a contributor account:

- Display name — how the author appears on published content
- Short bio — minimum 50 characters; the author's voice describing who they are
- Profile photo — a real avatar; no placeholder silhouettes on published content
- At least one external link — website URL or any social media profile

**Optional profile fields (displayed in bio card when present):**

- Website URL
- X / Twitter
- Facebook
- Instagram
- LinkedIn
- YouTube
- TikTok
- Any additional platform links the member adds

**How the bio gate works:**

- **Member submits journal entry** — system checks bio completeness before showing the disclosure screen. If incomplete, member sees a prompt with a direct link to profile settings. No submission proceeds until complete.
- **Syndicated RSS content** — the Approve button in the admin review queue is inactive if the assigned author's bio is incomplete. Joel sees a bio status indicator and a one-click Notify Author button that sends a Resend email prompting the contributor to complete their profile.
- **Placeholder accounts** created for unregistered contributors — a claim email is sent automatically inviting them to join Autisable, complete their profile, and take ownership of their syndicated content.

**The promotional value for contributors:**

Every parent blogger, autistic individual, professional, or organization whose content appears on Autisable gets a permanent, do-follow author card on that content — linking back to their own site and social profiles. For the 70 current syndicating contributors, this is backlink and audience exposure they receive automatically by being on the platform. For new contributors considering whether to submit or syndicate, it is a concrete, visible incentive. Autisable becomes a distribution and credibility platform, not just a place to be listed.

---

## 6. Automation & Pipelines

### 6.1 RSS Content Syndication

Autisable currently syndicates content from approximately 70 individual RSS feeds — parents, autistic individuals, professionals, advocates, and autism organizations — each with their own feed, their own voice, and their own audience. The new system replicates and significantly improves this workflow without WordPress or any third-party plugin cost. Every syndicating contributor gets a full author bio card on their published content, with links back to their own site and social profiles — a direct incentive to join, complete their profile, and contribute actively.

1. A Vercel Cron Job runs every hour
2. It polls all active RSS feeds stored in the Supabase feeds table using the @extractus/feed-extractor library
3. New items not already in the database are imported as pending records in a syndication queue table
4. Joel sees new items in the RSS review queue in the admin panel
5. Joel assigns each item to the corresponding contributor's Autisable account in the review queue. If no account exists yet, a placeholder account is created for that contributor.
6. When a placeholder account is created, Resend automatically sends a claim email to the contributor's address (sourced from their RSS feed or known contact): their content is being featured on Autisable, here is how to claim their account, complete their profile, and take full ownership of their presence on the platform. This email is a direct membership recruitment tool.
7. On approval, the system automatically: writes the post to Sanity with the original canonical URL set, appends a Read Original Post link and button at the end of the content, applies the author's Autisable account as the post author, and tags the post with appropriate categories
8. The post publishes to the public blog. Metricool's RSS Autolist picks it up and schedules it to social platforms automatically.

### 6.2 Automated Affiliate Link System

Autisable has 3,000+ existing blog posts and receives high-volume ongoing content from 70 RSS feeds. Manual per-post affiliate tagging alone is not sufficient at this scale. The new stack implements a two-layer affiliate link system that handles both retroactively and automatically.

**Layer 1 — Keyword-to-affiliate mapping at render time (automated)**

The programmer builds a Next.js content processing utility that scans post body content at render time and automatically wraps configured keyword matches with their affiliate URLs. This runs on every post page load — no stored content is modified. The keyword-to-URL mapping list is stored in a Sanity configuration document that Joel manages directly in Studio:

- Add a keyword (e.g. 'visual schedule', 'AAC', 'IEP') — all posts containing that word or phrase automatically generate the affiliate link on render
- Add or change the affiliate URL for a keyword — takes effect immediately across all 3,000+ existing posts and all future posts without any manual action
- Remove a keyword — links stop appearing immediately site-wide
- Applies to: editorial posts, submitted posts, and syndicated RSS posts on approval
- Initial keyword list is seeded from the current Auto Affiliate Links plugin configuration during Phase 0 export

**Layer 2 — Per-post contextual affiliate tags (manual, already documented)**

For posts that require specific contextual placements beyond keyword matching — a VizyPlan sidebar on a visual scheduling post, a Bookshop.org widget for a specific book recommendation, a LegalShield placement on an IEP advocacy post — Joel manually selects affiliate context tags in Sanity Studio. These render the dedicated affiliate components already documented in the Affiliate Tag Manager section.

### 6.3 Member Post Submission Pipeline

1. Member selects Submit to Editors on any journal entry regardless of its current visibility setting
2. Member is shown the disclosure screen — plain language explanation of editorial changes, SEO optimization, affiliate link and ad placement, and full rights of use grant. Member must actively confirm before proceeding.
3. Member confirms. A Supabase function creates a draft record in Sanity with the full entry content, member name, account reference, and submission timestamp.
4. Member receives immediate Resend confirmation: submission received, what happens next, and a reminder that they may revoke at any time before publication
5. Joel sees the submission in the Content Review Queue in the admin panel
6. Member may revoke the submission at any time while status is Under Review — a Revoke Submission button appears on the entry in their journal list. Revoking removes the Sanity draft and notifies Joel. The entry returns to its previous visibility setting.
7. Joel reviews, rewrites or edits for SEO and editorial style, adds affiliate context tags, and either approves (pushes to Sanity for final publish) or returns with a note explaining why
8. Member receives a Resend notification at each stage: received, under review, approved, published, or returned with feedback
9. Once published, the post is live on the public blog attributed to the member. The journal entry behind the wall is locked — visibility setting cannot be changed, entry cannot be deleted. Member's profile shows their published posts.

### 6.4 Social Auto-Posting via Metricool

1. Joel publishes a post in Sanity Studio
2. Sanity's ISR updates the live site within 60 seconds
3. Autisable's RSS feed updates automatically as part of the Next.js build
4. Metricool's RSS Autolist detects the new item and schedules it for posting across all connected platforms
5. Posts go out 3–4 times per day on Autisable's schedule — not all at once, spread through the day for maximum reach
6. Joel's personal brand Autolist operates on its own schedule, amplifying Autisable content from his personal accounts
7. X/Twitter posting is added as a Phase 2 addition when budgeted
8. The social post log in the admin panel confirms all posts that went out

### 6.5 Newsletter Auto-Broadcasting

1. Joel publishes a post in Sanity Studio
2. A Sanity webhook fires to a Next.js API route on Vercel
3. The API route retrieves post title, excerpt, featured image, and URL from Sanity
4. It calls the Resend Broadcasts API, targeting subscribers opted into the relevant topic (Blog Posts, Podcasts, Music, or Announcements)
5. Subscribers receive a clean on-brand email: featured image, post title, two to three sentence excerpt, Read More button
6. Unsubscribes are handled automatically by Resend — no manual management
7. Both members and non-members who have subscribed via the site receive the broadcast

### 6.6 Member Onboarding Email Sequence

Powered by Resend and Inngest. The sequence is behavioral — it responds to what the member has and has not done, not just elapsed time.

### 6.7 Marketing & Outreach via HubSpot

HubSpot manages all external-facing relationships. The division of responsibility is clean and permanent: HubSpot for everyone outside the community wall, Resend for everyone inside it. Joel already knows HubSpot — no retraining required.

- **Sponsor relationships** — LegalShield, VizyPlan, Special Learning; conversation history, renewal reminders, placement terms
- **Affiliate partner management** — Bookshop.org, Amazon Associates; tracking IDs, performance notes, contact history
- **Podcast guest outreach** — prospects, confirmed guests, follow-up sequences
- **Press and advocacy contacts** — journalists, organizations, advocates who cover autism topics
- **Syndication partner relationships** — Rob Gorski, Autism Radio, and the 70 blogger contacts
- **Prospect campaigns** — landing pages and forms for membership growth campaigns; non-member contacts who expressed interest but have not yet registered
- HubSpot forms embed on the public Autisable site via a lightweight script — form submissions land in HubSpot automatically

---

## 7. Safety & Privacy

### 7.1 Age Verification — 16 and Older

Autisable is a 16+ platform. This is enforced through a layered system built from the registration flow outward.

**Layer 1 — Date of Birth at Registration**

Every registration requires a date of birth. Anyone under 16 is blocked from completing registration and shown a kind, plain-language message explaining that the site is for members 16 and older. Under current FTC and COPPA guidance, a platform that screens for age in a neutral fashion may rely on the information entered, provided there is no actual knowledge of a minor's presence. This layer establishes legal defensibility as a baseline.

**Layer 2 — Registration Approval Queue**

All new registrations are held in a pending state for admin review before the account is activated. Joel or a designated moderator approves or declines each registration. This is the whitelist model adapted from Autcraft. It creates a human checkpoint between signup and access, and it builds community trust from day one — members know they joined a place that cares about who is there.

**Layer 3 — Optional Document Verification (Phase 2)**

For members who want a Verified badge on their profile, optional identity verification via Veriff or Persona confirms age from a government ID. This is voluntary — it adds trust, not mandatory friction. A Phase 2 feature added after launch.

### 7.2 Privacy Architecture

Given the vulnerability of the audience, privacy is a design principle that every technical decision is measured against — not a compliance checkbox.

- No third-party ad tracking on any authenticated page. Ad network scripts load only on public-facing editorial pages.
- No behavioral session recording tools on any page. Vercel Analytics provides privacy-safe aggregate page metrics only.
- Google Analytics (GA4) and Facebook Pixel load on public-facing pages only via Next.js Script component with strategy=afterInteractive. Neither script loads on any authenticated route. This is enforced at the Next.js middleware level, not just by convention.
- Private journal entries encrypted at rest in Supabase. A database breach exposes nothing readable.
- Followers and All Members journal entries are visible within the wall per their settings but are never publicly indexed, never accessible to external systems, and never appear outside authenticated routes.
- Supabase Row Level Security enforced at the database layer — members can only query their own private data regardless of application behavior.
- Right to deletion is real and complete. A member who deletes their account triggers a Supabase function that purges all their data — posts, journal entries, profile, activity records. No soft-delete.
- Minimal data collection. Name, email, date of birth, optional profile fields. Nothing beyond what the community needs to function.
- Privacy Policy written in plain language at a reading level accessible to the community. Reviewed by a lawyer but written for people.

### 7.3 Internal Moderation — Human First

There is no automated content removal behind the membership wall. The following principles are non-negotiable and built into the moderation system architecture:

- Community reporting sends any post, comment, or reply to the human moderation queue. The content stays live while under review — no auto-removal.
- Keyword alerting surfaces posts for human review — it never auto-removes or auto-blocks anything.
- No third-party AI moderation services process member content. These services receive and may log the content sent to them. That is unacceptable for a vulnerable community discussing sensitive topics.
- All moderation actions are logged with the moderator, the action, the reason, and the timestamp.
- The first moderation action for any violation is a private notice to the member in plain, respectful language. Removal, suspension, and banning are escalating steps, not first responses.
- No direct member-to-member messaging. All interaction occurs in open feed or comment threads visible to moderators. This protects vulnerable members and aligns with the Autcraft model — no private channels, no hidden conversations.

---

## 8. Design & Accessibility

### 8.1 Brand

The Autisable visual identity evolves but does not start over. The triangle puzzle piece logo is the anchor. The designer's job is to make it feel contemporary and confident — not to reinvent it. A brand tagline or statement that communicates the 'pieces coming together, community forming a whole' meaning should be established early and used consistently across the site, onboarding emails, and social posts.

No logo redesign or refinement is in scope. The existing triangle puzzle piece logo carries forward as-is. Joel will provide the existing logo files in SVG format before design work begins. The designer works from this logo — the creative direction is about how the logo is presented and what surrounds it, not changing the logo itself. Brand hex color codes and font names will be provided by Joel and serve as the anchor for the entire design system.

### 8.2 Design Principles

**Sensory-first**

Calm color palette. Autisable blue anchors the brand; paired with warm neutrals, not stark white. Good line height. Generous paragraph spacing. Short paragraphs by default. Nothing feels crowded or rushed. The reading experience on blog posts should feel like breathing room.

**No autoplay**

No video, audio, or animation triggers without explicit user intent. This is a hard constraint built into every component spec. It applies to every page on the site without exception.

**Accessibility is the floor**

WCAG 2.1 AA compliance minimum. Focus states, skip links, alt text pipeline from Sanity, color contrast ratios verified at design time. Screen reader compatibility tested before launch. For this audience, accessibility is not an afterthought.

**Mobile first**

Design for phone screens first, scale up to desktop. The majority of this community accesses from mobile. Desktop is an enhancement, not the default assumption.

**The wall feels like an invitation**

When a non-member encounters gated content, the experience is warm and clear: this is for members, here is why that is worth five minutes of your time. Not a lock screen. Not Access Denied. A door held open.

**Ads are guests, not hosts**

Contextual affiliate placements and display ads sit within the editorial layout without competing with it. Joel's voice and the community's content are always dominant. An ad placement that makes any page feel like a storefront is a failed design decision.

### 8.3 ADA Compliance & Accessibility

Autisable's audience requires genuine accessibility — not a compliance checkbox. The new platform addresses this at two distinct layers that work together.

**Layer 1 — UserWay Widget (carries forward from current site)**

Autisable currently uses UserWay for runtime accessibility controls. UserWay installs on Next.js via a single JavaScript snippet added to the root layout component — identical process to WordPress, one-time setup by the programmer. The existing UserWay account and configuration carry over with no changes required.

**Layer 2 — Built-in Accessibility (new platform baseline)**

The new Next.js platform is built accessible from the start. This is not a remediation layer — it is the engineering baseline:

- Semantic HTML throughout — headings, landmarks, lists, buttons, links used correctly
- WCAG 2.1 AA color contrast ratios enforced in the Tailwind design tokens
- Focus-visible states on all interactive elements
- Skip-to-content link on every page
- Alt text required field on all images in Sanity — enforced at the schema level, not optional
- Keyboard navigation tested on all interactive components before launch
- Screen reader testing with VoiceOver (macOS/iOS) and NVDA (Windows) before launch
- No reliance on color alone to convey meaning — icons, labels, or patterns always paired with color indicators
- Reduced motion media query respected — animations (if any exist) are suppressed for users who prefer reduced motion

---

## 9. Phased Rollout

### Phase 0 — Foundation & Data Export

- Export all WordPress content (3,000+ posts, media, users, comments) using WP All Export or WP-CLI
- Map WordPress categories and tags to new Sanity schema
- Export RSS feed list from WP RSS Aggregator
- Export affiliate keyword list from Auto Affiliate Links plugin
- Export Ultimate Member user data for Clerk bulk import
- Set up Sanity project, define content schemas, configure Studio
- Set up Clerk project, configure social login providers, define roles
- Configure Supabase tables, Row Level Security policies, and Realtime channels
- Set up Resend domain verification and React Email templates
- Set up Inngest project and define onboarding function stubs
- Set up Metricool RSS Autolist for both brand slots
- Confirm partnership terms with Hope Saves the Day and The Autism Dad

### Phase 1 — Core Platform Launch

- Public site: home page, stories section, podcast pages, music page, about, contact, resources, search, legal pages
- Blog post template with author bio cards, related posts, affiliate placements, comments (members only)
- Syndicated post template with canonical URLs and Read Original Post footer
- RSS import cron job and admin review queue
- Member registration with age gate and approval queue
- Member dashboard, journal (all visibility settings), social feed, profiles, directory, notifications
- Admin panel: content review, RSS manager, member management, moderation queue, affiliate tag manager
- Newsletter subscription (public) and auto-broadcasting via Resend
- Onboarding email sequence via Inngest
- Social auto-posting pipeline via Metricool
- WordPress content migration into Sanity
- Member migration into Clerk
- UserWay widget installed
- Accessibility testing complete
- Launch

### Phase 2 — Monetization & Verification

- Patreon API integration — tier detection, Clerk role sync, webhooks
- Patron badges and tier-gated content in Sanity
- Supporter, Advocate, and Champion feeds and features
- Optional document verification via Veriff or Persona
- Verified member badge
- X/Twitter posting via Metricool
- Display ad integration on public pages (if pursued)

### Phase 3 — AI-Assisted Help

- Claude API integration for three help modes (parents, autistic members, professionals)
- Gated behind Clerk auth, no external logging
- Phased in once core platform is stable and community is growing

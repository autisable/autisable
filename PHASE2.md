# Autisable — Phase 2 Build Tracker

Working doc tracking everything from Joel's Phase 2 build brief (May 2026) plus carryovers from launch week. Updated as work lands.

## Status legend

- ⬜ Not started
- 🚧 In progress
- ✅ Done
- ⏳ Blocked / waiting (on Joel, on info, on copy, etc.)
- 📅 Deferred to later phase

---

## Decisions needed before broader Phase 2 work

| # | Item | Recommendation | Status |
|---|---|---|---|
| D1 | **Inline banner sizes** for affiliate placements | Primary: **300×250** (IAB standard, mobile-friendly). Optional secondary: 468×60 in sidebar/footer. Skip 728×90 — too wide for mobile. | ⏳ Awaiting Joel's reply |
| D2 | **SEO automation approach** | Native to our stack: serverless function calls Anthropic API at publish time, generates meta_title/description/keywords. ~2 days to build, ~$0.001/post. NO Sanity (we don't use it). | ⏳ Awaiting Joel's go/no-go |
| D3 | **Auto-deploy from GitHub** broken since launch week | Reconnect Vercel ↔ GitHub integration in Vercel → Settings → Git. Until fixed, every commit needs `npx vercel --prod`. | ⬜ Justin to fix |
| D4 | **Image size reference doc** for members & editors | Build `IMAGE_SIZES.md` + inline helper text on each upload control. | ⬜ Justin |

---

## Carryover from launch week

| # | Item | Owner | Status |
|---|---|---|---|
| C1 | Core Web Vitals check in GSC (LCP / CLS / INP) | Justin | ⬜ |
| C2 | Ongoing GSC Coverage monitoring (404s, redirect chains) | Justin | ⬜ Ongoing |
| C3 | Reply to Joel re: banner sizes | Justin | ⬜ See D1 |
| C4 | Schedule 612-post content batch (post-a-day cron) | Justin | ⬜ |

---

## Joel's open items (awareness only — no Justin action)

| # | Item | Owner | Status |
|---|---|---|---|
| J1 | Privacy Policy — DOB / age paragraph | Joel + LegalShield | ⏳ |
| J2 | Terms of Use — LegalShield review | Joel + LegalShield | ⏳ |
| J3 | Community Guidelines — LegalShield review | Joel + LegalShield | ⏳ |
| J4 | Accessibility Statement — LegalShield review | Joel + LegalShield | ⏳ |
| J5 | Banner image assets (after sizes confirmed) | Joel | ⏳ Pending D1 |
| J6 | Social channel launch announcement | Joel | ⏳ When stable |

---

## QUICK WINS — Sprint 1

Small, low-risk, additive items. Most don't depend on the larger feed/profile work.

| # | Item | Status | Notes |
|---|---|---|---|
| Q1 | Comments on/off toggle per blog post (in editor + DB) | ✅ | `comments_enabled` column added (SQL migration needed); toggle in PostEditor; respected in BlogPostClient. |
| Q2 | Allow/disallow comments on journal entries (member-controlled) | ✅ | `comments_allowed` column added (SQL migration needed); toggle in journal edit (only shows when not private). |
| Q3 | APM affiliate link → Resources page ONLY (not sitewide) | ✅ | Added under "Therapy & Learning" category. |
| Q4 | YouTube embed button in PostEditor toolbar | ✅ | Custom Embed node in TipTap. Parses youtu.be / youtube.com URLs into 16:9 iframe. |
| Q5 | Podcast embed button in PostEditor toolbar | ✅ | Same custom Embed node. Accepts full `<iframe>` paste OR bare URL. Renders as fixed-height audio player. |
| Q6 | Email notifications at pipeline stages | 🚧 | **Acknowledgement on submit done.** Approve/reject/live-link hooks need state-change detection + schema additions (submitted_by, rejection_reason). Moved to medium scope (M6). |
| Q7 | Notifications + Followers as feed tabs (currently 404) | 📅 | Depends on feed v2 (M3). Bookmark for that batch. |
| Q8 | Image upload in status updates (not just GIF) | 📅 | Depends on feed v2 (M3). |
| Q9 | Blog encouragement prompt at 300 chars in compose | 📅 | Depends on feed v2 (M3). |

---

## MEDIUM SCOPE — Sprint 2

| # | Item | Status | Notes |
|---|---|---|---|
| M1 | Featured image + OG auto-gen at 1200×630 | ✅ | `/api/og/[slug]` route uses `next/og` ImageResponse. Editor's `og_image` upload still wins (overrides auto-gen). Layout: featured image left half + title/category/author/brand on right; falls back to text-only with brand stripe when no featured image. Cached 1h at edge. Wired into blog post `generateMetadata` + JSON-LD article schema. |
| M2 | Profile image + cover photo upload (user + admin can act on behalf) | ✅ | Storage upload via `/api/upload/profile-image` (service-role gated, Bearer-JWT auth, admin override via `?targetUserId=`). New `CropModal` opens after file pick — react-image-crop with 1:1 round mask for avatars and 3:1 banner for covers. Crops to natural-resolution canvas, exports JPEG at 0.92 quality. Replaces the prior "raw upload, hope-it-fits" flow. |
| M3 | Self-ID tags on profile (3 colored chips, mutually exclusive Neuro pairs) | ⬜ | Multi-select, optional, editable post-registration. |
| M4 | 5-role system + migrate Author → Member | ⬜ | Schema + admin UI for role assignment. |
| M5 | Author leaving / removal request flow via contact form | ✅ | Two new contact reasons: "Author: Request post removal" + "Author: Leave Autisable / remove my account". Selecting either shows an amber callout with what to include in the message. API flags subject `[ACTION NEEDED — Author]` so emails are visible in the inbox. New `/admin/contact-messages` page (linked from admin dashboard) with Open / Author requests / Resolved tabs, mark-resolved / reopen actions, mailto reply button. Author-flagged rows highlighted amber. Schema adds `resolved_at` + `resolved_by_user_id` + open-only index (idempotent). |
| M6 | Email notifications: approve/reject (with reason) + live link | ✅ | Schema: `submitted_by_user_id` + `rejection_reason` added to blog_posts (SQL migration needed). Journal submit flow now stamps `submitted_by_user_id`. PostEditor captures pre-save editorial state and detects three transitions: pending→ready_for_scheduling = "approved" email; any→rejected = "rejected" email (with required rejection note inline in editor); is_published false→true = "your post is live" email with link. All routed through `/api/notifications/editorial-decision` (single endpoint, action param). Admin-created posts (no submitter) silently no-op. |

---

## LARGER INITIATIVES — Sprint 3+

| # | Item | Status | Notes |
|---|---|---|---|
| L1 | Membership profile hub (LinkedIn-style) | ✅ | Full hub with avatar/cover image upload (Supabase Storage via `/api/upload/profile-image`), 4 tabs (Posts / Journal / About / Followers), Follow/Unfollow with optimistic UI, real follower counts, followers list, journal tab visible only to owner, self-ID tag chips, sidebar with FollowControls + stats + socials shortcut. Vivid brand-gradient cover when no cover photo set. Avatar properly z-stacked above cover. |
| L2 | Community feed v2 (chronological, paginated, all content types, compose, filter tabs) | ✅ | Compose box at top (FeedCompose) — text + optional image (uploads via `/api/upload/feed-image` → activity_feed.image_url). Q9 prompt at 300 chars suggests journal entry instead. Pagination via "Load more" with cursor on `created_at` (loads PAGE_SIZE=20 from each source, merges, sorts, slices — drains both sources reliably). Filter tabs: All / Status updates / Journals (Q7's Following/Notifications deferred until follow system fully wired). Inline image rendering on cards. Avatar + name link to /member/[id]. Schema: `image_url` added to activity_feed (idempotent ALTER). |
| L3 | Podcasts page redesign — three-show card grid + per-show detail pages | ✅ | Three-card grid with show art (gradient placeholder until Joel ships real art), host attribution, recent episodes (internal source for Autisable Dads via `podcast_episodes`), "More about [show]" CTA → internal detail page, external subscribe CTA. Below the cards: related blog posts grouped per show, matched by tag. Per-show detail pages enriched with longer About copy, multi-platform Subscribe block, full episode list (internal) or "where to listen" CTA (external), and related posts grid. |
| L4 | SEO automation pipeline (per D2 decision) | ✅ | `/api/admin/seo-generate` calls OpenAI GPT-4o with strict JSON schema (structured outputs) on title/excerpt/content/category. Returns meta_title, meta_description, focus_keyword, keywords. "Generate with AI" button at top of SEO panel in PostEditor fills all four fields; user can edit anything after. Requires `OPENAI_API_KEY` env var in Vercel. (Joel preferred OpenAI over Anthropic; the @anthropic-ai/sdk dependency was removed.) |
| L5 | Affiliate banner framework + 3 partners (LegalShield, APM, VizyPlan) | ⬜ | Awaits D1 + Joel's banner assets. |
| L6 | Inline affiliate injection (Bookshop, Special-Learning, Amazon) | ⬜ | Per existing inline-affiliate spec; Bookshop geo-gated US/UK. |
| L7 | Journal vs. Blog distinct editors — finalize separation, locks, permissions | ✅ | Schema: `source_journal_id` added to blog_posts. Journal submit flow stamps the link; the editorial-decision endpoint now mirrors decisions back: approved → journal "approved", published → "published", rejected → "returned" (unlocks the entry so the member can revise + resubmit). Permissions audit: confirmed RLS on blog_posts is admin-only for write/update/delete, plus added a single `AdminGate` wrapper to the admin layout so every admin sub-page (not just /admin) gates non-admins client-side instead of letting them land on broken empty states. |

---

## FUTURE / DEFERRED

| # | Item | Status |
|---|---|---|
| F1 | Membership dashboard enhancement (post-stabilization analytics) | 📅 |
| F2 | AI-assisted moderation prompt (guideline detection) | 📅 |
| F3 | AISEO citation audit (structured data + clear writing pass) | 📅 Sub-task of L4 |
| F7 | Wire community feed Like + Reply buttons (Joel reported buttons unresponsive) | ⬜ Next | Currently visual placeholders. Need reactions table or counter + comments thread. |
| F4 | ~~Real podcast show art~~ | ✅ Joel says keep gradient colors as-is. Closed. |
| F5 | RSS feed pulling for Hope Saves the Day & The Autism Dad episodes | 📅 | Currently external shows just link out to native platforms. |
| F6 | Tag existing posts with show slugs | ✅ Joel will handle editorially via the Tags admin. |

---

## Author attribution requirements (cross-cutting — applies everywhere content is shown)

Already largely in place. Each piece of content must surface the author's:
- Profile image (uploaded — depends on M2 for non-WP authors)
- Author bio
- Optional: linked social accounts, website URL

Done today via the `authors` table. Verified during launch week.

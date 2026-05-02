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
| Q4 | YouTube embed button in PostEditor toolbar | ⬜ | TipTap YouTube extension. |
| Q5 | Podcast embed button in PostEditor toolbar | ⬜ | TipTap iframe/HTML embed. |
| Q6 | Email notifications at pipeline stages | 🚧 | **Acknowledgement on submit done.** Approve/reject/live-link hooks need state-change detection + schema additions (submitted_by, rejection_reason). Moved to medium scope (M6). |
| Q7 | Notifications + Followers as feed tabs (currently 404) | 📅 | Depends on feed v2 (M3). Bookmark for that batch. |
| Q8 | Image upload in status updates (not just GIF) | 📅 | Depends on feed v2 (M3). |
| Q9 | Blog encouragement prompt at 300 chars in compose | 📅 | Depends on feed v2 (M3). |

---

## MEDIUM SCOPE — Sprint 2

| # | Item | Status | Notes |
|---|---|---|---|
| M1 | Featured image + OG auto-gen at 1200×630 | ⬜ | Vercel OG library or Satori, runs on publish. |
| M2 | Profile image + cover photo upload (user + admin can act on behalf) | ⬜ | Supabase Storage, crop UI. |
| M3 | Self-ID tags on profile (3 colored chips, mutually exclusive Neuro pairs) | ⬜ | Multi-select, optional, editable post-registration. |
| M4 | 5-role system + migrate Author → Member | ⬜ | Schema + admin UI for role assignment. |
| M5 | Author leaving / removal request flow via contact form | ⬜ | Adds reason option + admin tool. |
| M6 | Email notifications: approve/reject (with reason) + live link | ⬜ | Add `submitted_by_user_id` + `rejection_reason` columns. Detect state changes in PostEditor save. Send via Resend. (Acknowledgement is already done in Q6.) |

---

## LARGER INITIATIVES — Sprint 3+

| # | Item | Status | Notes |
|---|---|---|---|
| L1 | Membership profile hub (LinkedIn-style) | ⬜ | Cover, avatar, tabs (Posts/Journal/About/Followers), sidebar. |
| L2 | Community feed v2 (chronological, paginated, all content types, compose, filter tabs) | ⬜ | Includes Q7/Q8/Q9 dependencies. |
| L3 | Podcasts page redesign — three-show card grid + per-show detail pages | ⬜ | Embed RSS for episodes; external links to Spotify/iHeart. |
| L4 | SEO automation pipeline (per D2 decision) | ⬜ | High-priority per Joel. |
| L5 | Affiliate banner framework + 3 partners (LegalShield, APM, VizyPlan) | ⬜ | Awaits D1 + Joel's banner assets. |
| L6 | Inline affiliate injection (Bookshop, Special-Learning, Amazon) | ⬜ | Per existing inline-affiliate spec; Bookshop geo-gated US/UK. |
| L7 | Journal vs. Blog distinct editors — finalize separation, locks, permissions | ⬜ | Mostly built; needs polish + permissions audit. |

---

## FUTURE / DEFERRED

| # | Item | Status |
|---|---|---|
| F1 | Membership dashboard enhancement (post-stabilization analytics) | 📅 |
| F2 | AI-assisted moderation prompt (guideline detection) | 📅 |
| F3 | AISEO citation audit (structured data + clear writing pass) | 📅 Sub-task of L4 |

---

## Author attribution requirements (cross-cutting — applies everywhere content is shown)

Already largely in place. Each piece of content must surface the author's:
- Profile image (uploaded — depends on M2 for non-WP authors)
- Author bio
- Optional: linked social accounts, website URL

Done today via the `authors` table. Verified during launch week.

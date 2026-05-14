# Post Processing Agent — Roadmap

Phase 1 (indexation pillar) shipped. Notes below for when Joel finishes the
external setup and we resume.

## Phase 1 — done
- Schema: `post_processing_log`, `post_processing_weights` (in `docs/post-processing-schema.sql`).
- Checks live: canonical present/correct, syndication source, sitemap inclusion, Wayback snapshot.
- GSC indexed: returns `null` (unknown) — UI shows "?" with "awaiting GSC API".
- Admin: `/admin/post-processing` queue with per-row recheck, batch run (50 posts), editor override (ok / needs_attention / ignored + note).

## Phase 1 follow-up — unblock GSC

**Blocker:** `GA4_SERVICE_ACCOUNT_JSON` service account is not yet a user in Google Search Console.

**Joel's action:**
1. Open the JSON, copy the `client_email` value (looks like `…@…iam.gserviceaccount.com`).
2. Search Console → Settings → Users and permissions → **Add user** → paste that email, permission level: **Restricted** (or higher).
3. Tell me when done. No code deploy needed yet.

**My action after Joel confirms:**
- Swap the body of `checkGscIndexed` in `app/lib/postProcessing.ts` to call the URL Inspection API:
  - `POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect`
  - body: `{ inspectionUrl, siteUrl: "sc-domain:autisable.com" }`
  - auth: JWT from `GA4_SERVICE_ACCOUNT_JSON` with scope `https://www.googleapis.com/auth/webmasters.readonly`.
- Update the queue UI to drop the "awaiting" label once we get real booleans back.
- That's a ~30-line change, no schema migration.

## Phase 2 — priority scoring

Spec is in the shared agent doc. Weights table is already seeded — no migration needed.

Build order when we resume:
1. Add `priority_score`, `priority_reasons[]` writes to `post_processing_log` via a new `computePriority(post, weights)` function.
2. Signal sources, easiest to hardest:
   - **Audience alignment** (category + tag taxonomy match) — pure DB, no APIs.
   - **Syndicated partner** flag — derivable from `is_syndicated` + author lookup.
   - **Affiliate-ready** — match post tags against `affiliates.tag_filter[]`.
   - **Internal-link opportunity** — keyword overlap against an embedding index (defer until we know it pays).
   - **Seasonal relevance** — compare post tags/category to a small calendar of recurring topics (autism acceptance month, IEP season, etc.). Hand-maintained list, no API.
   - **Trending topic** — GSC Search Analytics API (same service account as Phase 1 GSC unblock), then later Google Trends.
   - **Age + traffic history** — GA4 (already wired) + GSC.
3. Expose weight tuning in `/admin/post-processing` (Settings tab) so admins adjust without a deploy.

## Phase 3 — triggers + EEAT

After Phase 2 stabilises:
- **EEAT flags** — author byline linked, bio length, external citation count, image alt presence, medical-claim regex without disclaimer. Advisory only. Likely an LLM call per flagged post to generate the "would benefit from…" narrative.
- **Triggers** — nightly Vercel cron using `CRON_SECRET` to re-batch the latest N posts; webhook on new post insert for instant scoring.

## What I deliberately did NOT build

- LLM-based EEAT narrative (Phase 3, OpenAI per-post; not free to run on 4k posts).
- Cron job (no value until reports stabilise; can add in <30 min when needed).
- Sanity webhook trigger (the spec mentioned Sanity but Autisable is on Supabase/Next; trigger will be a Supabase Edge Function or a Vercel cron, decided when we get there).

## File map for resuming

- `app/lib/postProcessing.ts` — pure check functions. Add `computePriority` here next.
- `app/api/admin/post-processing/route.ts` — GET/POST/PATCH. The POST batch loop is where Phase 2 scoring slots in.
- `app/admin/post-processing/page.tsx` — queue UI. Phase 2 adds a sort-by-priority filter + score column.
- `docs/post-processing-schema.sql` — applied; weights are seeded with the spec's suggested values.

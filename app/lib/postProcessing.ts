// Phase 1 of the Autisable Post Processing Agent (APPA) — the indexation
// pillar. Given a post row, computes the agent's check results without
// any LLM calls and without any external paid APIs (the Wayback Machine
// is public; the GSC API is left as a stub until credentials are wired).
//
// Each result field corresponds to a column on post_processing_log.

const SITE_ORIGIN = "https://autisable.com";

export interface CheckablePost {
  id: string;
  slug: string;
  canonical_url: string | null;
  is_syndicated: boolean | null;
}

export interface IndexationResult {
  post_id: string;
  canonical_present: boolean;
  canonical_correct: boolean;
  canonical_url: string | null;
  syndication_canonical_source: "autisable" | "origin" | "missing" | "not_applicable";
  sitemap_present: boolean;
  gsc_indexed: boolean | null;
  gsc_indexed_checked_at: string | null;
  wayback_archived: boolean;
  wayback_snapshot_url: string | null;
  checked_at: string;
}

/**
 * Decides whether a canonical URL is "correct" for a given post:
 *   - Owned content (not syndicated): canonical should point at our own
 *     /blog/{slug}/ URL (self-canonical). A missing canonical is OK
 *     because Next handles it, but if one IS set it should be self.
 *   - Syndicated content: canonical should point at the origin (anything
 *     NOT under autisable.com). A canonical pointing back at us would
 *     contradict the "syndicated, give credit to source" pattern.
 *
 * "Source" classification is derived independently so the queue page
 * can show *why* a row is flagged, not just that it is.
 */
export function classifyCanonical(post: CheckablePost): {
  canonical_present: boolean;
  canonical_correct: boolean;
  syndication_canonical_source: IndexationResult["syndication_canonical_source"];
} {
  const url = post.canonical_url?.trim() || "";
  const present = url.length > 0;
  const ownUrl = `${SITE_ORIGIN}/blog/${post.slug}/`;
  const pointsToAutisable = present && url.startsWith(SITE_ORIGIN);
  const isSyndicated = !!post.is_syndicated;

  let source: IndexationResult["syndication_canonical_source"];
  if (!isSyndicated) {
    source = "not_applicable";
  } else if (!present) {
    source = "missing";
  } else if (pointsToAutisable) {
    source = "autisable";
  } else {
    source = "origin";
  }

  let correct: boolean;
  if (isSyndicated) {
    // Syndicated rows should NOT canonical back to us.
    correct = present && !pointsToAutisable;
  } else if (!present) {
    // Owned content with no canonical is fine — Next.js renders a
    // self-canonical via metadata.alternates fallback.
    correct = true;
  } else {
    correct = url === ownUrl;
  }

  return { canonical_present: present, canonical_correct: correct, syndication_canonical_source: source };
}

/**
 * Checks whether the post's URL is present in the live sitemap. Our
 * sitemap is dynamic (app/sitemap.xml/route.ts), so this resolves the
 * actual current generation, not a static snapshot.
 *
 * Cached across calls in the same Node process: parsing the sitemap on
 * every batch row would be wasted work, and the sitemap doesn't change
 * within a single audit run.
 */
let sitemapCache: { urls: Set<string>; expiresAt: number } | null = null;
const SITEMAP_TTL_MS = 5 * 60 * 1000;

export async function loadSitemapUrls(): Promise<Set<string>> {
  if (sitemapCache && Date.now() < sitemapCache.expiresAt) return sitemapCache.urls;
  try {
    const res = await fetch(`${SITE_ORIGIN}/sitemap.xml`, { cache: "no-store" });
    if (!res.ok) {
      sitemapCache = { urls: new Set(), expiresAt: Date.now() + SITEMAP_TTL_MS };
      return sitemapCache.urls;
    }
    const xml = await res.text();
    const urls = new Set<string>();
    for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      urls.add(match[1].trim());
    }
    sitemapCache = { urls, expiresAt: Date.now() + SITEMAP_TTL_MS };
    return urls;
  } catch {
    sitemapCache = { urls: new Set(), expiresAt: Date.now() + SITEMAP_TTL_MS };
    return sitemapCache.urls;
  }
}

/**
 * Public Wayback Machine availability check. Free, no auth. Falls back
 * to "not archived" on any error — wayback is the canary signal, not a
 * load-bearing dependency.
 */
export async function checkWayback(postUrl: string): Promise<{
  wayback_archived: boolean;
  wayback_snapshot_url: string | null;
}> {
  try {
    const res = await fetch(
      `https://archive.org/wayback/available?url=${encodeURIComponent(postUrl)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return { wayback_archived: false, wayback_snapshot_url: null };
    const data = (await res.json()) as {
      archived_snapshots?: { closest?: { available?: boolean; url?: string } };
    };
    const snap = data.archived_snapshots?.closest;
    if (snap?.available && snap.url) {
      return { wayback_archived: true, wayback_snapshot_url: snap.url };
    }
    return { wayback_archived: false, wayback_snapshot_url: null };
  } catch {
    return { wayback_archived: false, wayback_snapshot_url: null };
  }
}

/**
 * Placeholder for the GSC Indexing API check. Returns null until a
 * service account with Search Console access is configured. Treat null
 * as "unknown" in the UI rather than "not indexed" — we don't want
 * editors chasing fake red flags.
 *
 * Wiring this up later: GA4_SERVICE_ACCOUNT_JSON already exists in the
 * project env; the same service account email can be added under
 * Search Console → Settings → Users and permissions, then this function
 * swaps in a call to https://searchconsole.googleapis.com/v1/urlInspection/index:inspect.
 */
export async function checkGscIndexed(_postUrl: string): Promise<{
  gsc_indexed: boolean | null;
  gsc_indexed_checked_at: string | null;
}> {
  return { gsc_indexed: null, gsc_indexed_checked_at: null };
}

/**
 * Runs every Phase 1 check for a single post and returns the row that
 * should be written to post_processing_log. Concurrency-safe: callers
 * can run multiple of these in parallel (the sitemap fetch is cached).
 */
export async function runIndexationChecks(post: CheckablePost): Promise<IndexationResult> {
  const postUrl = `${SITE_ORIGIN}/blog/${post.slug}/`;
  const [sitemap, wayback, gsc] = await Promise.all([
    loadSitemapUrls(),
    checkWayback(postUrl),
    checkGscIndexed(postUrl),
  ]);
  const canonical = classifyCanonical(post);

  return {
    post_id: post.id,
    ...canonical,
    canonical_url: post.canonical_url,
    sitemap_present: sitemap.has(postUrl),
    gsc_indexed: gsc.gsc_indexed,
    gsc_indexed_checked_at: gsc.gsc_indexed_checked_at,
    wayback_archived: wayback.wayback_archived,
    wayback_snapshot_url: wayback.wayback_snapshot_url,
    checked_at: new Date().toISOString(),
  };
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth protection handled client-side to avoid cookie timing issues
const PROTECTED_PREFIXES: string[] = [];

// Module-level cache for the redirects table. Edge runtime reuses the module
// across requests within a warm instance, so we only fetch from Supabase once
// per minute per instance. Cold starts pay the lookup cost; subsequent
// requests hit memory. New admin-created redirects take effect within ~60s.
type RedirectEntry = { to: string; status: number };
let redirectsCache: { map: Map<string, RedirectEntry>; expiresAt: number } | null = null;
const REDIRECTS_TTL_MS = 60_000;

async function getRedirects(): Promise<Map<string, RedirectEntry>> {
  if (redirectsCache && Date.now() < redirectsCache.expiresAt) {
    return redirectsCache.map;
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return redirectsCache?.map ?? new Map();
  }
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/redirects?select=from_path,to_path,status_code`,
      {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        // Edge fetches default to caching; force fresh so new admin
        // redirects are picked up at the next TTL boundary, not stuck on a
        // cached HTTP response.
        cache: "no-store",
      }
    );
    if (!res.ok) {
      // On transient supabase failure: keep serving the previous cache rather
      // than dropping all redirects on every request.
      return redirectsCache?.map ?? new Map();
    }
    const rows = (await res.json()) as Array<{
      from_path: string;
      to_path: string;
      status_code: number;
    }>;
    const map = new Map<string, RedirectEntry>(
      rows.map((r) => [r.from_path, { to: r.to_path, status: r.status_code }])
    );
    redirectsCache = { map, expiresAt: Date.now() + REDIRECTS_TTL_MS };
    return map;
  } catch {
    return redirectsCache?.map ?? new Map();
  }
}

// Routes that are known app routes (not dynamic pages)
const RESERVED_ROUTES = new Set([
  "blog",
  "about",
  "contact",
  "resources",
  "podcasts",
  "music",
  "community",
  "admin",
  "api",
  "dashboard",
  "register",
  "login",
  "privacy",
  "terms",
  "community-guidelines",
  "accessibility",
  "help",
  "search",
  "feed.xml",
  "sitemap.xml",
  "_next",
  "favicon.ico",
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Admin-managed redirects (admin/broken-links → "Add redirect") ──
  // Looked up first so an editor can override our programmatic redirects
  // below. Skip lookups for static asset paths so we don't burn fetch
  // bandwidth on requests the matcher already filters.
  if (
    !pathname.startsWith("/_next/") &&
    !pathname.startsWith("/api/") &&
    !pathname.includes(".")
  ) {
    const map = await getRedirects();
    const entry = map.get(pathname);
    if (entry) {
      const dest = entry.to.startsWith("http")
        ? entry.to
        : new URL(entry.to, request.url).toString();
      return NextResponse.redirect(dest, entry.status);
    }
  }

  // ── SEO: 301 redirect old WordPress date-based URLs ──
  // /2024/04/21/post-slug/ → /blog/post-slug/
  const dateSlugMatch = pathname.match(/^\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)\/?$/);
  if (dateSlugMatch) {
    const slug = dateSlugMatch[4];
    const destination = new URL(`/blog/${slug}/`, request.url);
    return NextResponse.redirect(destination, 301);
  }

  // ── SEO: Redirect old WordPress feed URLs ──
  if (pathname === "/feed" || pathname === "/feed/" || pathname === "/rss" || pathname === "/rss/") {
    return NextResponse.redirect(new URL("/feed.xml/", request.url), 301);
  }

  // ── SEO: Redirect old WordPress category URLs ──
  // /category/bloggers/ → /blog/?category=Bloggers
  const categoryMatch = pathname.match(/^\/category\/([^/]+)\/?$/);
  if (categoryMatch) {
    const cat = decodeURIComponent(categoryMatch[1]);
    return NextResponse.redirect(new URL(`/blog/?category=${cat}`, request.url), 301);
  }

  // ── SEO: Redirect old WordPress tag URLs ──
  const tagMatch = pathname.match(/^\/tag\/([^/]+)\/?$/);
  if (tagMatch) {
    const tag = decodeURIComponent(tagMatch[1]);
    return NextResponse.redirect(new URL(`/blog/?tag=${tag}`, request.url), 301);
  }

  // ── SEO: Redirect old WordPress author URLs ──
  const authorMatch = pathname.match(/^\/author\/([^/]+)\/?$/);
  if (authorMatch) {
    const author = decodeURIComponent(authorMatch[1]);
    return NextResponse.redirect(new URL(`/blog/?author=${author}`, request.url), 301);
  }

  // ── SEO: Redirect WordPress paginated archives ──
  // /page/2/ → /blog/
  if (pathname.match(/^\/page\/\d+\/?$/)) {
    return NextResponse.redirect(new URL("/blog/", request.url), 301);
  }

  // ── SEO: Redirect old WordPress admin/login ──
  if (pathname === "/wp-admin" || pathname.startsWith("/wp-admin/")) {
    return NextResponse.redirect(new URL("/admin/", request.url), 301);
  }
  if (pathname === "/wp-login.php") {
    return NextResponse.redirect(new URL("/login/", request.url), 301);
  }

  // ── SEO: Handle WordPress ?p=ID format ──
  const pParam = request.nextUrl.searchParams.get("p");
  if (pathname === "/" && pParam) {
    // Let it fall through — can't resolve numeric ID without DB lookup
    // These are rare and Google will deindex them over time
  }

  // ── Auth: Check protected routes ──
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtected) {
    const hasAuthCookie = request.cookies.getAll().some(
      (cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token")
    );

    if (!hasAuthCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Forward the original pathname so app/not-found.tsx can log the 404
  // request URL — Next.js doesn't expose it in the not-found server
  // component otherwise.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)).*)",
  ],
};

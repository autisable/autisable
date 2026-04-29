import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth protection handled client-side to avoid cookie timing issues
const PROTECTED_PREFIXES: string[] = [];

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

  // ── SEO: 301 redirect old WordPress date-based URLs ──
  // /2024/04/21/post-slug/ → /blog/post-slug/
  const dateSlugMatch = pathname.match(/^\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)\/?$/);
  if (dateSlugMatch) {
    const slug = dateSlugMatch[4];
    const destination = new URL(`/blog/${slug}/`, request.url);
    return NextResponse.redirect(destination, 301);
  }

  // ── SEO: Redirect old WordPress feed URLs ──
  if (pathname === "/feed" || pathname === "/feed/") {
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)).*)",
  ],
};

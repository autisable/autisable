# Broken-Links Audit + Admin-Managed Redirects — Portable Recipe

Drop-in module for any Next.js 15 + Supabase project. Gives you:

- **404 log** — every 404 hit is captured with URL, referrer, user-agent, timestamp
- **Admin UI at `/admin/broken-links`** — groups 404s by URL, sorts by hit count, shows top referrers/user-agents per group
- **Inline 301 redirect creation** — paste a destination URL, click button, future hits redirect via middleware (60s edge cache)
- **Redirects tab** — view + remove existing rules

## 1. Run this SQL in Supabase

```sql
CREATE TABLE IF NOT EXISTS link_404_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_link_404_url ON link_404_log(url);
CREATE INDEX IF NOT EXISTS idx_link_404_created ON link_404_log(created_at DESC);
ALTER TABLE link_404_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read 404 log" ON link_404_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin')
);
CREATE POLICY "Admins can delete 404 log" ON link_404_log FOR DELETE USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin')
);

CREATE TABLE IF NOT EXISTS redirects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_path TEXT UNIQUE NOT NULL,
  to_path TEXT NOT NULL,
  status_code INT NOT NULL DEFAULT 301 CHECK (status_code IN (301, 302, 307, 308)),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_redirects_from ON redirects(from_path);
ALTER TABLE redirects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage redirects" ON redirects FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin')
);
```

> Adjust `user_profiles.role = 'admin'` to whatever shape your project uses for admin-gating.

## 2. middleware.ts additions

Three pieces. Add to your existing `middleware.ts`.

### 2a. Module-level redirect cache (top of file)

```ts
type RedirectEntry = { to: string; status: number };
let redirectsCache: { map: Map<string, RedirectEntry>; expiresAt: number } | null = null;
const REDIRECTS_TTL_MS = 60_000;

async function getRedirects(): Promise<Map<string, RedirectEntry>> {
  if (redirectsCache && Date.now() < redirectsCache.expiresAt) return redirectsCache.map;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return redirectsCache?.map ?? new Map();
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/redirects?select=from_path,to_path,status_code`,
      {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        cache: "no-store",
      }
    );
    if (!res.ok) return redirectsCache?.map ?? new Map();
    const rows = (await res.json()) as Array<{ from_path: string; to_path: string; status_code: number }>;
    const map = new Map<string, RedirectEntry>(
      rows.map((r) => [r.from_path, { to: r.to_path, status: r.status_code }])
    );
    redirectsCache = { map, expiresAt: Date.now() + REDIRECTS_TTL_MS };
    return map;
  } catch {
    return redirectsCache?.map ?? new Map();
  }
}
```

### 2b. Redirect lookup at the START of the middleware function

```ts
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin-managed redirects — checked before any other logic.
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

  // ... your existing middleware logic ...
}
```

### 2c. Forward x-pathname so not-found.tsx can read the URL

Replace your `return NextResponse.next()` with:

```ts
const requestHeaders = new Headers(request.headers);
requestHeaders.set("x-pathname", pathname);
return NextResponse.next({ request: { headers: requestHeaders } });
```

## 3. app/not-found.tsx — log every 404

Add the imports + the logging block at the top of the server component:

```tsx
import { headers } from "next/headers";
import { supabaseAdmin } from "@/app/lib/supabase"; // your service-role client

export const dynamic = "force-dynamic";

export default async function NotFound() {
  const h = await headers();
  const path = h.get("x-pathname");
  const shouldLog =
    supabaseAdmin &&
    path &&
    !path.startsWith("/admin") &&
    !path.startsWith("/api/") &&
    !path.startsWith("/_next/");
  if (shouldLog) {
    await supabaseAdmin.from("link_404_log").insert({
      url: path,
      referrer: h.get("referer") || null,
      user_agent: h.get("user-agent") || null,
    });
  }

  // ... your existing 404 page UI ...
}
```

> The `path.startsWith("/admin")` exclusion exists because admin pages 404 for logged-out users during the auth-gate redirect dance — those aren't real broken links.

## 4. app/admin/broken-links/page.tsx — admin UI

Full file — ~280 lines. Copy from the source repo:

**Source:** `app/admin/broken-links/page.tsx` (in the autisable repo)

Imports to swap for your project:
- `getSupabase()` from `@/app/lib/supabase-browser` → your browser-client wrapper
- Tailwind `bg-brand-blue`, `text-brand-red`, etc. → your design tokens
- `<Link href="/admin">` → wherever your admin home lives

Everything else (state, grouping logic, redirect creation, table layout) is project-agnostic.

## 5. Add the admin tile

Wherever your admin home renders nav tiles, add:

```ts
{
  label: "Broken Links",
  href: "/admin/broken-links",
  description: "Audit 404 hits and add 301 redirects to the right page",
  icon: "M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
}
```

## Adaptation checklist

- [ ] Run the SQL (and adjust `user_profiles.role` lookup if your role gating differs)
- [ ] Confirm env vars `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- [ ] Merge the three middleware pieces (cache, lookup, x-pathname)
- [ ] Add the logging block to `not-found.tsx`
- [ ] Copy `app/admin/broken-links/page.tsx`, swap imports + Tailwind tokens
- [ ] Add the admin home tile

## Notes

- **Cache window:** new redirects take effect within ~60s. Adjust `REDIRECTS_TTL_MS` if you want faster/slower.
- **Cold starts:** Edge runtime modules are reused per warm instance. First request to a new instance pays one Supabase REST round-trip (~50ms); subsequent requests are instant lookups.
- **Bot noise:** vuln scanners can hammer 404 endpoints. The grouped admin view surfaces real high-impact URLs above the noise. If the log table grows large, add a periodic cleanup or rate-limit the `not-found.tsx` insert.
- **301 vs 302:** the redirects table allows 301/302/307/308. Default 301 is right for "this URL moved permanently". Use 302 for temporary, 307/308 if you're preserving the request method (matters for non-GET).

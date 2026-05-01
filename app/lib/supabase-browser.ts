import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  // Helpful diagnostic: log to the browser console exactly what's configured.
  // Lets us verify in DevTools that env vars are actually baked into the build,
  // not just whether the dummy proxy is being returned.
  if (typeof window !== "undefined") {
    if (!url || !key) {
      console.warn(
        "[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is empty in this build — env vars didn't bake in. Check Vercel env vars + redeploy without build cache."
      );
    }
  }

  if (!url || !key) {
    // Return a dummy client during SSR/prerender — will be replaced on client hydration
    return new Proxy({} as SupabaseClient, {
      get: () => () => ({ data: null, error: null, count: null }),
    });
  }

  _client = createClient(url, key);
  return _client;
}

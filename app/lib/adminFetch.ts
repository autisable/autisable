"use client";

import { getSupabase } from "./supabase-browser";

/**
 * Fetch wrapper that adds the current Supabase session JWT as a Bearer token.
 *
 * Why: Supabase v2's browser client stores sessions in localStorage by default
 * (no cookies), so the server-side `requireAdmin` cookie check can't see who
 * the user is. Sending the JWT explicitly closes that gap for admin API calls.
 */
export async function adminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(init?.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  return fetch(input, { ...init, headers });
}

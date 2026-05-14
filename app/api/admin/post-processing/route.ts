import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";
import { requireAdmin } from "@/app/lib/adminAuth";
import { runIndexationChecks, type CheckablePost } from "@/app/lib/postProcessing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A batch run touches up to BATCH_LIMIT posts; each Wayback API call is
// ~150-400ms. Leave headroom against Vercel's default timeout.
export const maxDuration = 60;

const BATCH_LIMIT = 50;

/**
 * GET — Return the latest log rows joined with post metadata so the
 * admin queue can render. Supports a `?filter=needs_attention` to
 * surface posts where the agent flagged something or an editor marked
 * them needing attention.
 */
export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const filter = req.nextUrl.searchParams.get("filter") || "all";
  const limit = Math.min(
    500,
    Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 200)
  );

  const { data: logs } = await supabaseAdmin
    .from("post_processing_log")
    .select("*")
    .order("checked_at", { ascending: false })
    .limit(limit);

  const rows = (logs || []) as Array<Record<string, unknown> & { post_id: string }>;
  if (rows.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const postIds = rows.map((r) => r.post_id);
  const { data: posts } = await supabaseAdmin
    .from("blog_posts")
    .select("id, slug, title, date, category, author_name, is_syndicated, is_published")
    .in("id", postIds);

  const postMap = new Map((posts || []).map((p) => [p.id, p]));
  const merged = rows.map((r) => ({
    ...r,
    post: postMap.get(r.post_id) || null,
  }));

  const filtered = merged.filter((row) => {
    if (filter === "all") return true;
    const needsAttention = needsAttentionForRow(row);
    if (filter === "needs_attention") return needsAttention;
    if (filter === "ok") return !needsAttention;
    return true;
  });

  return NextResponse.json({ data: filtered });
}

/**
 * POST — Run the indexation checks. Body shapes:
 *   { post_id: "..." }                  → single post
 *   { batch: true, limit?: number }     → walk published posts and re-check
 */
export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  let body: { post_id?: string; batch?: boolean; limit?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.batch) {
    const limit = Math.min(BATCH_LIMIT, Math.max(1, body.limit || BATCH_LIMIT));
    const { data: posts } = await supabaseAdmin
      .from("blog_posts")
      .select("id, slug, canonical_url, is_syndicated")
      .eq("is_published", true)
      .order("date", { ascending: false })
      .limit(limit);

    if (!posts || posts.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    // Modest parallelism — Wayback handles ~5 concurrent fine, and we want
    // to leave room for the sitemap fetch + supabase upserts. If we ever
    // run into rate limits we can throttle here.
    const results = await Promise.all(
      (posts as CheckablePost[]).map((p) => runIndexationChecks(p))
    );

    await supabaseAdmin.from("post_processing_log").upsert(
      results.map((r) => ({ ...r })),
      { onConflict: "post_id" }
    );

    return NextResponse.json({ ok: true, processed: results.length });
  }

  if (!body.post_id) {
    return NextResponse.json(
      { error: "Provide either post_id or batch: true" },
      { status: 400 }
    );
  }

  const { data: post } = await supabaseAdmin
    .from("blog_posts")
    .select("id, slug, canonical_url, is_syndicated")
    .eq("id", body.post_id)
    .single();
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const result = await runIndexationChecks(post as CheckablePost);
  await supabaseAdmin
    .from("post_processing_log")
    .upsert({ ...result }, { onConflict: "post_id" });

  return NextResponse.json({ ok: true, result });
}

/**
 * PATCH — editor override. Lets an editor mark a row as "ok",
 * "needs_attention", or "ignored" with an optional note. The agent
 * advises; the editor decides — overrides take precedence in the UI.
 */
export async function PATCH(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  let body: {
    post_id?: string;
    override_status?: "ok" | "needs_attention" | "ignored" | null;
    override_note?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.post_id) {
    return NextResponse.json({ error: "post_id required" }, { status: 400 });
  }
  if (
    body.override_status !== null &&
    body.override_status !== undefined &&
    !["ok", "needs_attention", "ignored"].includes(body.override_status)
  ) {
    return NextResponse.json({ error: "invalid override_status" }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  let overrideBy: string | null = null;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    overrideBy = user?.id || null;
  }

  const { error } = await supabaseAdmin
    .from("post_processing_log")
    .update({
      override_status: body.override_status ?? null,
      override_note: body.override_note ?? null,
      override_by: overrideBy,
      override_at: new Date().toISOString(),
    })
    .eq("post_id", body.post_id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Mirrors the UI logic in /admin/post-processing — kept here too so the
// server can filter without round-tripping the whole table.
function needsAttentionForRow(row: Record<string, unknown>): boolean {
  if (row.override_status === "ignored" || row.override_status === "ok") return false;
  if (row.override_status === "needs_attention") return true;
  if (row.canonical_present === false) return true;
  if (row.canonical_correct === false) return true;
  if (row.sitemap_present === false) return true;
  // gsc_indexed === null is "unknown", not "needs attention" — don't surface
  // until credentials are wired and we can trust the signal.
  if (row.gsc_indexed === false) return true;
  return false;
}

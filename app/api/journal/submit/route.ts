import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-side endpoint for "Submit to Editors" on /dashboard/journal/[id].
 *
 * Why this exists: the member-facing flow used to do
 * `supabase.from('blog_posts').insert(...)` from the browser. The
 * blog_posts INSERT policy is admin-only, so RLS silently rejected
 * every member submission and the code didn't check `.error`. The
 * member saw "submitted" but no row ever landed — Joel called it
 * out as data loss.
 *
 * Fix: do every write through this endpoint with the service role.
 * Caller authenticates via the standard Supabase Bearer header.
 */
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const accessToken = authHeader.slice(7).trim();
  const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
  if (!user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  let body: {
    entryId?: string;
    title?: string;
    content?: string;
    visibility?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const entryId = body.entryId?.trim();
  const title = (body.title || "").trim() || "Untitled";
  const content = (body.content || "").trim();
  const visibility = body.visibility || "private";

  if (!entryId || !/^[0-9a-f-]{36}$/i.test(entryId)) {
    return NextResponse.json({ error: "Invalid entryId" }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: "Journal content is empty — nothing to submit." }, { status: 400 });
  }

  // 1. Confirm the journal entry exists and belongs to this user.
  //    Service-role read so RLS doesn't get in the way; ownership is
  //    enforced explicitly via the user_id check.
  const { data: entry, error: entryErr } = await supabaseAdmin
    .from("journal_entries")
    .select("id, user_id, submission_status")
    .eq("id", entryId)
    .single();
  if (entryErr || !entry) {
    return NextResponse.json({ error: "Journal entry not found." }, { status: 404 });
  }
  if (entry.user_id !== user.id) {
    return NextResponse.json({ error: "You can only submit your own entries." }, { status: 403 });
  }
  if (entry.submission_status === "submitted" || entry.submission_status === "under_review") {
    return NextResponse.json(
      { error: "This entry has already been submitted." },
      { status: 409 }
    );
  }

  // 2. Lock the journal entry into 'submitted' state. Member side reads
  //    submission_status to disable the Submit button on subsequent
  //    visits.
  const { error: lockErr } = await supabaseAdmin
    .from("journal_entries")
    .update({
      title,
      content,
      visibility,
      submission_status: "submitted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId);
  if (lockErr) {
    return NextResponse.json(
      { error: `Couldn't lock the entry: ${lockErr.message}` },
      { status: 500 }
    );
  }

  // 3. Resolve (or create) the authors row backing this member's
  //    byline. Same logic the old client-side path used — preserved
  //    so admin-side bylines render the member's profile, not a
  //    blank placeholder.
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  let authorId: string | null = null;
  if (profile?.display_name) {
    const byLink = await supabaseAdmin
      .from("authors")
      .select("id")
      .eq("user_profile_id", user.id)
      .maybeSingle();
    if (byLink.data) {
      authorId = byLink.data.id;
    } else {
      const byName = await supabaseAdmin
        .from("authors")
        .select("id, user_profile_id")
        .eq("display_name", profile.display_name)
        .maybeSingle();
      if (byName.data) {
        authorId = byName.data.id;
        if (!byName.data.user_profile_id) {
          await supabaseAdmin
            .from("authors")
            .update({ user_profile_id: user.id })
            .eq("id", byName.data.id);
        }
      } else {
        const { data: created } = await supabaseAdmin
          .from("authors")
          .insert({ display_name: profile.display_name, user_profile_id: user.id })
          .select("id")
          .single();
        if (created) authorId = created.id;
      }
    }
  }

  // 4. Create the pending blog_posts row editors will work on.
  //    Slug is timestamp-suffixed so two submissions with the same
  //    title don't collide on the UNIQUE constraint.
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  const uniqueSlug = `${baseSlug || "untitled"}-${Date.now().toString(36)}`;
  const stripped = content.replace(/<[^>]*>/g, "").trim();

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from("blog_posts")
    .insert({
      title,
      slug: uniqueSlug,
      content,
      excerpt: stripped.slice(0, 280),
      category: "Bloggers",
      date: new Date().toISOString(),
      is_published: false,
      draft_status: "pending_review",
      is_syndicated: false,
      author_id: authorId,
      author_name: profile?.display_name || null,
      submitted_by_user_id: user.id,
      source_journal_id: entryId,
    })
    .select("id")
    .single();
  if (insertErr || !inserted) {
    return NextResponse.json(
      { error: `Couldn't create the pending post: ${insertErr?.message || "unknown"}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    postId: inserted.id,
    slug: uniqueSlug,
  });
}

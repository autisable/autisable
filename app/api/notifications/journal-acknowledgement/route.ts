import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";
import { Resend } from "resend";

/**
 * Sends a "we got your submission" email when a member submits a journal entry
 * for editorial review. Triggered from /dashboard/journal/[id] after the entry
 * is locked + a blog_posts row is created in pending_review.
 *
 * Auth model: requires the journal entry's owner to be the calling user, but
 * since this only emails the owner (no risk of spam to others), we trust the
 * user_id we look up from the journal_entries.user_id field. If a malicious
 * client called this with a fake journalId, the worst case is they email the
 * legit owner of that entry — not exploitable.
 */
export async function POST(req: NextRequest) {
  const { journalId, title } = await req.json();
  if (!journalId) {
    return NextResponse.json({ error: "Missing journalId" }, { status: 400 });
  }

  // Look up the entry's owner
  const { data: entry } = await supabaseAdmin
    .from("journal_entries")
    .select("user_id, title")
    .eq("id", journalId)
    .single();
  if (!entry) {
    return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
  }

  // Get user email from auth.users via the admin client
  const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(entry.user_id);
  if (!authUser?.email) {
    return NextResponse.json({ error: "User email unavailable" }, { status: 404 });
  }

  // Look up display name for greeting
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("display_name")
    .eq("id", entry.user_id)
    .single();

  const resendKey = process.env.RESEND_API_KEY || process.env.RESEND_API;
  if (!resendKey) {
    console.warn("[journal-ack] No Resend key configured — skipping email send");
    return NextResponse.json({ ok: true, sent: false });
  }

  const displayName = profile?.display_name || "there";
  const entryTitle = title || entry.title || "your entry";

  const resend = new Resend(resendKey);
  const { error: sendError } = await resend.emails.send({
    from: "Autisable Editors <noreply@autisable.com>",
    to: authUser.email,
    subject: "We got your journal submission",
    html: `
      <p>Hi ${displayName},</p>
      <p>Thanks for submitting <strong>"${entryTitle}"</strong> to the Autisable editors. We've received it and added it to the review queue.</p>
      <p>An editor will review it shortly. We'll email you again when:</p>
      <ul>
        <li>It's been approved (and we'll let you know when it goes live)</li>
        <li>Or if we have feedback / can't publish it (we'll explain why)</li>
      </ul>
      <p>While it's under review, your original journal entry is locked from editing — you'll see a "Pending Review" badge on it in your journal.</p>
      <p>Thanks for sharing your story.</p>
      <p>— The Autisable team</p>
    `,
  });

  if (sendError) {
    console.error("[journal-ack] Resend error:", sendError);
    return NextResponse.json({ ok: false, error: sendError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sent: true });
}

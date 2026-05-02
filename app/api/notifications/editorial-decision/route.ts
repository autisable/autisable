import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";
import { Resend } from "resend";

/**
 * Routes editorial state-change emails to the member who submitted a post:
 *   action=approved    → "great news, your post was approved" (still pending publish)
 *   action=rejected    → "we can't publish it yet — here's why" (includes reason)
 *   action=published   → "your post is now live" (with link)
 *
 * Triggered from PostEditor when draft_status / is_published transitions are
 * detected. Auth is implicit: only admin-side flows can trigger this (the
 * route trusts that draft_status changes are made by admins via the
 * admin-protected editor). The submitter learns about it via email; if the
 * submitter field is null (admin-created post), we no-op silently.
 */

type Action = "approved" | "rejected" | "published";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const postId = typeof body.postId === "string" ? body.postId : null;
  const action = body.action as Action;
  const reason = typeof body.reason === "string" ? body.reason : null;

  if (!postId || !["approved", "rejected", "published"].includes(action)) {
    return NextResponse.json({ error: "Missing postId or invalid action" }, { status: 400 });
  }

  const { data: post } = await supabaseAdmin
    .from("blog_posts")
    .select("title, slug, submitted_by_user_id, source_journal_id")
    .eq("id", postId)
    .single();

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // L7: when a blog post originated from a member's journal entry, mirror the
  // editorial decision back so the source journal updates from "submitted" to
  // the right state. Without this, rejected entries stay locked forever and
  // approved/published entries don't show their final status to the author.
  if (post.source_journal_id) {
    const journalStatus =
      action === "approved" ? "approved"
      : action === "published" ? "published"
      : "returned"; // rejected → unlock so the member can edit and resubmit
    await supabaseAdmin
      .from("journal_entries")
      .update({ submission_status: journalStatus, updated_at: new Date().toISOString() })
      .eq("id", post.source_journal_id);
  }

  // Admin-created posts have no submitter — nothing to email
  if (!post.submitted_by_user_id) {
    return NextResponse.json({ ok: true, sent: false, reason: "no_submitter" });
  }

  const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(post.submitted_by_user_id);
  if (!authUser?.email) {
    return NextResponse.json({ ok: true, sent: false, reason: "no_email" });
  }

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("display_name")
    .eq("id", post.submitted_by_user_id)
    .single();

  const displayName = profile?.display_name || "there";
  const safeTitle = (post.title || "your post").replace(/</g, "&lt;");

  const resendKey = process.env.RESEND_API_KEY || process.env.RESEND_API;
  if (!resendKey) {
    console.warn("[editorial-decision] No Resend key configured — skipping email send");
    return NextResponse.json({ ok: true, sent: false });
  }
  const resend = new Resend(resendKey);

  const { subject, html } = buildEmail(action, displayName, safeTitle, post.slug || "", reason);

  const { error: sendError } = await resend.emails.send({
    from: "Autisable Editors <noreply@autisable.com>",
    to: authUser.email,
    subject,
    html,
  });

  if (sendError) {
    console.error("[editorial-decision] Resend error:", sendError);
    // Still try to write the in-app notification — email failure shouldn't
    // strand the user without any signal at all.
  }

  // In-app notification (Q7): mirror the email so the member also sees this
  // in their notifications list when they next log in.
  const { title: notifTitle, message: notifMessage, link } = buildInAppNotification(action, post.title || "your post", post.slug || "");
  await supabaseAdmin.from("notifications").insert({
    user_id: post.submitted_by_user_id,
    type: `editorial_${action}`,
    title: notifTitle,
    message: notifMessage,
    link,
  });

  return NextResponse.json({ ok: true, sent: !sendError });
}

function buildInAppNotification(action: Action, title: string, slug: string) {
  if (action === "approved") {
    return {
      title: "Your post was approved",
      message: `"${title}" is queued for publication.`,
      link: "/dashboard/journal",
    };
  }
  if (action === "rejected") {
    return {
      title: "Your post needs revisions",
      message: `An editor sent "${title}" back with notes.`,
      link: "/dashboard/journal",
    };
  }
  return {
    title: "Your post is live",
    message: `"${title}" is now published.`,
    link: `/blog/${slug}/`,
  };
}

function buildEmail(action: Action, name: string, title: string, slug: string, reason: string | null) {
  if (action === "approved") {
    return {
      subject: `Approved: "${title}"`,
      html: `
        <p>Hi ${name},</p>
        <p>Good news — an editor has approved <strong>"${title}"</strong>. It's queued for publication and we'll email you again as soon as it goes live.</p>
        <p>Thanks for sharing your story.</p>
        <p>— The Autisable team</p>
      `,
    };
  }
  if (action === "rejected") {
    const reasonBlock = reason
      ? `<p><strong>Editor's note:</strong></p><blockquote style="border-left:3px solid #e4e4e7;padding-left:1em;color:#52525b;margin:0 0 1em 0;">${reason.replace(/</g, "&lt;").replace(/\n/g, "<br>")}</blockquote>`
      : `<p>The editor didn't leave a specific note this time.</p>`;
    return {
      subject: `Update on your submission: "${title}"`,
      html: `
        <p>Hi ${name},</p>
        <p>Thanks again for submitting <strong>"${title}"</strong>. After review, our editors weren't able to publish this one as-is.</p>
        ${reasonBlock}
        <p>Your original journal entry is unlocked again — you can edit and resubmit, or leave it as a private journal. We'd love to see another version if you'd like to revise.</p>
        <p>— The Autisable team</p>
      `,
    };
  }
  // published
  const liveUrl = `https://autisable.com/blog/${slug}/`;
  return {
    subject: `Your post is live: "${title}"`,
    html: `
      <p>Hi ${name},</p>
      <p><strong>"${title}"</strong> is now live on Autisable. Thanks for sharing it with the community.</p>
      <p><a href="${liveUrl}" style="color:#3b82f6;">Read it here</a> — feel free to share with friends and on your socials.</p>
      <p>— The Autisable team</p>
    `,
  };
}

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/app/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_CONTENT_TYPES = new Set(["activity_feed", "comment"]);
const RATE_LIMIT_WINDOW_MIN = 10;
const RATE_LIMIT_MAX = 5;

/**
 * Files a moderation report and pings moderators by email. Replaces the
 * client's direct supabase insert so the round-trip can both persist the
 * row and send the notification atomically — without an email, moderators
 * had to remember to check the queue, and reporters couldn't tell whether
 * their report was actually surfaced anywhere.
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

  let body: { content_type?: string; content_id?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { content_type, content_id, reason } = body;
  if (!content_type || !ALLOWED_CONTENT_TYPES.has(content_type)) {
    return NextResponse.json(
      { error: "content_type must be activity_feed or comment" },
      { status: 400 }
    );
  }
  if (!content_id || !/^[0-9a-f-]{36}$/i.test(content_id)) {
    return NextResponse.json({ error: "Invalid content_id" }, { status: 400 });
  }
  const reasonText = (reason || "").trim().slice(0, 500) || "Flagged for moderator review";

  // Cheap spam guard: at most RATE_LIMIT_MAX reports from this user in the
  // trailing window. Genuine reporting bursts (a thread going off the rails)
  // still fit; sockpuppet floods don't.
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000).toISOString();
  const { count: recent } = await supabaseAdmin
    .from("moderation_reports")
    .select("id", { count: "exact", head: true })
    .eq("reporter_id", user.id)
    .gte("created_at", since);
  if ((recent ?? 0) >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: `Too many reports. Please try again in ${RATE_LIMIT_WINDOW_MIN} minutes.` },
      { status: 429 }
    );
  }

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from("moderation_reports")
    .insert({
      reporter_id: user.id,
      content_type,
      content_id,
      reason: reasonText,
    })
    .select("id, created_at")
    .single();
  if (insertErr || !inserted) {
    return NextResponse.json(
      { error: insertErr?.message || "Failed to save report" },
      { status: 500 }
    );
  }

  // Best-effort email to all moderator+ profiles. Failures don't break the
  // report — the row is already saved and visible in the admin queue.
  const resendKey = process.env.RESEND_API_KEY || process.env.RESEND_API;
  if (resendKey) {
    try {
      const { data: mods } = await supabaseAdmin
        .from("user_profiles")
        .select("id, display_name")
        .in("role", ["moderator", "editor", "admin"]);
      const modIds = (mods || []).map((m) => m.id);
      const recipients: string[] = [];
      if (modIds.length > 0) {
        // Resolve emails via auth.admin.listUsers — user_profiles doesn't
        // store email directly. Limit to the moderator set so we don't
        // page through every user.
        const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        });
        const modIdSet = new Set(modIds);
        for (const u of usersList?.users || []) {
          if (modIdSet.has(u.id) && u.email) recipients.push(u.email);
        }
      }
      // Fallback to CONTACT_EMAIL so a misconfigured role table doesn't
      // silently swallow the alert.
      if (recipients.length === 0 && process.env.CONTACT_EMAIL) {
        recipients.push(process.env.CONTACT_EMAIL);
      }
      if (recipients.length > 0) {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: "Autisable <noreply@autisable.com>",
          to: recipients,
          subject: `[Autisable Moderation] ${content_type === "activity_feed" ? "Status update" : "Comment"} reported`,
          html: `
            <h2>New moderation report</h2>
            <p><strong>Type:</strong> ${content_type}</p>
            <p><strong>Reason:</strong> ${reasonText.replace(/</g, "&lt;")}</p>
            <p><strong>Reporter:</strong> ${user.email || user.id}</p>
            <p><a href="https://autisable.com/admin/moderation-reports">Review the queue &rarr;</a></p>
          `,
        });
      }
    } catch (err) {
      console.error("[moderation/report] email failed:", err);
    }
  }

  return NextResponse.json({ ok: true, id: inserted.id });
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";
import { Resend } from "resend";

const RATE_LIMIT_WINDOW_MIN = 10;
const RATE_LIMIT_MAX = 3;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { firstName, lastName, email, reason, message, company } = body;

  // Honeypot: humans don't see the `company` field; bots auto-fill it.
  // Return 200 silently so bots think it worked and don't retry.
  if (company && String(company).trim().length > 0) {
    console.log("[contact] Honeypot tripped — silently succeeding");
    return NextResponse.json({ ok: true });
  }

  if (!firstName || !lastName || !email || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Rate limit: at most RATE_LIMIT_MAX submissions from the same email in the
  // trailing RATE_LIMIT_WINDOW_MIN minutes. Cheap script-spam protection.
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000).toISOString();
  const { count: recentCount } = await supabaseAdmin
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", since);
  if ((recentCount ?? 0) >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: `Too many submissions. Please try again in ${RATE_LIMIT_WINDOW_MIN} minutes.` },
      { status: 429 }
    );
  }

  // Save to Supabase first — we want the message persisted even if email fails.
  await supabaseAdmin.from("contact_messages").insert({
    first_name: firstName,
    last_name: lastName,
    email,
    reason,
    message,
  });

  // Send notification email — accept either RESEND_API_KEY (canonical name)
  // or RESEND_API (Joel's current Vercel var name), so a rename isn't required.
  const resendKey = process.env.RESEND_API_KEY || process.env.RESEND_API;
  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const { error: sendError } = await resend.emails.send({
        // From must use the subdomain Resend verified (`send.autisable.com`),
        // not the apex `autisable.com`. The apex isn't verified in Resend.
        from: "Autisable <noreply@send.autisable.com>",
        to: process.env.CONTACT_EMAIL || "joel@autisable.com",
        replyTo: email,
        subject: `[Autisable Contact] ${reason || "General"} — ${firstName} ${lastName}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${firstName} ${lastName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Reason:</strong> ${reason || "Not specified"}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, "<br>")}</p>
        `,
      });
      if (sendError) {
        console.error("[contact] Resend send failed:", sendError);
      }
    } catch (e) {
      console.error("[contact] Resend threw:", e);
    }
  } else {
    console.warn("[contact] No RESEND_API_KEY / RESEND_API set — message saved to DB but no email sent.");
  }

  return NextResponse.json({ ok: true });
}

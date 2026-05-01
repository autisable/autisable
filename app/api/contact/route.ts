import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const { firstName, lastName, email, reason, message } = await req.json();

  if (!firstName || !lastName || !email || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Save to Supabase
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
        from: "Autisable <noreply@autisable.com>",
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

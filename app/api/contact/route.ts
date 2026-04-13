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

  // Send notification email
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Autisable <noreply@autisable.com>",
      to: process.env.CONTACT_EMAIL || "contact@autisable.com",
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
  }

  return NextResponse.json({ ok: true });
}

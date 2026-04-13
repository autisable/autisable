import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // Check if already subscribed
  const { data: existing } = await supabaseAdmin
    .from("newsletter_subscribers")
    .select("id, is_active")
    .eq("email", email.toLowerCase())
    .single();

  if (existing) {
    if (!existing.is_active) {
      // Reactivate
      await supabaseAdmin
        .from("newsletter_subscribers")
        .update({ is_active: true, unsubscribed_at: null })
        .eq("id", existing.id);
    }
    return NextResponse.json({ ok: true });
  }

  // Generate unsubscribe token
  const token = crypto.randomUUID();

  await supabaseAdmin.from("newsletter_subscribers").insert({
    email: email.toLowerCase(),
    is_active: true,
    unsubscribe_token: token,
  });

  return NextResponse.json({ ok: true });
}

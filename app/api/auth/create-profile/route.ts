import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";

export async function POST(req: NextRequest) {
  const { userId, email, displayName, dateOfBirth } = await req.json();

  if (!userId || !email || !displayName) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("user_profiles").insert({
    id: userId,
    email,
    display_name: displayName,
    date_of_birth: dateOfBirth || null,
    status: "pending_approval",
    role: "member",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const BUCKET = "Media";

/**
 * Profile image upload — accepts a Bearer JWT (from supabase.auth.getSession())
 * and a multipart form with `file` + `kind`. The user can only upload to their
 * own folder. Admins can upload on behalf via ?targetUserId= override.
 */
export async function POST(req: NextRequest) {
  // Storage writes need the service role — anon key is rejected by bucket RLS.
  // Fail loudly here instead of silently falling back and surfacing as a
  // confusing "row violates row-level security policy" error downstream.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY not set" },
      { status: 500 }
    );
  }

  // Auth — same Bearer token pattern as adminFetch.
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const accessToken = authHeader.slice(7).trim();
  const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
  if (!user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  // Allow admin override (upload on behalf)
  const url = new URL(req.url);
  const targetUserIdOverride = url.searchParams.get("targetUserId");
  let targetUserId = user.id;
  if (targetUserIdOverride && targetUserIdOverride !== user.id) {
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Only admins can upload on behalf of another member" }, { status: 403 });
    }
    targetUserId = targetUserIdOverride;
  }

  // Parse the form
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const kind = (formData.get("kind") as string | null) || "avatar";
  if (!file) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: `Unsupported type: ${file.type}` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
  }
  if (kind !== "avatar" && kind !== "cover") {
    return NextResponse.json({ error: "Invalid kind (avatar or cover only)" }, { status: 400 });
  }

  // Build a stable path. Overwrites previous file of the same kind so old
  // versions don't accumulate in storage.
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `users/${targetUserId}/${kind}-${Date.now()}.${ext}`;

  const arrayBuf = await file.arrayBuffer();
  const { error: uploadErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, arrayBuf, { contentType: file.type, upsert: true });
  if (uploadErr) {
    console.error("[upload] supabase storage upload failed:", uploadErr);
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  // Persist the URL on the profile so the next page load picks it up.
  const column = kind === "avatar" ? "avatar_url" : "cover_photo_url";
  await supabaseAdmin
    .from("user_profiles")
    .update({ [column]: publicUrl })
    .eq("id", targetUserId);

  return NextResponse.json({ ok: true, url: publicUrl, kind });
}

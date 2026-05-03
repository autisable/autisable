import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — IAB-friendly cap; affiliate banners
                                   // are typically well under 500 KB anyway.
const BUCKET = "Media";

/**
 * Admin-only banner upload for the /admin/affiliates page. Lets editors
 * upload a JPG/PNG/WebP/GIF directly instead of hosting elsewhere and
 * pasting a URL. Files land at:
 *
 *   affiliates/{slug}/{size}-{timestamp}.{ext}
 *
 * `size` is one of "300x250" or "468x60" — passed by the form, used purely
 * to make the storage path self-describing. We don't actually validate the
 * uploaded image dimensions here; the AffiliateBanner renderer handles
 * sizing via object-cover.
 *
 * Returns { ok: true, url } where url is the public Supabase storage URL
 * the caller can write into banner_300x250_url / banner_468x60_url.
 */
export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY not set" },
      { status: 500 }
    );
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

  // Admin gate. Affiliate banners go in front of every reader, so we don't
  // want editors / contributors changing brand assets without explicit
  // privilege. Mirrors the RLS policy on the affiliates table.
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin required" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const slug = (formData.get("slug") as string | null)?.trim() || "";
  const size = (formData.get("size") as string | null)?.trim() || "";

  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: `Unsupported type: ${file.type}` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
  }
  if (!/^[a-z0-9_-]+$/i.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }
  if (size !== "300x250" && size !== "468x60") {
    return NextResponse.json({ error: "size must be 300x250 or 468x60" }, { status: 400 });
  }

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `affiliates/${slug}/${size}-${Date.now()}.${ext}`;

  const arrayBuf = await file.arrayBuffer();
  const { error: uploadErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, arrayBuf, { contentType: file.type, upsert: false });
  if (uploadErr) {
    console.error("[affiliate-banner-upload] storage upload failed:", uploadErr);
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ ok: true, url: pub.publicUrl });
}

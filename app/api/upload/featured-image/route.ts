import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB — leaves headroom for unoptimized
                                   // hero photos editors paste in before we
                                   // resize them through the OG pipeline.
const BUCKET = "Media";

/**
 * Admin-only featured-image upload for the post editor. Lets editors fix
 * broken or missing post heroes directly instead of hunting down a URL.
 * Files land at:
 *
 *   blog/{slug-or-userId}/featured-{timestamp}.{ext}
 *
 * Returns { ok, url } — caller writes the URL into blog_posts.image.
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
  const slugRaw = (formData.get("slug") as string | null) || "";

  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: `Unsupported type: ${file.type}` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 8 MB)" }, { status: 400 });
  }

  // Path segment: use the slug when we have one (most edits do); fall back
  // to the user id so new-post uploads from before a slug is set still get
  // a deterministic, attributable path.
  const slugSafe = slugRaw.replace(/[^a-z0-9_-]+/gi, "-").replace(/-+/g, "-").slice(0, 80);
  const segment = slugSafe || user.id;

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `blog/${segment}/featured-${Date.now()}.${ext}`;

  const arrayBuf = await file.arrayBuffer();
  const { error: uploadErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, arrayBuf, { contentType: file.type, upsert: false });
  if (uploadErr) {
    console.error("[featured-image-upload] storage upload failed:", uploadErr);
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ ok: true, url: pub.publicUrl });
}

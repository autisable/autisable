import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";

export const runtime = "nodejs";

// Same edge-cache window as /api/og/[slug]/route.tsx — auto-derived OG images
// don't change unless the post's featured image does.
export const revalidate = 3600;

const BRAND_BLUE = "#3b82f6";

/**
 * "Featured-image OG" endpoint. Returns a clean 1200x630 PNG of the post's
 * featured image — no title overlay, no brand card. Used as the og:image
 * fallback when the editor hasn't uploaded a custom og_image but the post
 * does have a featured image set.
 *
 * Why we don't just point og:image directly at post.image:
 *   - Many featured images come from RSS imports (third-party hosts) and
 *     aren't 1200x630 — platforms then crop unpredictably.
 *   - Some featured-image URLs are slow / sometimes 404 — wrapping in this
 *     endpoint lets us cache at the edge and serve a known-good 1200x630.
 *   - This guarantees the <5MB OG-image limit (next/og PNGs are ~100-300KB).
 *
 * If the post has no featured image at all, callers should chain to
 * /api/og/[slug]/ instead — that's the branded text-card fallback.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: post } = await supabaseAdmin
    .from("blog_posts")
    .select("image, title")
    .eq("slug", slug)
    .single();

  // No featured image to render — emit a 1x1 brand swatch so callers don't
  // accidentally pin this URL on posts without an image. The expectation is
  // that generateMetadata picked this URL only when post.image is set.
  if (!post?.image) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: BRAND_BLUE,
            color: "white",
            fontSize: 48,
            fontFamily: "sans-serif",
          }}
        >
          Autisable
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: BRAND_BLUE,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.image}
          width={1200}
          height={630}
          alt={post.title || ""}
          style={{
            width: 1200,
            height: 630,
            objectFit: "cover",
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

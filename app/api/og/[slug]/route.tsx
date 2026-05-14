import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";

export const runtime = "nodejs";
export const revalidate = 3600;

const BRAND_BLUE = "#3b82f6";

/**
 * Legacy OG endpoint. We used to render a branded text card here
 * (image-left, title/byline/URL on the right) but social platforms
 * already provide title, URL, and excerpt chrome around the image — so
 * the post title was appearing twice in every preview. Per Joel's
 * direction, this now emits an image-only result identical to
 * /api/og/featured/[slug]/: just the featured image cleanly resized
 * to 1200x630, with a brand swatch fallback when the post has no
 * image at all.
 *
 * Kept in place (rather than deleted) because LinkedIn / FB / X cache
 * OG image URLs aggressively — 404ing this path would break previews
 * that haven't been re-scraped since the change.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: post } = await supabaseAdmin
    .from("blog_posts")
    .select("image, og_image, title")
    .eq("slug", slug)
    .single();

  const sourceImage = post?.og_image || post?.image;

  if (!sourceImage) {
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
            fontSize: 96,
            fontFamily: "sans-serif",
            fontWeight: 700,
            letterSpacing: 2,
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
          src={sourceImage}
          width={1200}
          height={630}
          alt={post?.title || ""}
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

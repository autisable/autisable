import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";

export const runtime = "nodejs";
// Auto-generated OG images don't change unless the post does. Cache for an hour
// at the edge; if the editor updates the title/image, we can bust this by
// changing the URL (e.g. ?v=updated_at) — handled in generateMetadata.
export const revalidate = 3600;

const BRAND_BLUE = "#3b82f6";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: post } = await supabaseAdmin
    .from("blog_posts")
    .select("title, image, category, author_name")
    .eq("slug", slug)
    .single();

  if (!post) {
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

  const title: string = post.title || "Autisable";
  const category: string | null = post.category;
  const author: string | null = post.author_name;
  const image: string | null = post.image;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "white",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Top stripe */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            background: BRAND_BLUE,
            display: "flex",
          }}
        />

        {image ? (
          // Layout: image on left half, content on right half
          <div style={{ display: "flex", width: "100%", height: "100%" }}>
            <img
              src={image}
              width={500}
              height={630}
              style={{
                width: 500,
                height: 630,
                objectFit: "cover",
              }}
              alt=""
            />
            <div
              style={{
                flex: 1,
                padding: "60px 60px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                {category ? (
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      color: BRAND_BLUE,
                      letterSpacing: 1.5,
                      textTransform: "uppercase",
                      marginBottom: 24,
                      display: "flex",
                    }}
                  >
                    {category}
                  </div>
                ) : null}
                <div
                  style={{
                    fontSize: 52,
                    fontWeight: 700,
                    color: "#18181b",
                    lineHeight: 1.15,
                    display: "flex",
                  }}
                >
                  {title.length > 100 ? title.slice(0, 100) + "…" : title}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {author ? (
                  <div
                    style={{
                      fontSize: 22,
                      color: "#52525b",
                      marginBottom: 8,
                      display: "flex",
                    }}
                  >
                    by {author}
                  </div>
                ) : null}
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: BRAND_BLUE,
                    display: "flex",
                  }}
                >
                  autisable.com
                </div>
              </div>
            </div>
          </div>
        ) : (
          // No featured image — full text layout with brand background
          <div
            style={{
              padding: "100px 80px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: "100%",
              height: "100%",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              {category ? (
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    color: BRAND_BLUE,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    marginBottom: 32,
                    display: "flex",
                  }}
                >
                  {category}
                </div>
              ) : null}
              <div
                style={{
                  fontSize: 72,
                  fontWeight: 700,
                  color: "#18181b",
                  lineHeight: 1.1,
                  display: "flex",
                }}
              >
                {title.length > 80 ? title.slice(0, 80) + "…" : title}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              {author ? (
                <div style={{ fontSize: 26, color: "#52525b", marginBottom: 8, display: "flex" }}>
                  by {author}
                </div>
              ) : null}
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: BRAND_BLUE,
                  display: "flex",
                }}
              >
                autisable.com
              </div>
            </div>
          </div>
        )}
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

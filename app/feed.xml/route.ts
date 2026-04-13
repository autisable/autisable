import { supabaseAdmin } from "@/app/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data: posts } = await supabaseAdmin
    .from("blog_posts")
    .select("slug, title, excerpt, date, category, author_name")
    .eq("is_published", true)
    .order("date", { ascending: false })
    .limit(50);

  const siteUrl = "https://autisable.com";

  const items = (posts || [])
    .map(
      (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${siteUrl}/blog/${post.slug}</link>
      <description><![CDATA[${post.excerpt || ""}]]></description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <guid>${siteUrl}/blog/${post.slug}</guid>
      ${post.category ? `<category>${post.category}</category>` : ""}
      ${post.author_name ? `<dc:creator><![CDATA[${post.author_name}]]></dc:creator>` : ""}
    </item>`
    )
    .join("");

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Autisable</title>
    <link>${siteUrl}</link>
    <description>Stories, podcasts, and resources for the autism community</description>
    <language>en-us</language>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new Response(feed, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}

import { supabaseAdmin } from "@/app/lib/supabase";

export const dynamic = "force-dynamic";

// XML-attribute escape — needed for image URLs that carry &, ?, etc.
// in their query strings (Supabase storage transform URLs do).
function attr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const { data: posts } = await supabaseAdmin
    .from("blog_posts")
    .select("slug, title, excerpt, date, category, author_name, image, og_image")
    .eq("is_published", true)
    // Future-dated posts are scheduled — keep them out of the RSS
    // feed until they go live, otherwise Mailchimp / LinkedIn auto-
    // posters would surface them early.
    .lte("date", new Date().toISOString())
    .order("date", { ascending: false })
    .limit(50);

  const siteUrl = "https://autisable.com";

  const items = (posts || [])
    .map((post) => {
      // Prefer og_image (explicitly editor-set for social) over the
      // featured image, fall back to image. Mailchimp's RSS-to-email
      // looks at media:content first, then enclosure, then the <img>
      // inside the description. We emit all three so every consumer
      // we care about (Mailchimp, LinkedIn auto-post, generic
      // readers) renders the hero.
      const heroUrl = post.og_image || post.image || null;
      const enclosureTag = heroUrl
        ? `<enclosure url="${attr(heroUrl)}" type="image/jpeg" length="0"/>\n      <media:content url="${attr(heroUrl)}" medium="image"/>`
        : "";

      // Embed the image into the description so the RSS-to-email
      // pipeline (Mailchimp) actually renders it inline — most email
      // readers don't pull enclosures into the message body.
      const descBody = post.excerpt || "";
      const description = heroUrl
        ? `<p><img src="${heroUrl}" alt="${(post.title || "").replace(/"/g, "")}" /></p>${descBody}`
        : descBody;

      return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${siteUrl}/blog/${post.slug}/</link>
      <description><![CDATA[${description}]]></description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <guid>${siteUrl}/blog/${post.slug}/</guid>
      ${post.category ? `<category>${post.category}</category>` : ""}
      ${post.author_name ? `<dc:creator><![CDATA[${post.author_name}]]></dc:creator>` : ""}
      ${enclosureTag}
    </item>`;
    })
    .join("");

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
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

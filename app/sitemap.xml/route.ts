import { supabaseAdmin } from "@/app/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const siteUrl = "https://autisable.com";

  const staticPages = [
    { url: "/", priority: "1.0" },
    { url: "/blog/", priority: "0.9" },
    { url: "/podcasts/", priority: "0.8" },
    { url: "/music/", priority: "0.7" },
    { url: "/community/", priority: "0.7" },
    { url: "/resources/", priority: "0.7" },
    { url: "/about/", priority: "0.6" },
    { url: "/contact/", priority: "0.5" },
    { url: "/register/", priority: "0.5" },
    { url: "/privacy/", priority: "0.3" },
    { url: "/terms/", priority: "0.3" },
    { url: "/community-guidelines/", priority: "0.3" },
    { url: "/accessibility/", priority: "0.3" },
  ];

  // Paginate through all published posts (Supabase default limit is 1,000)
  const posts: { slug: string; date: string; date_modified: string | null }[] = [];
  let from = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data } = await supabaseAdmin
      .from("blog_posts")
      .select("slug, date, date_modified")
      .eq("is_published", true)
      .order("date", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (!data || data.length === 0) break;
    posts.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const postEntries = posts.map(
    (post) => `
  <url>
    <loc>${siteUrl}/blog/${post.slug}/</loc>
    <lastmod>${new Date(post.date_modified || post.date).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
  );

  const staticEntries = staticPages.map(
    (page) => `
  <url>
    <loc>${siteUrl}${page.url}</loc>
    <changefreq>weekly</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  );

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticEntries.join("")}
  ${postEntries.join("")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}

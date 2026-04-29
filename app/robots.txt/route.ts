export const dynamic = "force-static";

export async function GET() {
  const siteUrl = "https://autisable.com";

  const body = `User-agent: *
Allow: /

# Block admin & member areas from indexing
Disallow: /admin/
Disallow: /admin
Disallow: /api/
Disallow: /dashboard/
Disallow: /dashboard
Disallow: /login/
Disallow: /register/

# Allow blog & static pages explicitly
Allow: /blog/
Allow: /podcasts/
Allow: /music/
Allow: /community/
Allow: /resources/
Allow: /about/
Allow: /contact/

Sitemap: ${siteUrl}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

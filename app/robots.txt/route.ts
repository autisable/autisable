export const dynamic = "force-static";

export async function GET() {
  const siteUrl = "https://autisable.com";

  const body = `# Autisable robots.txt
# Last updated: April 2026
# Maintainer: justin@autisable.com / jbowman@vizyplan.com

# ─────────────────────────────────────────────
# DEFAULT (Googlebot, Bingbot, etc.)
# Allow all standard search crawlers; block admin & member areas.
# ─────────────────────────────────────────────
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /admin
Disallow: /api/
Disallow: /dashboard/
Disallow: /dashboard
Disallow: /login/
Disallow: /register/

# ─────────────────────────────────────────────
# AI SEARCH CRAWLERS — ALLOWED
# These power AI search results (ChatGPT Search, Perplexity, etc.)
# and can drive referral traffic. We want our content cited.
# ─────────────────────────────────────────────

User-agent: OAI-SearchBot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/

User-agent: PerplexityBot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/

User-agent: ChatGPT-User
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/

User-agent: Claude-User
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/

# ─────────────────────────────────────────────
# AI TRAINING CRAWLERS — ALLOWED (with restrictions)
# These collect data for model training. We allow them to amplify
# our community's stories — but they can't access auth-gated areas.
# Joel's editorial position: our content exists to reach the autism
# community, including through AI tools.
# ─────────────────────────────────────────────

User-agent: GPTBot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/
Disallow: /community/

User-agent: ClaudeBot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/
Disallow: /community/

User-agent: anthropic-ai
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/
Disallow: /community/

User-agent: Google-Extended
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/
Disallow: /community/

User-agent: Applebot-Extended
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/
Disallow: /community/

User-agent: CCBot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/
Disallow: /community/

# ─────────────────────────────────────────────
# AI TRAINING CRAWLERS — BLOCKED
# Heavy crawl, near-zero referrals. Not worth the bandwidth.
# ─────────────────────────────────────────────

User-agent: Bytespider
Disallow: /

User-agent: meta-externalagent
Disallow: /

User-agent: Meta-ExternalAgent
Disallow: /

User-agent: meta-externalfetcher
Disallow: /

User-agent: Meta-ExternalFetcher
Disallow: /

User-agent: facebookexternalhit
Disallow: /

User-agent: Diffbot
Disallow: /

User-agent: ImagesiftBot
Disallow: /

User-agent: Omgilibot
Disallow: /

User-agent: Omgili
Disallow: /

User-agent: PetalBot
Disallow: /

User-agent: Timpibot
Disallow: /

User-agent: VelenPublicWebCrawler
Disallow: /

User-agent: YouBot
Disallow: /

# ─────────────────────────────────────────────
# Sitemap
# ─────────────────────────────────────────────
Sitemap: ${siteUrl}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

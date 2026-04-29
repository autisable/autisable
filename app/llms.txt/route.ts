export const dynamic = "force-static";

export async function GET() {
  const body = `# Autisable

> Autisable is a community and editorial platform for the autism community,
> serving parents, autistic individuals, and professionals since 2008.
> We publish stories, podcasts, and resources from over 70 contributors —
> including autistic adults, parents, educators, therapists, and advocates.

## About

- **Founded:** 2008 by Joel Manzer
- **Mission:** Amplify authentic voices from the autism community through
  honest storytelling, podcasts, and curated resources
- **Community model:** Modeled after Autcraft — gentle moderation, no DMs,
  human-first safety practices, 16+ age requirement
- **Platform:** Built on Next.js, hosted on Vercel, content stored in Supabase

## Content

- [Stories / Blog](https://autisable.com/blog/) — 4,000+ articles from
  contributors across the autism community: personal stories, advocacy,
  travel, IEP guidance, professional perspectives
- [Podcasts](https://autisable.com/podcasts/) — Three shows: Autisable Dads,
  Hope Saves the Day, and The Autism Dad
- [Music](https://autisable.com/music/) — Original music made for and about
  the autism community, with full transparency about AI tooling in production
- [Resources](https://autisable.com/resources/) — Curated affiliate
  recommendations: books, legal services, therapy tools, planning aids
- [About](https://autisable.com/about/) — Full platform history and timeline

## Editorial standards

- All content is human-edited and approved before publication
- Music tracks are AI-assisted in production but human-guided in writing;
  see autisable.com/music/ for full disclosure
- Affiliate disclosures appear at the top of every blog post per FTC
  guidelines
- Syndicated posts include canonical URLs pointing to the original source
- Author bios include verified social profiles and websites

## What's not on Autisable

- No private member content is exposed to crawlers (auth pages disallowed)
- No third-party session recording tools track member activity
- No content promotes dangerous interventions (MMS/bleach protocols, aversive
  therapies, etc.)
- No political endorsements from the platform itself

## Contact

- Editorial: contact@autisable.com
- Press / partnerships: contact@autisable.com
- Privacy: privacy@autisable.com
- Legal: legal@autisable.com

## Sitemap

- https://autisable.com/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Autisable",
  description: "Learn about Autisable — serving the autism community since 2008 with stories, podcasts, resources, and a safe community.",
};

const timeline = [
  { year: "2008", title: "Autisable Founded", description: "Launched as a community blog to connect autism families and share real stories." },
  { year: "2009", title: "Community Growth", description: "Expanded contributor network with voices from parents, professionals, and autistic individuals." },
  { year: "2012", title: "RSS Syndication Begins", description: "Started curating content from 70+ autism bloggers, amplifying voices across the community." },
  { year: "2015", title: "Platform Rebuild", description: "Major platform update to support growing membership and content library." },
  { year: "2018", title: "Podcast Launch", description: "Launched the Autisable Dads podcast — real conversations between fathers navigating autism parenting." },
  { year: "2022", title: "3,000+ Stories", description: "Surpassed 3,000 published articles from contributors around the world." },
  { year: "2026", title: "The New Autisable", description: "Complete ground-up rebuild as a modern community platform — faster, safer, and built for the next decade." },
];

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-zinc-900 tracking-tight mb-8">About Autisable</h1>

      <div className="flex justify-center mb-10">
        <Image src="/Logo.png" alt="Autisable" width={300} height={80} className="w-auto" />
      </div>

      <div className="prose prose-zinc prose-lg max-w-none">
        <p>
          Autisable is a community and editorial platform built for parents, autistic
          individuals, and professionals. We exist to amplify the voices that matter most —
          the people living these experiences every day.
        </p>
        <p>
          Since 2008, we&apos;ve been a home for real stories, honest conversations, and
          trusted resources. What started as a blog has grown into a full community platform
          with podcasts, a member journal system, and content syndicated from over 70
          contributors worldwide.
        </p>

        <h2>Our Mission</h2>
        <p>
          We believe the autism community deserves a space that&apos;s safe, respectful, and
          genuinely useful. Not a forum buried in spam. Not a social network that treats your
          data as a product. A real community built on understanding, not judgment.
        </p>

        <h2>What We Offer</h2>
        <ul>
          <li><strong>Stories & Articles</strong> — Curated and original content from 70+ contributors across the autism community</li>
          <li><strong>Three Podcasts</strong> — Autisable Dads, Hope Saves the Day, and The Autism Dad</li>
          <li><strong>Member Community</strong> — Personal journals, social feed, profiles, and real connections</li>
          <li><strong>Resources</strong> — Trusted tools, books, and services from our vetted partners</li>
        </ul>

        <h2>Our Approach to Safety</h2>
        <p>
          Our community is built on gentle guidance rather than punishment, open
          conversation rather than private messaging, and a design philosophy centered
          on safety without relying on user policing. We believe in:
        </p>
        <ul>
          <li>Moderation that prevents situations, not punishes people</li>
          <li>Rules in plain language, enforced through reminders, not sanctions</li>
          <li>Human moderation only — no automated content removal</li>
          <li>16+ age verification to protect young people</li>
        </ul>

        <h2>The Logo</h2>
        <p>
          We know the puzzle piece carries history. For us, it&apos;s always meant one thing:
          that every person belongs in the picture.
        </p>
      </div>

      {/* Our Story Timeline */}
      <div className="mt-16 pt-12 border-t border-zinc-200">
        <h2 className="text-3xl font-bold text-zinc-900 tracking-tight mb-10 text-center">Our Story</h2>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px bg-zinc-200 -translate-x-1/2" />

          <div className="space-y-10">
            {timeline.map((item, i) => (
              <div
                key={item.year}
                className={`relative flex flex-col sm:flex-row items-start gap-4 sm:gap-8 ${
                  i % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"
                }`}
              >
                {/* Dot */}
                <div className="absolute left-4 sm:left-1/2 w-3 h-3 rounded-full bg-brand-blue border-2 border-white shadow -translate-x-1/2 mt-1.5 z-10" />

                {/* Content */}
                <div className={`ml-10 sm:ml-0 sm:w-1/2 ${i % 2 === 0 ? "sm:pr-12 sm:text-right" : "sm:pl-12"}`}>
                  <span className="text-sm font-bold text-brand-blue">{item.year}</span>
                  <h3 className="text-lg font-semibold text-zinc-900 mt-1">{item.title}</h3>
                  <p className="text-sm text-zinc-600 mt-1 leading-relaxed">{item.description}</p>
                </div>

                {/* Spacer for opposite side */}
                <div className="hidden sm:block sm:w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

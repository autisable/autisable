import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Music",
  description: "Learn how Autisable creates original music for the autism community — our process, AI transparency, and opportunities for artists and industry.",
};

const steps = [
  {
    num: "01",
    title: "Story First",
    description: "Every song starts with a real story, experience, or theme from the autism community. The emotional foundation is always human.",
  },
  {
    num: "02",
    title: "Human-Guided Writing",
    description: "AI assists with drafts and options. A human songwriter evaluates, edits, and makes every final creative decision.",
  },
  {
    num: "03",
    title: "Demo Production",
    description: "AI tools produce demo-quality recordings of finalized songs — reducing the cost barrier between \"written\" and \"heard.\"",
  },
  {
    num: "04",
    title: "Review & Publish",
    description: "Every track is reviewed and approved by the Autisable team before release. Nothing ships without human sign-off.",
  },
];

const aiDoesNot = [
  "Determine what a song is about or what it means",
  "Make final decisions about lyrics, structure, or tone",
  "Create songwriter identities or fictional personas",
  "Generate songs that are published without human review and editing",
  "Replace the emotional judgment of the person behind the song",
];

const aiAssists = [
  "Offering lyric drafts and word options for a human to evaluate and edit",
  "Helping work through a verse or bridge that isn't landing yet",
  "Generating ideas that a human songwriter responds to, refines, or rejects",
  "Producing demo-quality audio recordings of finalized songs",
  "Reducing the cost barrier between \"written\" and \"heard\"",
];

const artistBenefits = [
  "Browse songs with full demo recordings — hear the feel before committing",
  "Every song has been human-edited and approved — no raw AI output",
  "License tracks without navigating complicated co-publishing splits",
  "Make it your own — we license the song, you own your performance and recording",
  "Support songwriters from underrepresented communities, including autistic voices",
  "Catalog spans folk, pop, country, gospel, Americana, and more",
];

const industryBenefits = [
  "All songs are human-edited and approved, with verifiable authorship on file",
  "Clear licensing terms — no tangled splits or undisclosed AI co-writer claims",
  "Full demo recordings give you an immediate sonic reference",
  "Catalog built around authentic storytelling — strong sync potential for human-interest stories",
  "Mission-aligned content for brands and media in health, family, and social-impact spaces",
];

const songwriters = [
  { initials: "JM", name: "Joel Manzer", role: "Founder & Lead Songwriter", description: "Autism parent, community builder, and the voice behind Autisable since 2008." },
  { initials: "AS", name: "Autisable Studio", role: "AI-Assisted Production", description: "Demo production and audio rendering guided by human-approved compositions." },
  { initials: "CS", name: "Community Stories", role: "Source Material", description: "Themes drawn from real experiences shared by the Autisable community over 18+ years." },
];

export default function MusicPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-blue-light via-white to-brand-orange-light">
        <div className="max-w-4xl mx-auto px-5 py-24 sm:py-32 relative z-10">
          <p className="text-[11px] tracking-[0.18em] uppercase text-brand-blue font-medium mb-4 flex items-center gap-3">
            <span className="w-8 h-px bg-brand-blue" />
            Autisable Music
          </p>
          <h1 className="font-serif text-[clamp(2.5rem,6vw,4rem)] font-normal leading-[1.1] text-zinc-900 mb-6">
            Music made <em className="text-brand-blue italic">with purpose</em>,
            not by accident.
          </h1>
          <p className="text-lg text-zinc-500 max-w-xl leading-relaxed mb-8">
            We&apos;re a publishing and licensing platform, not a record label. Our job is to
            develop well-crafted original songs — human-shaped at every stage — and connect
            them with the artists and productions ready to bring them fully to life.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#for-artists" className="px-6 py-3 bg-brand-blue hover:bg-brand-blue-dark text-white font-medium rounded-lg transition-colors text-sm">
              I&apos;m Looking for Songs
            </a>
            <a href="#how-it-works" className="px-6 py-3 bg-white hover:bg-zinc-50 text-zinc-700 font-medium rounded-lg border border-zinc-200 transition-colors text-sm">
              How It Works
            </a>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-zinc-50">
        <div className="max-w-5xl mx-auto px-5">
          <p className="text-[11px] tracking-[0.18em] uppercase text-brand-blue font-medium mb-3 flex items-center gap-3">
            <span className="w-6 h-px bg-brand-blue" />
            Process
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl text-zinc-900 mb-3">
            How <em className="text-brand-blue italic">Autisable Music</em> works
          </h2>
          <p className="text-zinc-500 max-w-xl mb-10">
            We&apos;re a publishing and licensing platform, not a record label. Our job is to develop
            well-crafted original songs — human-shaped at every stage.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-zinc-200 rounded-xl overflow-hidden bg-white">
            {steps.map((step) => (
              <div key={step.num} className="p-8 border-r border-zinc-100 last:border-r-0 hover:bg-brand-blue-light/30 transition-colors">
                <span className="font-serif text-5xl font-bold text-brand-blue/10 leading-none block mb-4">{step.num}</span>
                <h3 className="font-serif text-lg font-semibold text-zinc-900 mb-2">{step.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Transparency */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-5">
          <p className="text-[11px] tracking-[0.18em] uppercase text-brand-blue font-medium mb-3 flex items-center gap-3">
            <span className="w-6 h-px bg-brand-blue" />
            Transparency
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl text-zinc-900 mb-3">
            Our approach <em className="text-brand-blue italic">to AI</em>
          </h2>
          <p className="text-zinc-500 max-w-xl mb-10">
            We use AI in two ways — and we think being specific about both matters more
            than just saying &ldquo;AI-assisted.&rdquo; Here&apos;s exactly what that means.
          </p>

          <div className="border border-zinc-200 rounded-xl overflow-hidden">
            <div className="bg-brand-blue-light px-6 py-4 border-b border-zinc-200 flex items-center gap-3">
              <span className="bg-brand-blue text-white text-[10px] tracking-[0.1em] uppercase font-medium px-2.5 py-1 rounded">Clear Policy</span>
              <h3 className="font-serif text-lg text-zinc-900">What AI does — and doesn&apos;t do — here</h3>
            </div>
            <div className="grid md:grid-cols-2">
              <div className="p-8 border-r border-zinc-100">
                <p className="text-[10px] tracking-[0.15em] uppercase font-medium text-zinc-500 mb-5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-red" />
                  AI does not do this
                </p>
                <ul className="space-y-3">
                  {aiDoesNot.map((item, i) => (
                    <li key={i} className="text-sm text-zinc-600 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-brand-red before:text-xs">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-8">
                <p className="text-[10px] tracking-[0.15em] uppercase font-medium text-zinc-500 mb-5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />
                  AI assists with this
                </p>
                <ul className="space-y-3">
                  {aiAssists.map((item, i) => (
                    <li key={i} className="text-sm text-zinc-600 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-brand-green before:text-xs">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Artists & Industry */}
      <section id="for-artists" className="py-20 bg-zinc-50 border-t border-zinc-200">
        <div className="max-w-5xl mx-auto px-5">
          <div className="grid md:grid-cols-2 gap-16">
            <div>
              <p className="text-[11px] tracking-[0.18em] uppercase text-brand-orange font-medium mb-3">For Artists</p>
              <h2 className="font-serif text-2xl sm:text-3xl text-zinc-900 mb-4">
                Find songs that <em className="text-brand-blue italic">fit</em> — without the co-write.
              </h2>
              <p className="text-zinc-500 text-sm leading-relaxed mb-6">
                Whether you&apos;re looking for your next single or building a setlist,
                our catalog is built for artists who want songs with substance.
              </p>
              <ul className="space-y-3 mb-8">
                {artistBenefits.map((item, i) => (
                  <li key={i} className="text-sm text-zinc-600 leading-relaxed flex gap-2">
                    <span className="text-brand-blue shrink-0 mt-0.5">&rarr;</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/contact" className="px-6 py-3 bg-brand-blue hover:bg-brand-blue-dark text-white font-medium rounded-lg transition-colors text-sm inline-block">
                Browse the Catalog
              </Link>
            </div>

            <div>
              <p className="text-[11px] tracking-[0.18em] uppercase text-brand-green font-medium mb-3">For Industry</p>
              <h2 className="font-serif text-2xl sm:text-3xl text-zinc-900 mb-4">
                Licensing, sync, and <em className="text-brand-blue italic">placement</em> — ready to go.
              </h2>
              <p className="text-zinc-500 text-sm leading-relaxed mb-6">
                For music supervisors, sync agents, and media producers looking for
                mission-aligned, licensable content.
              </p>
              <ul className="space-y-3 mb-8">
                {industryBenefits.map((item, i) => (
                  <li key={i} className="text-sm text-zinc-600 leading-relaxed flex gap-2">
                    <span className="text-brand-blue shrink-0 mt-0.5">&rarr;</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/contact" className="px-6 py-3 bg-white hover:bg-zinc-100 text-zinc-700 font-medium rounded-lg border border-zinc-200 transition-colors text-sm inline-block">
                Contact Our Licensing Team
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why It Matters */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-5">
          <div className="grid md:grid-cols-5 gap-12 items-center">
            <div className="md:col-span-2">
              <blockquote className="font-serif text-2xl sm:text-3xl italic text-zinc-800 leading-snug border-l-[3px] border-brand-blue pl-6">
                The music is the mission made audible. Everything else is just delivery.
              </blockquote>
            </div>
            <div className="md:col-span-3">
              <p className="text-zinc-500 leading-relaxed mb-4">
                Autisable Music exists because the autism community deserves to hear itself reflected
                in original creative work — not just written about, but written from inside. Every
                song in this catalog started with a real experience from the community. The AI tools
                we use lower the barrier to production. The human judgment behind every track is what
                gives it meaning.
              </p>
              <p className="text-zinc-500 leading-relaxed">
                When an artist records one of these songs, or a supervisor places one in a film or
                campaign, the story that started it doesn&apos;t disappear. It travels. That&apos;s the point.
              </p>
              <div className="flex gap-12 mt-8 pt-6 border-t border-zinc-100">
                <div>
                  <span className="font-serif text-3xl font-bold text-brand-blue">18+</span>
                  <span className="block text-xs text-zinc-400 mt-1">Years of community stories</span>
                </div>
                <div>
                  <span className="font-serif text-3xl font-bold text-brand-blue">100%</span>
                  <span className="block text-xs text-zinc-400 mt-1">Human-reviewed output</span>
                </div>
                <div>
                  <span className="font-serif text-3xl font-bold text-brand-blue">0</span>
                  <span className="block text-xs text-zinc-400 mt-1">Fictional personas</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Songwriters */}
      <section className="py-20 bg-zinc-50">
        <div className="max-w-5xl mx-auto px-5">
          <p className="text-[11px] tracking-[0.18em] uppercase text-brand-blue font-medium mb-3 flex items-center gap-3">
            <span className="w-6 h-px bg-brand-blue" />
            Credits
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl text-zinc-900 mb-3">
            Meet the <em className="text-brand-blue italic">songwriters</em>
          </h2>
          <p className="text-zinc-500 max-w-xl mb-10">
            Real names. Real editorial judgment. Every song in this catalog has a person
            behind it who took responsibility for what it says and how it says it.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 mb-10">
            {songwriters.map((sw) => (
              <div key={sw.name} className="bg-white border border-zinc-200 rounded-xl p-7 hover:border-zinc-300 hover:-translate-y-0.5 transition-all">
                <div className="w-12 h-12 rounded-full bg-brand-blue-light border border-brand-blue/20 flex items-center justify-center font-serif text-lg text-brand-blue mb-4">
                  {sw.initials}
                </div>
                <h3 className="font-serif text-base font-semibold text-zinc-900">{sw.name}</h3>
                <p className="text-[11px] tracking-wide text-zinc-400 uppercase mb-3">{sw.role}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{sw.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Listen */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-5">
          <p className="text-[11px] tracking-[0.18em] uppercase text-brand-blue font-medium mb-3 flex items-center gap-3 justify-center">
            <span className="w-6 h-px bg-brand-blue" />
            Listen
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl text-zinc-900 mb-10 text-center">
            Hear the <em className="text-brand-blue italic">catalog</em>
          </h2>

          <div className="rounded-2xl overflow-hidden mb-6">
            <iframe
              src="https://open.spotify.com/embed/artist/1eyxJ7o9D9CmXYFFBidmLv?utm_source=generator&theme=0"
              width="100%"
              height="352"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="border-0 rounded-xl"
              title="Autisable on Spotify"
            />
          </div>

          <div className="rounded-2xl overflow-hidden mb-6">
            <iframe
              src="https://www.youtube.com/embed?listType=uploads&list=UU7MGyNNQ_Z12b5fHFWZj05w"
              width="100%"
              height="315"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              className="border-0 rounded-xl"
              title="Autisable Music Videos on YouTube"
            />
          </div>

          <div className="flex justify-center gap-3">
            <a
              href="https://open.spotify.com/artist/1eyxJ7o9D9CmXYFFBidmLv"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1DB954] hover:bg-[#1aa34a] text-white text-sm font-medium rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
              Spotify
            </a>
            <a
              href="https://www.youtube.com/@AutisableTV"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              YouTube
            </a>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-20 bg-gradient-to-br from-brand-blue to-brand-blue-dark text-white text-center">
        <div className="max-w-xl mx-auto px-5">
          <h2 className="font-serif text-3xl sm:text-4xl mb-4">
            The catalog is open. The conversation starts here.
          </h2>
          <p className="text-blue-100 mb-8 leading-relaxed">
            Whether you&apos;re an artist looking for your next song, a supervisor seeking
            mission-aligned content, or just curious about how we work — we&apos;d love to hear from you.
          </p>
          <Link
            href="/contact"
            className="inline-block bg-white text-brand-blue font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors"
          >
            Get in Touch
          </Link>
        </div>
      </section>
    </>
  );
}

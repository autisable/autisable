import Link from "next/link";
import type { Metadata } from "next";
import AboutTimeline from "../components/AboutTimeline";

export const metadata: Metadata = {
  title: "Our Story — Autisable",
  description: "Autisable has been part of the online autism community since 2009. Here's an honest account of how that happened.",
};

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="max-w-[760px] mx-auto px-5 pt-20 pb-12 text-center">
        <p className="text-[11px] tracking-[0.18em] uppercase text-brand-blue font-medium mb-5">
          Our story
        </p>
        <h1 className="font-serif text-[clamp(2rem,5vw,3.2rem)] font-normal leading-[1.2] text-zinc-900 mb-6">
          Started in a conversation. Kept alive by a community. Still here.
        </h1>
        <hr className="w-12 h-0.5 bg-brand-blue border-none mx-auto mb-8" />
        <p className="text-lg leading-[1.7] text-zinc-500 max-w-[580px] mx-auto">
          Autisable has been part of the online autism community since 2009. Here&apos;s
          an honest account of how that happened — including the years the website went
          dark but the community didn&apos;t.
        </p>
      </section>

      {/* Prose */}
      <section className="max-w-[680px] mx-auto px-5 pb-16">
        <div className="space-y-5 text-[17px] leading-[1.85] text-zinc-800">
          <p>
            In 2008, Joel Manzer was an autism parent and a Xanga blogger looking for something
            that didn&apos;t quite exist yet — a dedicated online space where the full range of people
            connected to autism could write honestly and find each other. Parents of newly diagnosed
            kids. Autistic adults navigating a world that hadn&apos;t caught up to them. Siblings,
            teachers, therapists, caregivers. People who needed to know they weren&apos;t alone and
            had nowhere obvious to confirm it.
          </p>
          <p>
            Xanga at the time was one of the largest blogging networks in the world. The conversations
            that became Autisable started there, inside discussions with the Xanga team about what an
            autism-specific community space could look like and who it would serve. Those conversations
            started in late 2008. By May 2009, Autisable was live.
          </p>
          <blockquote className="border-l-[3px] border-brand-blue pl-6 my-10 font-serif italic text-[19px] leading-[1.6] text-zinc-900">
            The community didn&apos;t need a platform with all the answers. It needed a place to
            ask the questions out loud.
          </blockquote>
          <p>
            What follows is the honest story of how this platform got to where it is now — including
            the part where the website went down, the community stayed active anyway, professionals
            kept asking where it went, and a handful of people made sure it came back.
          </p>
        </div>
      </section>

      {/* Timeline */}
      <AboutTimeline />

      {/* Closing CTA */}
      <section className="bg-zinc-900 text-zinc-100 py-20 px-5 text-center">
        <h2 className="font-serif text-[clamp(1.6rem,3.5vw,2.4rem)] font-normal leading-[1.3] mb-5">
          Sixteen years of community. Just getting started.
        </h2>
        <p className="text-base leading-[1.8] text-zinc-400 max-w-[540px] mx-auto mb-8">
          The website has had its gaps. The community never really did. Come be part of what comes next.
        </p>
        <Link
          href="/register"
          className="inline-block bg-brand-blue hover:bg-brand-blue-dark text-white text-[13px] font-medium tracking-[0.08em] uppercase px-8 py-3.5 rounded transition-colors"
        >
          Join Autisable
        </Link>
      </section>
    </>
  );
}

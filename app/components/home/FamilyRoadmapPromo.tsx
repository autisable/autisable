// Anchor promo for the Family Roadmap playbook (public/family-roadmap.html).
// Sits between Hero and FeaturedStory — the playbook is an evergreen
// hub asset, so it should outrank the weekly featured post in the
// visual hierarchy. Opens in a new tab so the playbook's own canvas
// gets the full window without an iframe sizing fight.

import Link from "next/link";

export default function FamilyRoadmapPromo() {
  return (
    <section className="py-8 sm:py-10 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/family-roadmap.html"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block overflow-hidden rounded-2xl bg-gradient-to-br from-brand-blue-dark via-brand-blue to-brand-blue/95 px-6 py-7 sm:px-10 sm:py-8 shadow-lg shadow-brand-blue/15 transition-shadow hover:shadow-xl hover:shadow-brand-blue/20"
        >
          {/* Decorative orbs — subtle, sized to not inflate card height. */}
          <div className="pointer-events-none absolute -top-12 -right-10 h-44 w-44 rounded-full bg-brand-orange/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
            <div className="md:flex-1">
              <span className="inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/90 backdrop-blur-sm">
                Free Interactive Tool
              </span>
              <h2 className="mt-2.5 font-serif text-2xl font-bold leading-tight text-white sm:text-3xl">
                The Autisable Family Roadmap
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
                Find what&apos;s next for your family — pick by life phase, age
                and support level, or diagnosis stage. Step-by-step guidance
                built from the community.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-blue-dark shadow-md transition-transform group-hover:-translate-y-0.5">
                  Open the Roadmap
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                    />
                  </svg>
                </span>
                {/* Three "entry mode" tiles, inlined so the card stays
                    short regardless of viewport width. */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { label: "Life phase", icon: "🌱" },
                    { label: "Age + support", icon: "🧭" },
                    { label: "Diagnosis stage", icon: "🩺" },
                  ].map((tile) => (
                    <span
                      key={tile.label}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/95 backdrop-blur-sm"
                    >
                      <span className="text-sm leading-none">{tile.icon}</span>
                      {tile.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}

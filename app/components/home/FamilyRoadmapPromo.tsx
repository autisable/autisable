// Anchor promo for the Family Roadmap playbook (public/family-roadmap.html).
// Sits between Hero and FeaturedStory — the playbook is an evergreen
// hub asset, so it should outrank the weekly featured post in the
// visual hierarchy. Opens in a new tab so the playbook's own canvas
// gets the full window without an iframe sizing fight.

import Link from "next/link";

export default function FamilyRoadmapPromo() {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/family-roadmap.html"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block overflow-hidden rounded-3xl bg-gradient-to-br from-brand-blue-dark via-brand-blue to-brand-blue/90 p-8 sm:p-12 shadow-xl shadow-brand-blue/15 transition-shadow hover:shadow-2xl hover:shadow-brand-blue/25"
        >
          {/* Decorative orbs — same idiom the playbook itself uses,
              keeps the two surfaces feeling related. */}
          <div className="pointer-events-none absolute -top-20 -right-16 h-72 w-72 rounded-full bg-brand-orange/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

          <div className="relative grid items-center gap-8 md:grid-cols-[1fr,auto]">
            <div>
              <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/90 backdrop-blur-sm">
                Free Interactive Tool
              </span>
              <h2 className="mt-4 font-serif text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-[2.5rem]">
                The Autisable Family Roadmap
              </h2>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
                Find what&apos;s next for your family — pick by life phase, age and
                support level, or diagnosis stage. Step-by-step guidance built
                from the community.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-blue-dark shadow-md transition-transform group-hover:-translate-y-0.5">
                Open the Roadmap
                <svg
                  className="h-4 w-4"
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
              </div>
            </div>

            <div className="hidden md:flex md:flex-col md:items-end md:gap-3">
              {/* Three "entry mode" tiles mirroring the playbook's
                  three tabs — visual preview of what's inside. */}
              {[
                { label: "Life phase", icon: "🌱" },
                { label: "Age + support", icon: "🧭" },
                { label: "Diagnosis stage", icon: "🩺" },
              ].map((tile) => (
                <div
                  key={tile.label}
                  className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-2.5 text-white/95 backdrop-blur-sm"
                >
                  <span className="text-xl leading-none">{tile.icon}</span>
                  <span className="text-sm font-medium">{tile.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}

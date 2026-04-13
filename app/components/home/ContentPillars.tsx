import Link from "next/link";

const pillars = [
  {
    title: "Personal Stories",
    description: "First-person stories from autistic individuals, parents, and families — the everyday moments, hard days, and small wins that remind us we're not alone.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
      </svg>
    ),
    href: "/blog?category=Personal+Stories+and+Experiences",
    bgColor: "bg-brand-orange-light",
    textColor: "text-brand-orange",
  },
  {
    title: "Non-Profits",
    description: "Stories, updates, and resources from organizations working inside the autism community — the programs, initiatives, and efforts making a difference on the ground.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
      </svg>
    ),
    href: "/blog?category=Non-Profits",
    bgColor: "bg-brand-blue-light",
    textColor: "text-brand-blue",
  },
  {
    title: "Professionals",
    description: "Perspectives from educators, therapists, advocates, and researchers who work alongside the autism community every day — practical insight from people who've seen what helps.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
      </svg>
    ),
    href: "/blog?category=Bloggers",
    bgColor: "bg-brand-green-light",
    textColor: "text-brand-green",
  },
];

export default function ContentPillars() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight">
            Stories That Matter
          </h2>
          <p className="mt-4 text-lg text-zinc-600 max-w-2xl mx-auto">
            Content from across the autism community — curated, syndicated, and
            original voices all in one place.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {pillars.map((pillar) => (
            <Link
              key={pillar.title}
              href={pillar.href}
              className="group relative p-8 rounded-2xl border border-zinc-100 hover:border-zinc-200 bg-white hover:shadow-lg transition-all"
            >
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl ${pillar.bgColor} ${pillar.textColor} mb-5`}>
                {pillar.icon}
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 mb-3 group-hover:text-brand-blue transition-colors">
                {pillar.title}
              </h3>
              <p className="text-zinc-600 leading-relaxed text-sm">
                {pillar.description}
              </p>
              <div className={`mt-5 inline-flex items-center gap-1 text-sm font-medium ${pillar.textColor}`}>
                Explore stories
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

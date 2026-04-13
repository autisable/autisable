import Link from "next/link";

const resources = [
  {
    name: "Bookshop.org",
    description: "Curated autism and special needs reading lists. Every purchase supports independent bookstores.",
    category: "Books & Reading",
    color: "bg-amber-50 text-amber-700",
  },
  {
    name: "LegalShield",
    description: "Affordable legal protection for families navigating IEPs, advocacy, and special education law.",
    category: "Legal & Advocacy",
    color: "bg-blue-50 text-blue-700",
  },
  {
    name: "Special Learning",
    description: "Evidence-based therapy tools and training for parents and professionals.",
    category: "Therapy & Tools",
    color: "bg-purple-50 text-purple-700",
  },
  {
    name: "VizyPlan",
    description: "Visual planning tools designed to support autistic individuals in daily routines.",
    category: "AAC & Planning",
    color: "bg-green-50 text-green-700",
  },
];

export default function ResourcesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight">
              Recommended Resources
            </h2>
            <p className="mt-3 text-lg text-zinc-600">
              Trusted tools and services from our partners.
            </p>
          </div>
          <Link
            href="/resources"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:text-brand-blue-dark transition-colors"
          >
            View all resources
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {resources.map((resource) => (
            <div
              key={resource.name}
              className="p-6 rounded-2xl border border-zinc-100 hover:shadow-md transition-shadow bg-white"
            >
              <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${resource.color} mb-4`}>
                {resource.category}
              </span>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">{resource.name}</h3>
              <p className="text-sm text-zinc-600 leading-relaxed">{resource.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

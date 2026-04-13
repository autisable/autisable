import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resources & Affiliates",
  description: "Curated recommendations for books, legal services, therapy tools, and more for the autism community.",
};

const categories = [
  {
    name: "Books & Reading",
    color: "bg-amber-50 border-amber-200",
    resources: [
      {
        name: "Bookshop.org",
        description: "Curated autism and special needs reading lists. Every purchase supports independent bookstores.",
        href: "#",
      },
    ],
  },
  {
    name: "Legal & Advocacy",
    color: "bg-blue-50 border-blue-200",
    resources: [
      {
        name: "LegalShield",
        description: "Affordable legal protection for families navigating IEPs, advocacy, and special education law.",
        href: "#",
      },
    ],
  },
  {
    name: "Therapy & Learning",
    color: "bg-purple-50 border-purple-200",
    resources: [
      {
        name: "Special Learning",
        description: "Evidence-based therapy tools, ABA materials, and training for parents and professionals.",
        href: "#",
      },
    ],
  },
  {
    name: "AAC & Planning Tools",
    color: "bg-green-50 border-green-200",
    resources: [
      {
        name: "VizyPlan",
        description: "Visual planning tools designed to support autistic individuals in daily routines and transitions.",
        href: "#",
      },
    ],
  },
  {
    name: "General Resources",
    color: "bg-zinc-50 border-zinc-200",
    resources: [
      {
        name: "Amazon Associates",
        description: "Recommended products from trusted brands. When you shop through our links, you support Autisable.",
        href: "#",
      },
    ],
  },
];

export default function ResourcesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-zinc-900 tracking-tight mb-3">Resources & Affiliates</h1>
      <p className="text-lg text-zinc-600 mb-10">
        Curated recommendations from the Autisable team. These are tools and services we
        trust and use ourselves. Some links are affiliate links — they help support the platform
        at no extra cost to you.
      </p>

      <div className="space-y-10">
        {categories.map((cat) => (
          <div key={cat.name}>
            <h2 className="text-xl font-bold text-zinc-900 mb-4">{cat.name}</h2>
            <div className="space-y-4">
              {cat.resources.map((resource) => (
                <a
                  key={resource.name}
                  href={resource.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block p-6 rounded-2xl border ${cat.color} hover:shadow-md transition-shadow`}
                >
                  <h3 className="text-lg font-semibold text-zinc-900 mb-2">{resource.name}</h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">{resource.description}</p>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

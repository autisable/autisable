import Link from "next/link";
import Image from "next/image";
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
        name: "Bookshop.org — Autisable Shop",
        description: "Curated autism and special needs reading lists. Every purchase supports independent bookstores and the Autisable platform.",
        href: "https://bookshop.org/shop/Autisable",
      },
    ],
  },
  {
    name: "Therapy & Learning",
    color: "bg-purple-50 border-purple-200",
    resources: [
      {
        name: "Special Learning — Autisable Store",
        description: "Evidence-based therapy tools, ABA materials, and training for parents and professionals. Browse our curated collection.",
        href: "https://autisable.store.special-learning.com",
      },
    ],
  },
  {
    name: "Legal & Advocacy",
    color: "bg-blue-50 border-blue-200",
    resources: [
      {
        name: "LegalShield",
        description: "Affordable legal protection for families navigating IEPs, advocacy, and special education law. Get connected with an attorney who understands your needs.",
        href: "https://autisablellc.legalshieldassociate.com/",
      },
    ],
  },
  {
    name: "AAC & Planning Tools",
    color: "bg-green-50 border-green-200",
    resources: [
      {
        name: "VizyPlan",
        description: "Visual planning tools designed to help autistic individuals manage daily routines, transitions, and build independence through visual schedules.",
        href: "https://vizyplan.com",
        logo: "/VizyPlan.png",
      },
    ],
  },
  {
    name: "General Resources",
    color: "bg-zinc-50 border-zinc-200",
    resources: [
      {
        name: "Amazon — Autisable Picks",
        description: "Recommended products from trusted brands. When you shop through our links, you support Autisable at no extra cost to you.",
        href: "https://www.amazon.com/?tag=autisable07-20",
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
                <div
                  key={resource.name}
                  className={`p-6 rounded-2xl border ${cat.color} hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {(resource as { logo?: string }).logo && (
                        <Image
                          src={(resource as { logo: string }).logo}
                          alt={resource.name}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-xl shrink-0 object-contain"
                          unoptimized
                        />
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-zinc-900 mb-2">{resource.name}</h3>
                        <p className="text-sm text-zinc-600 leading-relaxed">{resource.description}</p>
                      </div>
                    </div>
                    <a
                      href={resource.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Visit
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
        <p className="text-xs text-zinc-500 leading-relaxed">
          <strong>Disclosure:</strong> Autisable.com participates in affiliate programs, including the
          Amazon Services LLC Associates Program and other affiliate advertising programs. This means we
          may earn commissions from qualifying purchases at no additional cost to you.
        </p>
      </div>
    </div>
  );
}

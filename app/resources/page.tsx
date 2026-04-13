import Link from "next/link";
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
        href: null,
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
        href: null,
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
        href: null,
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
        href: null,
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
        href: null,
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

      <div className="mb-8 p-5 bg-brand-blue-light rounded-2xl border border-brand-blue/20">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-brand-blue mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
          <p className="text-sm text-brand-blue">
            We&apos;re actively adding affiliate links and partner URLs. Check back soon —
            or <Link href="/contact" className="font-medium underline">contact us</Link> if
            you&apos;d like to become a partner.
          </p>
        </div>
      </div>

      <div className="space-y-10">
        {categories.map((cat) => (
          <div key={cat.name}>
            <h2 className="text-xl font-bold text-zinc-900 mb-4">{cat.name}</h2>
            <div className="space-y-4">
              {cat.resources.map((resource) => (
                <div
                  key={resource.name}
                  className={`p-6 rounded-2xl border ${cat.color} ${resource.href ? "hover:shadow-md transition-shadow" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900 mb-2">{resource.name}</h3>
                      <p className="text-sm text-zinc-600 leading-relaxed">{resource.description}</p>
                    </div>
                    {resource.href ? (
                      <a
                        href={resource.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Visit
                      </a>
                    ) : (
                      <span className="shrink-0 px-3 py-1.5 bg-zinc-100 text-zinc-500 text-xs font-medium rounded-lg">
                        Coming soon
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
        <p className="text-xs text-zinc-500 leading-relaxed">
          <strong>Affiliate Disclosure:</strong> Some links on this page are affiliate links. Autisable
          may earn a commission when you make a purchase through these links at no additional cost to you.
          All recommendations are genuine and based on products and services we trust.
        </p>
      </div>
    </div>
  );
}

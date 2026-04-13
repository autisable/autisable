"use client";

import NewsletterSignupLight from "./NewsletterSignupLight";

interface BlogSidebarProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function BlogSidebar({ categories, activeCategory, onCategoryChange }: BlogSidebarProps) {
  return (
    <aside className="w-full lg:w-72 shrink-0">
      <div className="sticky top-24 space-y-6">
        {/* Stay Updated - top of sidebar */}
        <div className="bg-gradient-to-br from-brand-blue to-brand-blue-dark rounded-2xl p-6 text-white">
          <h3 className="font-semibold mb-2">Stay Updated</h3>
          <p className="text-sm text-blue-100 mb-4">
            Get new stories delivered to your inbox.
          </p>
          <NewsletterSignupLight />
        </div>

        {/* Categories */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-6">
          <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">
            Categories
          </h3>
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => onCategoryChange("")}
                className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  !activeCategory
                    ? "bg-brand-blue-light text-brand-blue font-medium"
                    : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                All Stories
              </button>
            </li>
            {categories.map((cat) => (
              <li key={cat}>
                <button
                  onClick={() => onCategoryChange(cat)}
                  className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeCategory === cat
                      ? "bg-brand-blue-light text-brand-blue font-medium"
                      : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  {cat}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}

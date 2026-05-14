"use client";

import { useMemo, useState } from "react";
import NewsletterSignupLight from "./NewsletterSignupLight";

interface BlogSidebarProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  authors?: string[];
  activeAuthor?: string;
  onAuthorChange?: (author: string) => void;
}

export default function BlogSidebar({
  categories,
  activeCategory,
  onCategoryChange,
  authors = [],
  activeAuthor = "",
  onAuthorChange,
}: BlogSidebarProps) {
  // Authors list can run hundreds long once syndicated bylines are
  // counted, so the picker is a search + clickable result list instead
  // of a plain <select>. The query filters locally — author names are
  // already loaded by the parent, no extra fetches.
  const [authorQuery, setAuthorQuery] = useState("");
  const filteredAuthors = useMemo(() => {
    const needle = authorQuery.trim().toLowerCase();
    if (!needle) return authors.slice(0, 50);
    return authors.filter((a) => a.toLowerCase().includes(needle)).slice(0, 50);
  }, [authors, authorQuery]);

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

        {/* Authors */}
        {onAuthorChange && authors.length > 0 && (
          <div className="bg-white rounded-2xl border border-zinc-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">
                Authors
              </h3>
              {activeAuthor && (
                <button
                  onClick={() => onAuthorChange("")}
                  className="text-xs text-brand-blue hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            {activeAuthor ? (
              <div className="px-3 py-2 bg-brand-blue-light text-brand-blue text-sm font-medium rounded-lg">
                {activeAuthor}
              </div>
            ) : (
              <>
                <input
                  type="search"
                  value={authorQuery}
                  onChange={(e) => setAuthorQuery(e.target.value)}
                  placeholder="Search authors…"
                  className="w-full px-3 py-1.5 mb-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue"
                />
                <ul className="space-y-1 max-h-72 overflow-y-auto">
                  {filteredAuthors.map((author) => (
                    <li key={author}>
                      <button
                        onClick={() => onAuthorChange(author)}
                        className="block w-full text-left px-3 py-2 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50"
                      >
                        {author}
                      </button>
                    </li>
                  ))}
                  {filteredAuthors.length === 0 && (
                    <li className="px-3 py-2 text-xs text-zinc-400 italic">
                      No matches
                    </li>
                  )}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

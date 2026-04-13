import Link from "next/link";

interface BlogSidebarProps {
  categories: string[];
  activeCategory: string;
}

export default function BlogSidebar({ categories, activeCategory }: BlogSidebarProps) {
  return (
    <aside className="w-full lg:w-72 shrink-0">
      <div className="sticky top-24 space-y-8">
        {/* Categories */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-6">
          <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">
            Categories
          </h3>
          <ul className="space-y-2">
            <li>
              <Link
                href="/blog"
                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                  !activeCategory
                    ? "bg-brand-blue-light text-brand-blue font-medium"
                    : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                All Stories
              </Link>
            </li>
            {categories.map((cat) => (
              <li key={cat}>
                <Link
                  href={`/blog?category=${encodeURIComponent(cat)}`}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeCategory === cat
                      ? "bg-brand-blue-light text-brand-blue font-medium"
                      : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  {cat}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Newsletter CTA */}
        <div className="bg-gradient-to-br from-brand-blue to-brand-blue-dark rounded-2xl p-6 text-white">
          <h3 className="font-semibold mb-2">Stay Updated</h3>
          <p className="text-sm text-blue-100 mb-4">
            Get new stories delivered to your inbox.
          </p>
          <Link
            href="/register"
            className="block text-center py-2.5 bg-white text-brand-blue font-medium rounded-xl text-sm hover:bg-blue-50 transition-colors"
          >
            Subscribe
          </Link>
        </div>
      </div>
    </aside>
  );
}

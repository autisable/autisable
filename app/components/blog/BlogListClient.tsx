"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getSupabase } from "@/app/lib/supabase-browser";
import BlogSidebar from "./BlogSidebar";

const supabase = getSupabase();
interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  image: string | null;
  category: string;
  date: string;
  read_time: string | null;
  author_name: string | null;
}

const POSTS_PER_PAGE = 12;

interface BlogListClientProps {
  initialPosts?: Post[];
}

export default function BlogListClient({ initialPosts = [] }: BlogListClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get("category");
  const tagFilter = searchParams.get("tag");
  const authorFilter = searchParams.get("author");
  const searchQuery = searchParams.get("q");

  const hasFilter = !!(categoryFilter || tagFilter || authorFilter || searchQuery);

  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialPosts.length === POSTS_PER_PAGE);
  const [categories, setCategories] = useState<string[]>([]);
  const [authors, setAuthors] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState(categoryFilter || "");
  const [hasInitialized, setHasInitialized] = useState(false);

  // Reading the author filter directly from the URL each render keeps the
  // sidebar select in sync with back/forward navigation. The category
  // filter mirrors local state for the pill UI (legacy pattern); doing
  // the same dance for authors isn't necessary because the dropdown
  // reads/writes via the URL.
  const setAuthorFilter = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set("author", next);
      else params.delete("author");
      const q = params.toString();
      router.push(q ? `${pathname}?${q}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const loadPosts = useCallback(async (pageNum: number, category: string, search: string | null) => {
    setLoading(true);
    let query = supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, image, category, date, read_time, author_name")
      .eq("is_published", true)
      // Hide future-dated (scheduled) posts. Browser-side date is fine
      // here — close enough; this is paginated browsing, not access
      // control.
      .lte("date", new Date().toISOString())
      .order("date", { ascending: false })
      .range(pageNum * POSTS_PER_PAGE, (pageNum + 1) * POSTS_PER_PAGE - 1);

    if (category) {
      query = query.eq("category", category);
    }
    if (tagFilter) {
      query = query.contains("tags", [tagFilter]);
    }
    if (authorFilter) {
      // author param could be slug-like; try to match author_name case-insensitively
      query = query.ilike("author_name", `%${authorFilter.replace(/-/g, " ")}%`);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`);
    }

    const { data } = await query;
    if (data) {
      if (pageNum === 0) {
        setPosts(data);
      } else {
        setPosts((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === POSTS_PER_PAGE);
    }
    setLoading(false);
  }, [tagFilter, authorFilter]);

  useEffect(() => {
    const loadFacets = async () => {
      const nowIso = new Date().toISOString();
      const [catRes, authorRes] = await Promise.all([
        supabase
          .from("blog_posts")
          .select("category")
          .eq("is_published", true)
          .lte("date", nowIso)
          .not("category", "is", null),
        supabase
          .from("blog_posts")
          .select("author_name")
          .eq("is_published", true)
          .lte("date", nowIso)
          .not("author_name", "is", null)
          .limit(5000),
      ]);
      if (catRes.data) {
        const unique = [...new Set(catRes.data.map((d) => d.category).filter(Boolean))];
        setCategories(unique.sort());
      }
      if (authorRes.data) {
        const unique = [...new Set(authorRes.data.map((d) => d.author_name).filter(Boolean))];
        setAuthors(unique.sort((a, b) => a.localeCompare(b)));
      }
    };
    void loadFacets();
  }, []);

  useEffect(() => {
    // Skip the first effect run if we have SSR posts and no filter applied
    if (!hasInitialized && initialPosts.length > 0 && !hasFilter && !activeCategory) {
      setHasInitialized(true);
      return;
    }
    setHasInitialized(true);
    setPage(0);
    void loadPosts(0, activeCategory, searchQuery);
  }, [activeCategory, searchQuery, loadPosts, hasInitialized, initialPosts.length, hasFilter]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    void loadPosts(nextPage, activeCategory, searchQuery);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-10">
      <div className="flex-1">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveCategory("")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !activeCategory
                ? "bg-brand-blue text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-brand-blue text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Post Grid */}
        {!loading && posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-500 text-lg">No stories found.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-8">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group bg-white rounded-2xl overflow-hidden border border-zinc-100 hover:shadow-lg hover:border-zinc-200 transition-all"
              >
                <div className="relative aspect-[16/9] bg-zinc-100">
                  {post.image ? (
                    <Image
                      src={post.image}
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gradient-to-br from-brand-blue-light to-brand-orange-light p-6">
                      <img src="/Logo.png" alt="Autisable" className="w-3/4 max-w-[160px] opacity-40" />
                    </div>
                  )}
                  {post.category && (
                    <span className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-sm text-xs font-medium text-zinc-700 rounded-full">
                      {post.category}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="text-lg font-semibold text-zinc-900 group-hover:text-brand-blue transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="mt-2 text-sm text-zinc-600 line-clamp-2">{post.excerpt}</p>
                  )}
                  <div className="mt-4 flex items-center gap-3 text-xs text-zinc-500">
                    {post.author_name && <span>{post.author_name}</span>}
                    {post.author_name && post.date && <span className="w-1 h-1 rounded-full bg-zinc-300" />}
                    {post.date && (
                      <time dateTime={post.date}>
                        {new Date(post.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </time>
                    )}
                    {post.read_time && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-zinc-300" />
                        <span>{post.read_time}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {loading && (
          <div className="grid sm:grid-cols-2 gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-zinc-100 animate-pulse">
                <div className="aspect-[16/9] bg-zinc-100" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-zinc-100 rounded w-3/4" />
                  <div className="h-4 bg-zinc-100 rounded w-full" />
                  <div className="h-3 bg-zinc-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && !loading && posts.length > 0 && (
          <div className="mt-10 text-center">
            <button
              onClick={loadMore}
              className="px-8 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-xl transition-colors"
            >
              Load More Stories
            </button>
          </div>
        )}
      </div>

      <BlogSidebar
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        authors={authors}
        activeAuthor={authorFilter || ""}
        onAuthorChange={setAuthorFilter}
      />
    </div>
  );
}

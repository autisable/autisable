"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface SearchResult {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  image: string | null;
}

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) return;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => {
        setResults(data.results || []);
        setLoading(false);
      });
  }, [q]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-zinc-900 mb-2">
        Search Results
      </h1>
      <p className="text-zinc-500 mb-8">
        {q ? `Showing results for "${q}"` : "Enter a search term"}
      </p>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-zinc-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : results.length === 0 && q ? (
        <p className="text-zinc-500 py-8">No results found.</p>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <Link
              key={result.id}
              href={`/blog/${result.slug}`}
              className="flex gap-4 p-4 bg-white rounded-xl border border-zinc-100 hover:shadow-md transition-all"
            >
              {result.image && (
                <div className="relative w-24 h-16 rounded-lg overflow-hidden shrink-0 bg-zinc-100">
                  <Image src={result.image} alt="" fill className="object-cover" />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-zinc-900 line-clamp-1">{result.title}</h2>
                <p className="text-xs text-zinc-500 line-clamp-1 mt-1">{result.excerpt}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-zinc-400">
                  {result.category && <span>{result.category}</span>}
                  {result.date && (
                    <time>{new Date(result.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</time>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-12"><p>Loading...</p></div>}>
      <SearchResults />
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();

interface CategoryCount {
  category: string;
  count: number;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [renameFrom, setRenameFrom] = useState("");
  const [renameTo, setRenameTo] = useState("");
  const [renaming, setRenaming] = useState(false);

  const loadCategories = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("blog_posts")
      .select("category")
      .not("category", "is", null);

    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((d) => {
        const cat = d.category || "Uncategorized";
        counts[cat] = (counts[cat] || 0) + 1;
      });
      const sorted = Object.entries(counts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);
      setCategories(sorted);
    }
    setLoading(false);
  };

  useEffect(() => { void loadCategories(); }, []);

  const handleRename = async () => {
    if (!renameFrom || !renameTo || !supabase) return;
    setRenaming(true);
    await supabase
      .from("blog_posts")
      .update({ category: renameTo })
      .eq("category", renameFrom);
    setRenameFrom("");
    setRenameTo("");
    setRenaming(false);
    void loadCategories();
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href="/admin" className="text-sm text-brand-blue hover:underline">&larr; Admin</Link>
          <h1 className="text-xl font-bold text-zinc-900">Categories</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Rename tool */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 mb-8">
          <h3 className="text-sm font-semibold text-zinc-900 mb-3">Rename Category</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={renameFrom}
              onChange={(e) => setRenameFrom(e.target.value)}
              className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm"
            >
              <option value="">Select category to rename</option>
              {categories.map((c) => (
                <option key={c.category} value={c.category}>{c.category} ({c.count})</option>
              ))}
            </select>
            <span className="text-zinc-400 self-center">&rarr;</span>
            <input
              type="text"
              value={renameTo}
              onChange={(e) => setRenameTo(e.target.value)}
              placeholder="New name"
              className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm"
            />
            <button
              onClick={handleRename}
              disabled={!renameFrom || !renameTo || renaming}
              className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {renaming ? "..." : "Rename"}
            </button>
          </div>
        </div>

        {/* Category list */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-white rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            {categories.map((cat) => (
              <div key={cat.category} className="flex items-center justify-between px-5 py-3 border-b border-zinc-50 last:border-0 hover:bg-zinc-50">
                <span className="text-sm font-medium text-zinc-900">{cat.category}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400">{cat.count} posts</span>
                  <Link
                    href={`/blog?category=${encodeURIComponent(cat.category)}`}
                    className="text-xs text-brand-blue hover:underline"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

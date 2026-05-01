"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();

interface TagCount {
  tag: string;
  count: number;
}

const PAGE_SIZE = 1000;

export default function AdminTagsPage() {
  const [tags, setTags] = useState<TagCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [renameFrom, setRenameFrom] = useState("");
  const [renameTo, setRenameTo] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const loadTags = async () => {
    if (!supabase) return;
    setLoading(true);
    // Pull every post's tags array. blog_posts has 5k rows; paginate.
    const all: { tags: string[] | null }[] = [];
    let from = 0;
    while (true) {
      const { data } = await supabase
        .from("blog_posts")
        .select("tags")
        .range(from, from + PAGE_SIZE - 1);
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
    const counts = new Map<string, number>();
    for (const row of all) {
      if (!Array.isArray(row.tags)) continue;
      for (const t of row.tags) {
        if (!t) continue;
        counts.set(t, (counts.get(t) || 0) + 1);
      }
    }
    const sorted = [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
    setTags(sorted);
    setLoading(false);
  };

  useEffect(() => { void loadTags(); }, []);

  // Replace one tag with another across every post that has it.
  // De-dupes if a post already has the target tag.
  const renameTag = async (from: string, to: string) => {
    if (!supabase || !from || !to || from === to) return;
    const { data: hits } = await supabase
      .from("blog_posts")
      .select("id, tags")
      .contains("tags", [from]);
    if (!hits) return 0;
    let updated = 0;
    for (const post of hits) {
      const next = Array.from(
        new Set((post.tags as string[]).map((t) => (t === from ? to : t)))
      );
      const { error } = await supabase
        .from("blog_posts")
        .update({ tags: next })
        .eq("id", post.id);
      if (!error) updated++;
    }
    return updated;
  };

  const removeTag = async (tag: string) => {
    if (!supabase) return 0;
    const { data: hits } = await supabase
      .from("blog_posts")
      .select("id, tags")
      .contains("tags", [tag]);
    if (!hits) return 0;
    let updated = 0;
    for (const post of hits) {
      const next = (post.tags as string[]).filter((t) => t !== tag);
      const { error } = await supabase
        .from("blog_posts")
        .update({ tags: next.length > 0 ? next : null })
        .eq("id", post.id);
      if (!error) updated++;
    }
    return updated;
  };

  const handleRename = async () => {
    if (!renameFrom || !renameTo) return;
    setRenaming(true);
    await renameTag(renameFrom, renameTo.trim());
    setRenameFrom("");
    setRenameTo("");
    setRenaming(false);
    void loadTags();
  };

  const handleDelete = async (tag: string) => {
    if (!confirm(`Remove the tag "${tag}" from every post that has it? Posts themselves are not deleted.`)) return;
    setBusy(tag);
    await removeTag(tag);
    setBusy(null);
    void loadTags();
  };

  const filtered = search
    ? tags.filter((t) => t.tag.toLowerCase().includes(search.toLowerCase()))
    : tags;

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href="/admin" className="text-sm text-brand-blue hover:underline">&larr; Admin</Link>
          <h1 className="text-xl font-bold text-zinc-900">Tags</h1>
          <span className="text-sm text-zinc-400">({tags.length} unique tags across {tags.reduce((a, t) => a + t.count, 0)} taggings)</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Rename tool */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 mb-6">
          <h3 className="text-sm font-semibold text-zinc-900 mb-3">Rename Tag</h3>
          <p className="text-xs text-zinc-500 mb-3">
            Renaming updates every post that has the tag. If a post already has the target tag, the old one is removed.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={renameFrom}
              onChange={(e) => setRenameFrom(e.target.value)}
              className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm"
            >
              <option value="">Select tag to rename</option>
              {tags.map((t) => (
                <option key={t.tag} value={t.tag}>{t.tag} ({t.count})</option>
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

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tags..."
            className="w-full max-w-xs px-3 py-1.5 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue"
          />
        </div>

        {/* Tag list */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-white rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">No tags match.</div>
        ) : (
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            {filtered.map((t) => (
              <div key={t.tag} className="flex items-center justify-between px-5 py-3 border-b border-zinc-50 last:border-0 hover:bg-zinc-50">
                <span className="text-sm font-medium text-zinc-900">{t.tag}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400">{t.count} {t.count === 1 ? "post" : "posts"}</span>
                  <Link
                    href={`/blog?tag=${encodeURIComponent(t.tag)}`}
                    target="_blank"
                    className="text-xs text-brand-blue hover:underline"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleDelete(t.tag)}
                    disabled={busy === t.tag}
                    className="text-xs text-brand-red hover:underline disabled:opacity-50"
                  >
                    {busy === t.tag ? "..." : "Remove"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/app/lib/supabase-browser";
import RichTextEditor from "./RichTextEditor";

const supabase = getSupabase();

interface Props {
  post: Record<string, unknown>;
  isNew: boolean;
}

export default function PostEditor({ post: initialPost, isNew }: Props) {
  const router = useRouter();
  const [post, setPost] = useState(initialPost);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [authors, setAuthors] = useState<{ id: string; display_name: string }[]>([]);
  const [showSeo, setShowSeo] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    // Load categories
    supabase
      .from("blog_posts")
      .select("category")
      .not("category", "is", null)
      .then(({ data }) => {
        if (data) {
          const unique = [...new Set(data.map((d) => d.category).filter(Boolean))].sort();
          setCategories(unique);
        }
      });

    // Load authors
    supabase
      .from("authors")
      .select("id, display_name")
      .order("display_name")
      .limit(500)
      .then(({ data }) => {
        if (data) setAuthors(data);
      });
  }, []);

  const updateField = (field: string, value: unknown) => {
    setPost((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 100);
  };

  const estimateReadTime = (content: string) => {
    const text = content.replace(/<[^>]*>/g, "");
    const words = text.split(/\s+/).filter(Boolean).length;
    return `${Math.max(1, Math.ceil(words / 250))} min read`;
  };

  const handleSave = useCallback(async (publish?: boolean) => {
    if (!supabase) return;
    setSaving(true);

    const slug = (post.slug as string) || generateSlug(post.title as string);
    const content = post.content as string || "";

    const payload = {
      title: post.title,
      slug,
      content,
      excerpt: post.excerpt || content.replace(/<[^>]*>/g, "").slice(0, 300),
      image: post.image || null,
      category: post.category || "Uncategorized",
      author_name: post.author_name || null,
      author_id: post.author_id || null,
      date: post.date ? new Date(post.date as string).toISOString() : new Date().toISOString(),
      date_modified: new Date().toISOString(),
      read_time: estimateReadTime(content),
      meta_title: post.meta_title || null,
      meta_description: post.meta_description || null,
      og_image: post.og_image || null,
      focus_keyword: post.focus_keyword || null,
      keywords: Array.isArray(post.keywords) ? post.keywords : null,
      is_published: publish !== undefined ? publish : post.is_published,
      is_featured: post.is_featured || false,
      is_syndicated: post.is_syndicated || false,
      canonical_url: post.canonical_url || null,
    };

    if (isNew) {
      const { data, error } = await supabase
        .from("blog_posts")
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        alert("Error saving: " + error.message);
      } else if (data) {
        router.push(`/admin/posts/${data.id}`);
      }
    } else {
      const { error } = await supabase
        .from("blog_posts")
        .update(payload)
        .eq("id", post.id);

      if (error) {
        alert("Error saving: " + error.message);
      } else {
        setSaved(true);
        setPost((prev) => ({ ...prev, ...payload, slug }));
      }
    }
    setSaving(false);
  }, [post, isNew, router]);

  const handleDelete = async () => {
    if (!confirm("Delete this post permanently?")) return;
    if (!supabase) return;
    await supabase.from("blog_posts").delete().eq("id", post.id);
    router.push("/admin/posts");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main editor */}
        <div className="flex-1 space-y-6">
          {/* Title */}
          <input
            type="text"
            value={(post.title as string) || ""}
            onChange={(e) => {
              updateField("title", e.target.value);
              if (isNew || !(post.slug as string)) {
                updateField("slug", generateSlug(e.target.value));
              }
            }}
            placeholder="Post title..."
            className="w-full text-3xl font-bold text-zinc-900 placeholder:text-zinc-300 border-0 bg-transparent focus:ring-0 p-0"
          />

          {/* Slug */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-400">/blog/</span>
            <input
              type="text"
              value={(post.slug as string) || ""}
              onChange={(e) => updateField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              className="flex-1 text-zinc-600 border-0 border-b border-zinc-200 bg-transparent focus:ring-0 focus:border-brand-blue px-0 py-1 text-sm"
            />
          </div>

          {/* Rich Text Editor */}
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <RichTextEditor
              content={(post.content as string) || ""}
              onChange={(html) => updateField("content", html)}
            />
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Excerpt</label>
            <textarea
              value={(post.excerpt as string) || ""}
              onChange={(e) => updateField("excerpt", e.target.value)}
              rows={3}
              placeholder="Short description for listings and SEO..."
              className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
            />
          </div>

          {/* SEO Fields */}
          <div>
            <button
              onClick={() => setShowSeo(!showSeo)}
              className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              <svg className={`w-4 h-4 transition-transform ${showSeo ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
              SEO Settings
            </button>
            {showSeo && (
              <div className="mt-4 space-y-4 p-5 bg-zinc-50 rounded-xl border border-zinc-100">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">
                    Focus Keyphrase <span className="text-zinc-400 font-normal">— the primary search term this post should rank for</span>
                  </label>
                  <input
                    type="text"
                    value={(post.focus_keyword as string) || ""}
                    onChange={(e) => updateField("focus_keyword", e.target.value)}
                    placeholder="e.g. sensory-friendly travel"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">
                    Additional Keyphrases <span className="text-zinc-400 font-normal">— comma separated, related search terms</span>
                  </label>
                  <input
                    type="text"
                    value={Array.isArray(post.keywords) ? (post.keywords as string[]).join(", ") : ""}
                    onChange={(e) => {
                      const arr = e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      updateField("keywords", arr);
                    }}
                    placeholder="autism vacation, sensory hotel, autism-friendly destinations"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue"
                  />
                  {Array.isArray(post.keywords) && (post.keywords as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(post.keywords as string[]).map((kw, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-blue-light text-brand-blue text-xs rounded-full">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="border-t border-zinc-200 pt-4">
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Meta Title</label>
                  <input
                    type="text"
                    value={(post.meta_title as string) || ""}
                    onChange={(e) => updateField("meta_title", e.target.value)}
                    placeholder={post.title as string}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Meta Description</label>
                  <textarea
                    value={(post.meta_description as string) || ""}
                    onChange={(e) => updateField("meta_description", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-brand-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">OG Image URL</label>
                  <input
                    type="text"
                    value={(post.og_image as string) || ""}
                    onChange={(e) => updateField("og_image", e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Canonical URL</label>
                  <input
                    type="text"
                    value={(post.canonical_url as string) || ""}
                    onChange={(e) => updateField("canonical_url", e.target.value)}
                    placeholder="Leave blank for default"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 shrink-0 space-y-6">
          {/* Publish Actions */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h3 className="text-sm font-semibold text-zinc-900 mb-4">Publish</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Status</span>
                <span className={`font-medium ${post.is_published ? "text-brand-green" : "text-zinc-500"}`}>
                  {post.is_published ? "Published" : "Draft"}
                </span>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Date</label>
                <input
                  type="datetime-local"
                  value={(post.date as string) || ""}
                  onChange={(e) => updateField("date", e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Draft"}
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? "..." : post.is_published ? "Update" : "Publish"}
                </button>
              </div>
              {saved && (
                <p className="text-xs text-brand-green text-center">Saved!</p>
              )}
              {!isNew && (
                <div className="pt-2 border-t border-zinc-100 flex justify-between">
                  <a
                    href={`/blog/${post.slug}/`}
                    target="_blank"
                    className="text-xs text-brand-blue hover:underline"
                  >
                    View post &rarr;
                  </a>
                  <button
                    onClick={handleDelete}
                    className="text-xs text-brand-red hover:underline"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Featured Image */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">Featured Image</h3>
            {(post.image as string) ? (
              <div className="relative mb-3">
                <img
                  src={post.image as string}
                  alt="Featured"
                  className="w-full rounded-lg object-cover aspect-video"
                />
                <button
                  onClick={() => updateField("image", "")}
                  className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center text-xs hover:bg-black/70"
                >
                  &times;
                </button>
              </div>
            ) : null}
            <input
              type="text"
              value={(post.image as string) || ""}
              onChange={(e) => updateField("image", e.target.value)}
              placeholder="Image URL..."
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue"
            />
          </div>

          {/* Category */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">Category</h3>
            <select
              value={(post.category as string) || ""}
              onChange={(e) => updateField("category", e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue"
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <input
              type="text"
              value={(post.category as string) || ""}
              onChange={(e) => updateField("category", e.target.value)}
              placeholder="Or type a new category..."
              className="w-full mt-2 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue"
            />
          </div>

          {/* Author */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">Author</h3>
            <select
              value={(post.author_id as string) || ""}
              onChange={(e) => {
                const selected = authors.find((a) => a.id === e.target.value);
                updateField("author_id", e.target.value);
                if (selected) updateField("author_name", selected.display_name);
              }}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue"
            >
              <option value="">Select author</option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>{a.display_name}</option>
              ))}
            </select>
          </div>

          {/* Options */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">Options</h3>
            <label className="flex items-center gap-2 text-sm text-zinc-700 mb-2">
              <input
                type="checkbox"
                checked={!!post.is_featured}
                onChange={(e) => updateField("is_featured", e.target.checked)}
                className="rounded border-zinc-300 text-brand-blue focus:ring-brand-blue"
              />
              Featured post
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={!!post.is_syndicated}
                onChange={(e) => updateField("is_syndicated", e.target.checked)}
                className="rounded border-zinc-300 text-brand-blue focus:ring-brand-blue"
              />
              Syndicated content
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

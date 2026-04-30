"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();

interface Author {
  id: string;
  display_name: string;
  bio: string | null;
  website: string | null;
  twitter: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  youtube: string | null;
}

export default function AdminAuthorsPage() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Author | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("authors")
      .select("id, display_name, bio, website, twitter, facebook, instagram, linkedin, youtube")
      .order("display_name")
      .limit(1000)
      .then(({ data }) => {
        if (data) setAuthors(data);
        setLoading(false);
      });
  }, []);

  const handleEdit = (author: Author) => {
    setEditing(author.id);
    setEditData({ ...author });
  };

  const handleSave = async () => {
    if (!editData || !supabase) return;
    setSaving(true);
    const { error } = await supabase
      .from("authors")
      .update({
        display_name: editData.display_name,
        bio: editData.bio,
        website: editData.website,
        twitter: editData.twitter,
        facebook: editData.facebook,
        instagram: editData.instagram,
        linkedin: editData.linkedin,
        youtube: editData.youtube,
      })
      .eq("id", editData.id);

    if (!error) {
      setAuthors((prev) => prev.map((a) => (a.id === editData.id ? editData : a)));
      setEditing(null);
      setEditData(null);
    }
    setSaving(false);
  };

  const filtered = search
    ? authors.filter((a) => a.display_name.toLowerCase().includes(search.toLowerCase()))
    : authors;

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href="/admin" className="text-sm text-brand-blue hover:underline">&larr; Admin</Link>
          <h1 className="text-xl font-bold text-zinc-900">Authors</h1>
          <span className="text-sm text-zinc-400">({authors.length})</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search authors..."
          className="w-full mb-6 px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue"
        />

        {/* Edit modal */}
        {editing && editData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-zinc-900">Edit Author</h2>
                <button onClick={() => { setEditing(null); setEditData(null); }} className="text-zinc-400 hover:text-zinc-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="space-y-3">
                {[
                  { key: "display_name", label: "Name" },
                  { key: "bio", label: "Bio", textarea: true },
                  { key: "website", label: "Website" },
                  { key: "twitter", label: "Twitter/X URL" },
                  { key: "facebook", label: "Facebook URL" },
                  { key: "instagram", label: "Instagram URL" },
                  { key: "linkedin", label: "LinkedIn URL" },
                  { key: "youtube", label: "YouTube URL" },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">{field.label}</label>
                    {field.textarea ? (
                      <textarea
                        value={(editData[field.key as keyof Author] as string) || ""}
                        onChange={(e) => setEditData({ ...editData, [field.key]: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm resize-none"
                      />
                    ) : (
                      <input
                        type="text"
                        value={(editData[field.key as keyof Author] as string) || ""}
                        onChange={(e) => setEditData({ ...editData, [field.key]: e.target.value })}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => { setEditing(null); setEditData(null); }} className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg disabled:opacity-50">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">{[...Array(10)].map((_, i) => <div key={i} className="h-14 bg-white rounded-lg animate-pulse" />)}</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((author) => (
              <div key={author.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-zinc-100 hover:border-zinc-200 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-brand-blue-light text-brand-blue flex items-center justify-center text-sm font-bold shrink-0">
                    {author.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{author.display_name}</p>
                    <p className="text-xs text-zinc-400 truncate">{author.bio?.slice(0, 60) || "No bio"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {author.website && <span className="w-2 h-2 rounded-full bg-brand-green" title="Has website" />}
                  <button
                    onClick={() => handleEdit(author)}
                    className="px-3 py-1 text-xs font-medium text-brand-blue hover:bg-brand-blue-light rounded-lg transition-colors"
                  >
                    Edit
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

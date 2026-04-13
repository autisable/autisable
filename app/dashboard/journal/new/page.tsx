"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();
export default function NewJournalEntryPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"private" | "followers" | "all_members">("private");
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
    };
    void checkAuth();
  }, [router]);

  // Auto-save timer
  useEffect(() => {
    if (!title && !content) return;
    const timer = setTimeout(() => {
      // Could implement auto-save to drafts here
    }, 5000);
    return () => clearTimeout(timer);
  }, [title, content]);

  const handleSave = async () => {
    if (!userId || (!title.trim() && !content.trim())) return;
    setSaving(true);

    const { error } = await supabase.from("journal_entries").insert({
      user_id: userId,
      title: title.trim() || "Untitled",
      content: content.trim(),
      visibility,
    });

    if (!error) {
      router.push("/dashboard/journal");
    }
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <Link href="/dashboard/journal" className="text-sm text-brand-blue hover:underline">
          &larr; Back to journal
        </Link>
        <div className="flex items-center gap-3">
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as typeof visibility)}
            className="px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue"
          >
            <option value="private">Private (only me)</option>
            <option value="followers">Followers</option>
            <option value="all_members">All Members</option>
          </select>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Entry"}
          </button>
        </div>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Entry title..."
        className="w-full text-3xl font-bold text-zinc-900 placeholder:text-zinc-300 border-0 focus:ring-0 p-0 mb-6"
      />

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Start writing..."
        rows={20}
        className="w-full text-lg text-zinc-700 placeholder:text-zinc-300 border-0 focus:ring-0 p-0 resize-none leading-relaxed"
      />
    </div>
  );
}

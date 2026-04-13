"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  visibility: "private" | "followers" | "all_members";
  created_at: string;
  updated_at: string;
}

const visibilityLabels: Record<string, { label: string; color: string }> = {
  private: { label: "Private", color: "bg-zinc-100 text-zinc-600" },
  followers: { label: "Followers", color: "bg-brand-blue-light text-brand-blue" },
  all_members: { label: "All Members", color: "bg-brand-green-light text-brand-green" },
};

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("journal_entries")
        .select("id, title, content, visibility, created_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (data) setEntries(data);
      setLoading(false);
    };
    void load();
  }, [router]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/dashboard" className="text-sm text-brand-blue hover:underline mb-2 inline-block">
            &larr; Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900">My Journal</h1>
        </div>
        <Link
          href="/dashboard/journal/new"
          className="px-5 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-xl transition-colors"
        >
          New Entry
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-6 bg-white rounded-2xl border border-zinc-100 animate-pulse">
              <div className="h-5 bg-zinc-100 rounded w-1/3 mb-3" />
              <div className="h-4 bg-zinc-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 mb-2">Start Your Journal</h2>
          <p className="text-zinc-500 mb-6">Write privately or share with the community. Your space, your rules.</p>
          <Link
            href="/dashboard/journal/new"
            className="inline-flex px-6 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-xl transition-colors"
          >
            Write Your First Entry
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <Link
              key={entry.id}
              href={`/dashboard/journal/${entry.id}`}
              className="block p-6 bg-white rounded-2xl border border-zinc-100 hover:shadow-md hover:border-zinc-200 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-zinc-900 truncate">
                    {entry.title || "Untitled"}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500 line-clamp-2">
                    {entry.content?.replace(/<[^>]*>/g, "").slice(0, 150)}
                  </p>
                </div>
                <span className={`shrink-0 px-3 py-1 text-xs font-medium rounded-full ${visibilityLabels[entry.visibility]?.color || "bg-zinc-100 text-zinc-600"}`}>
                  {visibilityLabels[entry.visibility]?.label || entry.visibility}
                </span>
              </div>
              <p className="mt-3 text-xs text-zinc-400">
                {new Date(entry.updated_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

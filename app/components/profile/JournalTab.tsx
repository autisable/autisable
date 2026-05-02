"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();

interface Entry {
  id: string;
  title: string;
  content: string;
  visibility: "private" | "followers" | "all_members";
  submission_status: string | null;
  updated_at: string;
}

const visibilityChip: Record<string, string> = {
  private: "bg-zinc-100 text-zinc-600",
  followers: "bg-brand-blue-light text-brand-blue",
  all_members: "bg-brand-green-light text-brand-green",
};

const visibilityLabel: Record<string, string> = {
  private: "Private",
  followers: "Followers",
  all_members: "All Members",
};

export default function JournalTab({ profileUserId }: { profileUserId: string }) {
  const [state, setState] = useState<"checking" | "forbidden" | "loading" | "ready">("checking");
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== profileUserId) {
        setState("forbidden");
        return;
      }
      setState("loading");
      const { data } = await supabase
        .from("journal_entries")
        .select("id, title, content, visibility, submission_status, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(30);
      setEntries((data as Entry[]) || []);
      setState("ready");
    })();
  }, [profileUserId]);

  if (state === "checking" || state === "loading") {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (state === "forbidden") {
    return (
      <div className="text-center py-12 bg-zinc-50 rounded-2xl">
        <p className="text-zinc-500 text-sm">
          Journal entries are private to the author. Only they can see this tab.
        </p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 bg-zinc-50 rounded-2xl">
        <p className="text-zinc-500 text-sm mb-3">You haven&apos;t written anything yet.</p>
        <Link
          href="/dashboard/journal/new"
          className="inline-block px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-xl"
        >
          Start a journal entry
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((e) => (
        <Link
          key={e.id}
          href={`/dashboard/journal/${e.id}`}
          className="block p-5 bg-white rounded-2xl border border-zinc-100 hover:border-zinc-200 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between gap-4 mb-2">
            <h3 className="text-base font-semibold text-zinc-900 line-clamp-1 flex-1">
              {e.title || "Untitled"}
            </h3>
            <span className={`shrink-0 px-2.5 py-0.5 text-xs font-medium rounded-full ${visibilityChip[e.visibility]}`}>
              {visibilityLabel[e.visibility]}
            </span>
          </div>
          <p className="text-sm text-zinc-600 line-clamp-2 leading-relaxed">
            {e.content?.replace(/<[^>]*>/g, "").slice(0, 200)}
          </p>
          <p className="text-xs text-zinc-400 mt-3">
            {new Date(e.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </Link>
      ))}
    </div>
  );
}

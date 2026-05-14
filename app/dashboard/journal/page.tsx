"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();
interface JournalEntry {
  id: string;
  title: string;
  content: string;
  visibility: "private" | "followers" | "all_members";
  submission_status: string | null;
  created_at: string;
  updated_at: string;
}

const visibilityLabels: Record<string, { label: string; color: string }> = {
  private: { label: "Private", color: "bg-zinc-100 text-zinc-600" },
  followers: { label: "Followers", color: "bg-brand-blue-light text-brand-blue" },
  all_members: { label: "All Members", color: "bg-brand-green-light text-brand-green" },
};

// "Submitted" by itself read as a vague status — members didn't know if
// editors had seen it or what came next. The clearer phrasing tracks
// the actual workflow: submitted entries are sitting in the editorial
// queue awaiting review. `tooltip` powers the tap/hover helper text.
const submissionLabels: Record<string, { label: string; color: string; tooltip: string }> = {
  submitted: {
    label: "Pending Editorial Review",
    color: "bg-brand-blue-light text-brand-blue",
    tooltip: "Editors will read this entry and let you know whether it gets featured.",
  },
  under_review: {
    label: "Under Review",
    color: "bg-brand-blue-light text-brand-blue",
    tooltip: "An editor has picked this entry up and is reading it now.",
  },
  approved: {
    label: "Approved",
    color: "bg-brand-green-light text-brand-green",
    tooltip: "Approved for feature — will appear publicly soon.",
  },
  published: {
    label: "Published",
    color: "bg-brand-green-light text-brand-green",
    tooltip: "Live on the site as a featured entry.",
  },
  returned: {
    label: "Returned",
    color: "bg-brand-orange-light text-brand-orange",
    tooltip: "Editor sent the entry back with notes. Open it to revise.",
  },
};

// Same compact relative-time helper as the dashboard; copied locally
// so the journal page doesn't depend on the dashboard module.
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("journal_entries")
        .select("id, title, content, visibility, submission_status, created_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (data) setEntries(data);
      setLoading(false);
    };
    void load();
  }, [router]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry? This can't be undone.")) return;
    const { error } = await supabase.from("journal_entries").delete().eq("id", id).select("id");
    if (error) {
      alert(`Delete failed: ${error.message}`);
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const lastEntry = entries[0];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24 sm:pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/dashboard" className="text-sm text-brand-blue hover:underline mb-2 inline-block">
            &larr; Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900">My Journal</h1>
        </div>
        {/* Desktop new-entry button. On mobile this is hidden in favor of
            the floating action button anchored to the viewport. */}
        <Link
          href="/dashboard/journal/new"
          className="hidden sm:inline-block px-5 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-xl transition-colors"
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
          <p className="max-w-md mx-auto text-zinc-700 mb-6 text-base leading-relaxed">
            Your journal is just for you. Write something — nobody has to see it.
          </p>
          <Link
            href="/dashboard/journal/new"
            className="inline-flex px-6 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-xl transition-colors"
          >
            New Entry
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {entries.map((entry) => {
              const submission = entry.submission_status
                ? submissionLabels[entry.submission_status]
                : null;
              const revealed = revealedId === entry.id;
              return (
                <div
                  key={entry.id}
                  className="group relative bg-white rounded-2xl border border-zinc-100 hover:shadow-md hover:border-zinc-200 transition-all overflow-hidden"
                >
                  <Link
                    href={`/dashboard/journal/${entry.id}`}
                    className="block p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-zinc-900 truncate pr-12 sm:pr-0">
                          {entry.title || "Untitled"}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-500 line-clamp-2">
                          {entry.content?.replace(/<[^>]*>/g, "").slice(0, 150)}
                        </p>
                      </div>
                      <div className="shrink-0 flex flex-col gap-1 items-end">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${visibilityLabels[entry.visibility]?.color || "bg-zinc-100 text-zinc-600"}`}>
                          {visibilityLabels[entry.visibility]?.label || entry.visibility}
                        </span>
                        {submission && (
                          <span
                            title={submission.tooltip}
                            className={`px-3 py-1 text-xs font-medium rounded-full cursor-help ${submission.color}`}
                          >
                            {submission.label}
                          </span>
                        )}
                      </div>
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

                  {/* Edit pencil. Visible on hover on desktop, always visible
                      on touch viewports — tapping opens edit, and a separate
                      delete button is exposed via the "reveal" toggle so an
                      accidental tap doesn't nuke the entry. */}
                  <Link
                    href={`/dashboard/journal/${entry.id}`}
                    aria-label="Edit entry"
                    className="absolute top-4 right-4 sm:opacity-0 group-hover:sm:opacity-100 transition-opacity p-2 rounded-lg bg-white border border-zinc-200 text-zinc-500 hover:text-brand-blue hover:border-brand-blue"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </Link>

                  {/* Mobile-only kebab → reveals Delete. The Edit pencil
                      above already covers the edit path; keeping Delete
                      one step behind a deliberate tap prevents misfires
                      on touch. */}
                  <button
                    type="button"
                    aria-label="More options"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setRevealedId(revealed ? null : entry.id);
                    }}
                    className="sm:hidden absolute bottom-4 right-4 p-2 rounded-lg text-zinc-400 hover:text-zinc-700"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                    </svg>
                  </button>
                  {revealed && (
                    <div className="sm:hidden absolute bottom-12 right-4 z-10 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 min-w-[140px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void handleDelete(entry.id);
                          setRevealedId(null);
                        }}
                        className="block w-full text-left px-3 py-2 text-sm text-brand-red hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* "Last entry" timestamp + soft prompt to write again. The
              prompt is a button rather than plain text so the affordance
              reads clearly on mobile (no hover state to lean on). */}
          <div className="mt-8 text-center text-sm text-zinc-500 space-y-3">
            {lastEntry && (
              <p>
                Last entry: <span className="text-zinc-700">{relativeTime(lastEntry.updated_at)}</span>
              </p>
            )}
            <Link
              href="/dashboard/journal/new"
              className="inline-block text-zinc-500 hover:text-brand-blue"
            >
              Something on your mind?
            </Link>
          </div>
        </>
      )}

      {/* Mobile floating action button. Desktop uses the top-right "New
          Entry" button instead — both routes converge on /journal/new. */}
      <Link
        href="/dashboard/journal/new"
        aria-label="New journal entry"
        className="sm:hidden fixed bottom-5 right-5 z-30 w-14 h-14 rounded-full bg-brand-blue hover:bg-brand-blue-dark text-white flex items-center justify-center shadow-lg"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </Link>
    </div>
  );
}

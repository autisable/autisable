"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();

type Visibility = "private" | "followers" | "all_members";
type SubmissionStatus = "none" | "submitted" | "under_review" | "approved" | "published" | "returned" | null;

interface JournalEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  visibility: Visibility;
  submission_status: SubmissionStatus;
  created_at: string;
  updated_at: string;
}

const submissionLabels: Record<string, { label: string; color: string; description: string }> = {
  submitted: {
    label: "Submitted to Editors",
    color: "bg-brand-blue-light text-brand-blue",
    description: "Your entry is in the editorial queue. Edits are locked until an editor reviews it.",
  },
  under_review: {
    label: "Under Review",
    color: "bg-brand-blue-light text-brand-blue",
    description: "An editor is currently reviewing your entry. Edits remain locked.",
  },
  approved: {
    label: "Approved — Awaiting Publish",
    color: "bg-brand-green-light text-brand-green",
    description: "An editor approved your entry. It will be published soon.",
  },
  published: {
    label: "Published",
    color: "bg-brand-green-light text-brand-green",
    description: "Your entry was published as a story on Autisable.",
  },
  returned: {
    label: "Returned with Notes",
    color: "bg-brand-orange-light text-brand-orange",
    description: "An editor sent your entry back. You can edit and resubmit.",
  },
};

const isLocked = (status: SubmissionStatus): boolean => {
  return status === "submitted" || status === "under_review" || status === "approved" || status === "published";
};

export default function EditJournalPage() {
  const router = useRouter();
  const params = useParams();
  const journalId = params.id as string;

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      const { data, error: loadError } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("id", journalId)
        .eq("user_id", user.id)
        .single();

      if (loadError || !data) {
        setError("Entry not found, or you don't have access to it.");
        setLoading(false);
        return;
      }

      const e = data as JournalEntry;
      setEntry(e);
      setTitle(e.title || "");
      setContent(e.content || "");
      setVisibility(e.visibility || "private");
      setLoading(false);
    };
    void load();
  }, [journalId, router]);

  const locked = isLocked(entry?.submission_status ?? null);

  const handleSave = async () => {
    if (!entry || !userId || locked) return;
    setSaving(true);
    const { error: saveError } = await supabase
      .from("journal_entries")
      .update({
        title: title.trim() || "Untitled",
        content: content.trim(),
        visibility,
        updated_at: new Date().toISOString(),
      })
      .eq("id", entry.id);
    if (saveError) {
      setError(saveError.message);
    } else {
      setEntry({ ...entry, title: title.trim() || "Untitled", content: content.trim(), visibility });
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!entry || locked) return;
    if (!confirm("Delete this journal entry? This cannot be undone.")) return;
    await supabase.from("journal_entries").delete().eq("id", entry.id);
    router.push("/dashboard/journal");
  };

  const handleSubmitToEditors = async () => {
    if (!entry || !userId || locked) return;
    setSubmitting(true);

    // 1. Save current edits
    await supabase
      .from("journal_entries")
      .update({
        title: title.trim() || "Untitled",
        content: content.trim(),
        visibility,
        submission_status: "submitted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", entry.id);

    // 2. Build a slug + create blog_posts row in pending_review for editors
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("display_name")
      .eq("id", userId)
      .single();

    let authorId: string | null = null;
    if (profile?.display_name) {
      const { data: author } = await supabase
        .from("authors")
        .select("id")
        .eq("display_name", profile.display_name)
        .maybeSingle();
      if (author) authorId = author.id;
    }

    const baseSlug = (title.trim() || "Untitled")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80);
    const uniqueSlug = baseSlug + "-" + Date.now().toString(36);

    const stripped = content.replace(/<[^>]*>/g, "").trim();

    await supabase.from("blog_posts").insert({
      title: title.trim() || "Untitled",
      slug: uniqueSlug,
      content: content.trim(),
      excerpt: stripped.slice(0, 280),
      category: "Bloggers",
      date: new Date().toISOString(),
      is_published: false,
      draft_status: "pending_review",
      is_syndicated: false,
      author_id: authorId,
      author_name: profile?.display_name || null,
    });

    setSubmitting(false);
    setConfirmingSubmit(false);
    router.push("/dashboard/journal");
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 mb-3">Couldn&apos;t load entry</h1>
        <p className="text-zinc-600 mb-6">{error}</p>
        <Link href="/dashboard/journal" className="inline-block px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-xl">
          Back to journal
        </Link>
      </div>
    );
  }

  const submissionMeta = entry?.submission_status ? submissionLabels[entry.submission_status] : null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-6">
        <Link href="/dashboard/journal" className="text-sm text-brand-blue hover:underline">
          &larr; Back to journal
        </Link>
        <div className="flex items-center gap-3">
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
            disabled={locked}
            className="px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue disabled:bg-zinc-50 disabled:text-zinc-400"
          >
            <option value="private">Private (only me)</option>
            <option value="followers">Followers</option>
            <option value="all_members">All Members</option>
          </select>
          <button
            onClick={handleSave}
            disabled={saving || locked}
            className="px-5 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {submissionMeta && (
        <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${submissionMeta.color}`}>
          <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <div className="text-sm">
            <p className="font-semibold">{submissionMeta.label}</p>
            <p className="opacity-80 mt-0.5">{submissionMeta.description}</p>
          </div>
        </div>
      )}

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled"
        disabled={locked}
        className="w-full text-3xl font-bold text-zinc-900 placeholder:text-zinc-300 border-0 bg-transparent focus:ring-0 p-0 mb-6 disabled:text-zinc-500"
      />

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write what's on your mind..."
        disabled={locked}
        rows={20}
        className="w-full text-base text-zinc-800 placeholder:text-zinc-300 border border-zinc-200 rounded-xl p-4 focus:ring-2 focus:ring-brand-blue resize-y disabled:bg-zinc-50 disabled:text-zinc-500"
      />

      {!locked && (
        <div className="mt-8 pt-8 border-t border-zinc-100 flex items-center justify-between gap-4">
          <button
            onClick={handleDelete}
            className="text-sm text-brand-red hover:underline"
          >
            Delete entry
          </button>
          {confirmingSubmit ? (
            <div className="flex items-center gap-3">
              <p className="text-xs text-zinc-500 max-w-xs">
                Once submitted, you won&apos;t be able to edit until an editor responds. Continue?
              </p>
              <button
                onClick={() => setConfirmingSubmit(false)}
                className="px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitToEditors}
                disabled={submitting}
                className="px-4 py-1.5 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Yes, submit"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingSubmit(true)}
              className="px-5 py-2 bg-white border border-brand-blue text-brand-blue hover:bg-brand-blue-light text-sm font-medium rounded-xl transition-colors"
            >
              Submit to Editors &rarr;
            </button>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabase } from "@/app/lib/supabase-browser";
import { hasAtLeast, type Role } from "@/app/lib/roles";

const supabase = getSupabase();

interface Props {
  itemId: string;
  itemOwnerId: string;
  currentUserId: string | null;
  currentUserRole: Role | null;
  onDeleted: () => void;
}

/**
 * Per-card kebab menu for community status updates. Two actions:
 *   - Delete: owner can delete their own; moderator+ can delete anyone's. RLS
 *     enforces both server-side, so the UI gate is just to keep the menu tidy.
 *   - Notify moderator: writes to moderation_reports. Hidden on the user's own
 *     post (no point reporting yourself).
 *
 * Scoped to activity_feed rows because Joel's scope was "status updates" — not
 * journals. Easy to extend later by parameterizing the table name.
 */
export default function FeedItemMenu({
  itemId,
  itemOwnerId,
  currentUserId,
  currentUserRole,
  onDeleted,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportSent, setReportSent] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Click-outside dismisses the menu. Don't bind unless open — saves a global
  // listener on every card in the feed.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setReportOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!currentUserId) return null;

  const isOwner = itemOwnerId === currentUserId;
  const isModerator = hasAtLeast(currentUserRole, "moderator");
  const canDelete = isOwner || isModerator;
  const canReport = !isOwner;
  if (!canDelete && !canReport) return null;

  const handleDelete = async () => {
    const msg = isOwner
      ? "Delete this post? This can't be undone."
      : "Delete this post as a moderator? The author won't be notified.";
    if (!confirm(msg)) return;
    setBusy(true);
    setError(null);
    const { error: delErr } = await supabase.from("activity_feed").delete().eq("id", itemId);
    setBusy(false);
    if (delErr) {
      setError(delErr.message);
    } else {
      onDeleted();
    }
  };

  const handleReport = async () => {
    setBusy(true);
    setError(null);
    const { error: reportErr } = await supabase.from("moderation_reports").insert({
      reporter_id: currentUserId,
      content_type: "activity_feed",
      content_id: itemId,
      reason: reportReason.trim() || "Flagged for moderator review",
    });
    setBusy(false);
    if (reportErr) {
      setError(reportErr.message);
      return;
    }
    setReportSent(true);
    // Auto-dismiss after the confirmation flashes long enough to read.
    window.setTimeout(() => {
      setOpen(false);
      setReportOpen(false);
      setReportSent(false);
      setReportReason("");
    }, 1500);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="More actions"
        className="p-1.5 -mr-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 min-w-[200px]">
          {!reportOpen && (
            <>
              {canReport && (
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
                  </svg>
                  Notify moderator
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={busy}
                  className="w-full text-left px-3 py-2 text-sm text-brand-red hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                  {isOwner ? "Delete" : "Delete (moderator)"}
                </button>
              )}
            </>
          )}

          {reportOpen && (
            <div className="px-3 py-2 w-72">
              {!reportSent ? (
                <>
                  <p className="text-xs font-medium text-zinc-700 mb-1">Notify moderator</p>
                  <p className="text-xs text-zinc-500 mb-2">
                    What&apos;s wrong with this post? (optional)
                  </p>
                  <textarea
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="e.g. spam, harassment, off-topic"
                    className="w-full px-2 py-1.5 text-sm border border-zinc-200 rounded-md resize-none focus:ring-2 focus:ring-brand-blue"
                  />
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setReportOpen(false)}
                      disabled={busy}
                      className="px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-100 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleReport}
                      disabled={busy}
                      className="px-3 py-1 text-xs bg-brand-blue hover:bg-brand-blue-dark text-white font-medium rounded-md disabled:opacity-50"
                    >
                      {busy ? "Sending…" : "Submit"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-brand-green py-2">
                  Thanks — a moderator will review this shortly.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="absolute right-0 top-full mt-1 text-xs text-brand-red bg-red-50 border border-red-100 rounded-md px-2 py-1 whitespace-nowrap">
          {error}
        </p>
      )}
    </div>
  );
}

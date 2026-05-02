"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();

interface Message {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  reason: string | null;
  message: string;
  created_at: string;
  resolved_at: string | null;
}

interface MemberMatch {
  id: string;
  display_name: string | null;
}

type Tab = "open" | "author" | "resolved";

const REASON_LABEL: Record<string, string> = {
  general: "General Inquiry",
  partnership: "Partnership / Sponsorship",
  press: "Press / Media",
  podcast: "Podcast Guest Request",
  support: "Technical Support",
  accessibility: "Accessibility Feedback",
  privacy: "Privacy / Data Request",
  legal: "Legal / Moderation Appeal",
  author_post_removal: "Author: Post removal",
  author_account_removal: "Author: Account removal",
  other: "Other",
};

function isAuthorReason(reason: string | null) {
  return reason === "author_post_removal" || reason === "author_account_removal";
}

export default function AdminContactMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("open");
  // Email → user profile match for "this is also a member" hints in the list
  const [memberByEmail, setMemberByEmail] = useState<Map<string, MemberMatch>>(new Map());

  const loadMessages = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);

    let q = supabase
      .from("contact_messages")
      .select("id, first_name, last_name, email, reason, message, created_at, resolved_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (tab === "open") q = q.is("resolved_at", null);
    if (tab === "resolved") q = q.not("resolved_at", "is", null);
    if (tab === "author") q = q.in("reason", ["author_post_removal", "author_account_removal"]);

    const { data } = await q;
    const msgs: Message[] = data || [];
    setMessages(msgs);

    // Look up which submitters are existing members so the admin sees the
    // overlap at a glance (esp. for author removal requests).
    const emails = [...new Set(msgs.map((m) => m.email.toLowerCase()))];
    if (emails.length > 0) {
      // user_profiles doesn't store email directly; emails live in auth.users.
      // From the browser we can only match by an admin RPC or by display_name
      // proxy. Skipping auth.users join here on purpose — this view is best-
      // effort and the admin can always click into a member dashboard manually.
      // Future improvement: a `/api/admin/member-by-email` endpoint that uses
      // service-role to query auth.users and returns the matched profiles.
      setMemberByEmail(new Map());
    }

    setLoading(false);
  }, [tab]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const counts = useMemo(() => {
    const open = messages.filter((m) => !m.resolved_at).length;
    const author = messages.filter((m) => isAuthorReason(m.reason)).length;
    return { open, author };
  }, [messages]);

  const handleResolve = async (id: string) => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("contact_messages")
      .update({ resolved_at: new Date().toISOString(), resolved_by_user_id: user.id })
      .eq("id", id);
    setMessages((prev) => prev.filter((m) => m.id !== id || tab !== "open"));
    if (tab === "open" || tab === "author") {
      // Refetch so the resolved item drops out of the open/author lists
      void loadMessages();
    }
  };

  const handleReopen = async (id: string) => {
    if (!supabase) return;
    await supabase
      .from("contact_messages")
      .update({ resolved_at: null, resolved_by_user_id: null })
      .eq("id", id);
    void loadMessages();
  };

  const tabBtnClass = (active: boolean) =>
    `px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
      active ? "bg-brand-blue text-white" : "text-zinc-600 hover:bg-zinc-100"
    }`;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-zinc-900">Contact Messages</h1>
        <p className="mt-1 text-zinc-500 text-sm">
          Inbound submissions from the public contact form. Author requests are flagged in amber.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto">
        <button onClick={() => setTab("open")} className={tabBtnClass(tab === "open")}>
          Open
        </button>
        <button onClick={() => setTab("author")} className={tabBtnClass(tab === "author")}>
          Author requests
        </button>
        <button onClick={() => setTab("resolved")} className={tabBtnClass(tab === "resolved")}>
          Resolved
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-5 bg-white rounded-xl border border-zinc-100 animate-pulse">
              <div className="h-4 bg-zinc-100 rounded w-1/3 mb-3" />
              <div className="h-3 bg-zinc-100 rounded w-2/3 mb-2" />
              <div className="h-3 bg-zinc-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-zinc-100">
          <p className="text-zinc-500">
            {tab === "open" && "No open messages. Inbox zero."}
            {tab === "author" && "No author removal/leave requests."}
            {tab === "resolved" && "No resolved messages yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => {
            const isAuthor = isAuthorReason(m.reason);
            const member = memberByEmail.get(m.email.toLowerCase());
            return (
              <div
                key={m.id}
                className={`p-5 bg-white rounded-xl border ${
                  isAuthor ? "border-amber-300 bg-amber-50/30" : "border-zinc-100"
                } ${m.resolved_at ? "opacity-70" : ""}`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-zinc-900">
                        {m.first_name} {m.last_name}
                      </span>
                      <a
                        href={`mailto:${m.email}`}
                        className="text-sm text-brand-blue hover:underline"
                      >
                        {m.email}
                      </a>
                      {member && (
                        <Link
                          href={`/member/${member.id}`}
                          className="text-xs px-2 py-0.5 bg-brand-blue-light text-brand-blue rounded-full hover:opacity-80"
                        >
                          Member: {member.display_name || "view"}
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isAuthor
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {REASON_LABEL[m.reason || ""] || m.reason || "No reason"}
                      </span>
                      <time className="text-xs text-zinc-400">
                        {new Date(m.created_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </time>
                      {m.resolved_at && (
                        <span className="text-xs text-zinc-400">
                          · Resolved {new Date(m.resolved_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <a
                      href={`mailto:${m.email}?subject=Re: Your Autisable contact form submission`}
                      className="px-3 py-1.5 text-xs font-medium bg-white border border-zinc-200 hover:border-zinc-400 text-zinc-700 rounded-lg"
                    >
                      Reply
                    </a>
                    {m.resolved_at ? (
                      <button
                        onClick={() => handleReopen(m.id)}
                        className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg"
                      >
                        Reopen
                      </button>
                    ) : (
                      <button
                        onClick={() => handleResolve(m.id)}
                        className="px-3 py-1.5 text-xs font-medium bg-brand-green text-white hover:opacity-90 rounded-lg"
                      >
                        Mark resolved
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
                  {m.message}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {tab !== "resolved" && counts.open > 0 && (
        <p className="mt-6 text-xs text-zinc-400 text-center">
          {counts.open} open · {counts.author} author request{counts.author === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}

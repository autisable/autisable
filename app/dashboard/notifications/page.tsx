"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/app/lib/supabase-browser";
import { relativeTime } from "@/app/lib/relativeTime";

const supabase = getSupabase();

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  actor_user_id: string | null;
  actor_display_name: string | null;
  actor_avatar_url: string | null;
  is_read: boolean;
  created_at: string;
}

type Tab = "all" | "unread";

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    let q = supabase
      .from("notifications")
      .select("id, type, title, message, link, actor_user_id, actor_display_name, actor_avatar_url, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (tab === "unread") q = q.eq("is_read", false);
    const { data } = await q;
    setItems(data || []);
    setLoading(false);
  }, [router, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (id: string) => {
    // Optimistic
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };

  const markAllRead = async () => {
    if (marking) return;
    setMarking(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Optimistic — flip everything visible to read
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
    }
    setMarking(false);
  };

  const unreadCount = items.filter((n) => !n.is_read).length;

  const tabBtnClass = (active: boolean) =>
    `px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
      active ? "bg-brand-blue text-white" : "text-zinc-600 hover:bg-zinc-100"
    }`;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Notifications</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Likes, replies, follows, and editorial updates.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={marking}
            className="text-sm text-brand-blue hover:underline disabled:opacity-50"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => setTab("all")} className={tabBtnClass(tab === "all")}>
          All
        </button>
        <button onClick={() => setTab("unread")} className={tabBtnClass(tab === "unread")}>
          Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-zinc-100">
          <p className="text-zinc-500">
            {tab === "unread" ? "No unread notifications. Inbox zero." : "No notifications yet."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const Inner = (
              <div className="flex items-start gap-3 w-full">
                {n.actor_avatar_url || n.actor_user_id ? (
                  <Link
                    href={n.actor_user_id ? `/member/${n.actor_user_id}` : "#"}
                    className="w-10 h-10 rounded-full bg-brand-blue-light text-brand-blue flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden hover:opacity-80"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {n.actor_avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={n.actor_avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      n.actor_display_name?.charAt(0).toUpperCase() || "?"
                    )}
                  </Link>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-brand-blue-light text-brand-blue flex items-center justify-center text-sm font-bold shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.is_read ? "text-zinc-700" : "font-semibold text-zinc-900"}`}>
                    {n.title}
                  </p>
                  {n.message && (
                    <p className="text-sm text-zinc-500 mt-0.5 line-clamp-2">{n.message}</p>
                  )}
                  <time
                    className="text-xs text-zinc-400 mt-1 block"
                    dateTime={n.created_at}
                    title={new Date(n.created_at).toLocaleString()}
                  >
                    {relativeTime(n.created_at)}
                  </time>
                </div>
                {!n.is_read && (
                  <span className="w-2 h-2 rounded-full bg-brand-blue mt-2 shrink-0" aria-label="unread" />
                )}
              </div>
            );
            return (
              <li key={n.id}>
                {n.link ? (
                  <Link
                    href={n.link}
                    onClick={() => !n.is_read && void markRead(n.id)}
                    className={`block p-4 rounded-xl border transition-all hover:shadow-sm ${
                      n.is_read ? "bg-white border-zinc-100" : "bg-brand-blue-light/30 border-brand-blue/15"
                    }`}
                  >
                    {Inner}
                  </Link>
                ) : (
                  <button
                    onClick={() => !n.is_read && void markRead(n.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      n.is_read ? "bg-white border-zinc-100" : "bg-brand-blue-light/30 border-brand-blue/15"
                    }`}
                  >
                    {Inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

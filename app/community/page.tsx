"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface FeedItem {
  id: string;
  user_id: string;
  display_name: string;
  content: string;
  type: "journal" | "post";
  created_at: string;
  reactions_count: number;
  replies_count: number;
}

export default function CommunityPage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) setUser({ id: u.id });

      const { data } = await supabase
        .from("activity_feed")
        .select("id, user_id, display_name, content, type, created_at, reactions_count, replies_count")
        .order("created_at", { ascending: false })
        .limit(30);

      if (data) setFeed(data);
      setLoading(false);
    };
    void load();
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Community</h1>
          <p className="mt-1 text-zinc-500">See what members are sharing.</p>
        </div>
        {user && (
          <Link
            href="/community/directory"
            className="text-sm font-medium text-brand-blue hover:text-brand-blue-dark"
          >
            Member Directory
          </Link>
        )}
      </div>

      {!user && (
        <div className="mb-8 p-8 bg-gradient-to-br from-brand-blue-light to-white rounded-2xl border border-brand-blue/10 text-center">
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Join the Conversation</h2>
          <p className="text-zinc-600 mb-4">
            Sign up to post, react, and connect with other community members.
          </p>
          <Link
            href="/register"
            className="inline-flex px-6 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-xl transition-colors"
          >
            Join Autisable
          </Link>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-6 bg-white rounded-2xl border border-zinc-100 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-zinc-100 rounded-full" />
                <div className="h-4 bg-zinc-100 rounded w-24" />
              </div>
              <div className="h-4 bg-zinc-100 rounded w-full mb-2" />
              <div className="h-4 bg-zinc-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : feed.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-zinc-500">No activity yet. Be the first to share!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feed.map((item) => (
            <div key={item.id} className="p-6 bg-white rounded-2xl border border-zinc-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-brand-blue-light text-brand-blue flex items-center justify-center text-sm font-bold">
                  {item.display_name?.charAt(0).toUpperCase() || "?"}
                </div>
                <div>
                  <span className="text-sm font-semibold text-zinc-900">{item.display_name}</span>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <time>
                      {new Date(item.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                    {item.type === "journal" && (
                      <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full text-[10px] font-medium">
                        Journal
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
                {item.content?.replace(/<[^>]*>/g, "").slice(0, 500)}
              </p>
              <div className="mt-4 flex items-center gap-4 text-xs text-zinc-400">
                <button className="inline-flex items-center gap-1 hover:text-brand-blue transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                  </svg>
                  {item.reactions_count || 0}
                </button>
                <button className="inline-flex items-center gap-1 hover:text-brand-blue transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
                  </svg>
                  {item.replies_count || 0}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

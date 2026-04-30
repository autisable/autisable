"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();

type Status = "all" | "published" | "scheduled" | "pending" | "in_progress" | "rejected" | "drafts";

interface Post {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  author_name: string | null;
  is_published: boolean;
  draft_status: string | null;
  date: string;
}

interface AuthorOption { id: string; display_name: string; }

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "published", label: "Published" },
  { value: "scheduled", label: "Scheduled" },
  { value: "pending", label: "Pending Review" },
  { value: "in_progress", label: "In Progress" },
  { value: "rejected", label: "Rejected" },
  { value: "drafts", label: "Draft" },
];

const WEEK_OPTIONS = [4, 8, 12, 16, 24];

// Returns the Monday of the week containing d, normalized to 00:00 local time.
function startOfWeek(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay(); // 0=Sun ... 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift so Monday=0
  date.setDate(date.getDate() + diff);
  return date;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function statusOf(p: Post): { label: string; color: string } {
  if (p.is_published) return { label: "Published", color: "bg-brand-green-light text-brand-green" };
  if (p.draft_status === "ready_for_scheduling") return { label: "Scheduled", color: "bg-brand-blue-light text-brand-blue" };
  if (p.draft_status === "pending_review") return { label: "Pending Review", color: "bg-brand-blue-light text-brand-blue" };
  if (p.draft_status === "in_progress") return { label: "In Progress", color: "bg-zinc-100 text-zinc-600" };
  if (p.draft_status === "rejected") return { label: "Rejected", color: "bg-brand-orange-light text-brand-orange" };
  return { label: "Draft", color: "bg-zinc-100 text-zinc-500" };
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function CalendarPage() {
  const router = useRouter();
  const [authors, setAuthors] = useState<AuthorOption[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("all");
  const [authorName, setAuthorName] = useState("");
  const [category, setCategory] = useState("");
  const [numWeeks, setNumWeeks] = useState(12);
  const [windowStart, setWindowStart] = useState(() => startOfWeek(new Date()));
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Auth check (matches existing admin pages)
  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (!profile || profile.role !== "admin") { router.push("/dashboard"); return; }
      setIsAdmin(true);
    };
    void check();
  }, [router]);

  // Load filter options (authors + distinct categories)
  useEffect(() => {
    if (!isAdmin) return;
    void (async () => {
      const [authorsRes, catsRes] = await Promise.all([
        supabase.from("authors").select("id, display_name").order("display_name").limit(1000),
        supabase.from("blog_posts").select("category").not("category", "is", null),
      ]);
      if (authorsRes.data) setAuthors(authorsRes.data);
      if (catsRes.data) {
        const uniq = [...new Set(catsRes.data.map((c) => c.category as string).filter(Boolean))].sort();
        setCategories(uniq);
      }
    })();
  }, [isAdmin]);

  const windowEnd = useMemo(() => addDays(windowStart, numWeeks * 7), [windowStart, numWeeks]);

  // Load posts within the visible window + filters
  const loadPosts = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    let q = supabase
      .from("blog_posts")
      .select("id, title, slug, category, author_name, is_published, draft_status, date")
      .gte("date", windowStart.toISOString())
      .lt("date", windowEnd.toISOString())
      .or("draft_status.is.null,draft_status.neq.trash")
      .order("date", { ascending: true })
      .limit(1000);

    if (status === "published") q = q.eq("is_published", true);
    if (status === "drafts") q = q.eq("is_published", false).is("draft_status", null);
    if (status === "scheduled") q = q.eq("is_published", false).eq("draft_status", "ready_for_scheduling");
    if (status === "pending") q = q.eq("is_published", false).eq("draft_status", "pending_review");
    if (status === "in_progress") q = q.eq("is_published", false).eq("draft_status", "in_progress");
    if (status === "rejected") q = q.eq("is_published", false).eq("draft_status", "rejected");
    if (authorName) q = q.eq("author_name", authorName);
    if (category) q = q.eq("category", category);

    const { data } = await q;
    setPosts(data || []);
    setLoading(false);
  }, [isAdmin, windowStart, windowEnd, status, authorName, category]);

  useEffect(() => { void loadPosts(); }, [loadPosts]);

  // Bucket posts by date key
  const postsByDate = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const p of posts) {
      const key = fmtDateKey(new Date(p.date));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [posts]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let w = 0; w < numWeeks; w++) {
      const row: Date[] = [];
      for (let d = 0; d < 7; d++) row.push(addDays(windowStart, w * 7 + d));
      result.push(row);
    }
    return result;
  }, [windowStart, numWeeks]);

  const goToday = () => setWindowStart(startOfWeek(new Date()));
  const shiftWeeks = (n: number) => setWindowStart(addDays(windowStart, n * 7));
  const reset = () => { setStatus("all"); setAuthorName(""); setCategory(""); setNumWeeks(12); goToday(); };

  if (!isAdmin) {
    return <div className="min-h-[60vh] flex items-center justify-center text-zinc-400 animate-pulse">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-brand-blue hover:underline">&larr; Admin</Link>
            <h1 className="text-xl font-bold text-zinc-900">Editorial Calendar</h1>
            <span className="text-sm text-zinc-400">({posts.length} {posts.length === 1 ? "post" : "posts"} in view)</span>
          </div>
          <Link href="/admin/posts" className="text-sm text-brand-blue hover:underline">List view &rarr;</Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Filters */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue">
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Author</label>
              <select value={authorName} onChange={(e) => setAuthorName(e.target.value)} className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue min-w-[12rem]">
                <option value="">All authors</option>
                {authors.map((a) => <option key={a.id} value={a.display_name}>{a.display_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue min-w-[10rem]">
                <option value="">All categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Number of weeks</label>
              <select value={numWeeks} onChange={(e) => setNumWeeks(Number(e.target.value))} className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue">
                {WEEK_OPTIONS.map((n) => <option key={n} value={n}>{n} weeks</option>)}
              </select>
            </div>
            <button onClick={reset} className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium rounded-lg transition-colors">
              Reset
            </button>
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => shiftWeeks(-numWeeks)} title="Jump back full window" className="px-2 py-1.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50">«</button>
              <button onClick={() => shiftWeeks(-1)} title="Previous week" className="px-2 py-1.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50">‹</button>
              <button onClick={goToday} className="px-3 py-1.5 border border-zinc-200 rounded-lg text-sm text-zinc-700 hover:bg-zinc-50">Today</button>
              <button onClick={() => shiftWeeks(1)} title="Next week" className="px-2 py-1.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50">›</button>
              <button onClick={() => shiftWeeks(numWeeks)} title="Jump forward full window" className="px-2 py-1.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50">»</button>
            </div>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-zinc-50 border-b border-zinc-200">
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => (
              <div key={d} className="px-3 py-2 text-center text-xs font-medium text-zinc-500 uppercase tracking-wider">{d}</div>
            ))}
          </div>
          {loading && posts.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 animate-pulse">Loading...</div>
          ) : (
            weeks.map((row, wIdx) => {
              // Show month divider if any cell in this row is the 1st of a month
              const monthChange = row.find((d) => d.getDate() === 1);
              const today = fmtDateKey(new Date());
              return (
                <div key={wIdx}>
                  {monthChange && (
                    <div className="px-3 py-1 text-[11px] text-zinc-400 bg-zinc-50/60 border-y border-zinc-100">
                      {MONTH_NAMES[monthChange.getMonth()]} {monthChange.getFullYear()}
                    </div>
                  )}
                  <div className="grid grid-cols-7 min-h-[8rem]">
                    {row.map((d, dIdx) => {
                      const key = fmtDateKey(d);
                      const dayPosts = postsByDate.get(key) || [];
                      const isToday = key === today;
                      return (
                        <div
                          key={dIdx}
                          className={`border-r border-b border-zinc-100 last:border-r-0 p-2 ${isToday ? "bg-brand-blue-light/30" : ""}`}
                        >
                          <div className="flex justify-end mb-1">
                            <span className={`text-xs ${isToday ? "font-bold text-brand-blue" : "text-zinc-400"}`}>
                              {d.getDate()}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {dayPosts.map((p) => {
                              const s = statusOf(p);
                              return (
                                <Link
                                  key={p.id}
                                  href={`/admin/posts/${p.id}`}
                                  className="block group"
                                  title={`${p.title}\n${p.author_name || "—"} · ${s.label}`}
                                >
                                  <p className="text-[11px] leading-snug text-zinc-800 group-hover:text-brand-blue line-clamp-2 font-medium">
                                    {p.title}
                                  </p>
                                  <span className={`inline-block mt-1 px-1.5 py-0.5 text-[9px] rounded-full ${s.color}`}>
                                    {s.label}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();
interface Profile {
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  role: string;
  status: string;
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("user_profiles")
        .select("display_name, bio, avatar_url, role, status")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data);
      setLoading(false);
    };
    void checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-100 rounded w-1/3" />
          <div className="h-4 bg-zinc-100 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (profile?.status === "pending_approval") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-brand-orange-light text-brand-orange flex items-center justify-center">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-3">Account Pending</h1>
        <p className="text-zinc-600">
          Your account is being reviewed by our team. You&apos;ll receive an email once approved.
        </p>
      </div>
    );
  }

  const quickLinks = [
    { label: "My Journal", href: "/dashboard/journal", icon: "M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" },
    { label: "Community Feed", href: "/community", icon: "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" },
    { label: "My Profile", href: "/dashboard/profile", icon: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" },
    { label: "Notifications", href: "/dashboard/notifications", icon: "M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" },
    { label: "Help Center", href: "/help", icon: "M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Admin Panel Link */}
      {profile?.role === "admin" && (
        <Link
          href="/admin"
          className="mb-8 flex items-center gap-3 p-4 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors"
        >
          <svg className="w-5 h-5 text-brand-blue" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          </svg>
          <div>
            <span className="text-sm font-semibold">Admin Panel</span>
            <span className="text-xs text-zinc-400 ml-2">Manage posts, members, RSS, settings</span>
          </div>
          <svg className="w-4 h-4 ml-auto text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      )}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">
            Welcome back{profile?.display_name ? `, ${profile.display_name}` : ""}
          </h1>
          <p className="mt-1 text-zinc-500 text-sm capitalize">
            {profile?.role || "Member"}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          Log out
        </button>
      </div>

      {/* Profile Completeness */}
      {(!profile?.bio || !profile?.avatar_url) && (
        <div className="mb-8 p-5 bg-brand-blue-light rounded-2xl border border-brand-blue/20">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-brand-blue mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-brand-blue">Complete your profile</p>
              <p className="text-xs text-brand-blue/70 mt-1">
                Add a bio and profile photo to get the most out of the community.
              </p>
              <Link
                href="/dashboard/profile"
                className="inline-block mt-2 text-xs font-medium text-brand-blue hover:underline"
              >
                Edit profile &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickLinks.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-zinc-100 hover:shadow-md hover:border-zinc-200 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-blue-light text-brand-blue flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
              </svg>
            </div>
            <span className="text-sm font-medium text-zinc-900">{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

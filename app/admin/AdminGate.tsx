"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();

/**
 * Client-side admin gate for /admin/*. RLS is the real authority — non-admins
 * already can't write to admin-only tables — but the admin pages aren't
 * usable for non-admins, so we redirect them to /dashboard instead of
 * letting them see broken empty states. Wraps the admin layout's children
 * so every admin page is protected by default; new admin pages don't need
 * to remember to add their own check.
 */
export default function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ok" | "denied">("checking");

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login?next=/admin");
        return;
      }
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (!profile || profile.role !== "admin") {
        setStatus("denied");
        // Bounce after a beat so the message is briefly visible
        setTimeout(() => router.replace("/dashboard"), 1500);
        return;
      }
      setStatus("ok");
    };
    void check();
  }, [router]);

  if (status === "checking") {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-1/3 bg-zinc-100 rounded" />
          <div className="h-4 w-1/2 bg-zinc-100 rounded" />
        </div>
      </div>
    );
  }
  if (status === "denied") {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">Admin access required</h2>
        <p className="text-zinc-500 text-sm">Redirecting you to your dashboard…</p>
      </div>
    );
  }
  return <>{children}</>;
}

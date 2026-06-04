"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    const check = async () => {
      if (!supabase) { setChecking(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        window.location.href = "/dashboard";
      } else {
        setChecking(false);
      }
    };
    void check();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data: signInData, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }

      // Gate access at the door rather than letting pending/suspended/
      // removed members reach the dashboard. Read user_profiles.status
      // and, if it isn't 'active', sign them back out and show the
      // matching message. The signOut also tears down the session
      // cookie so a stale Header doesn't keep showing the Dashboard
      // button until the next refresh.
      const userId = signInData.user?.id;
      if (userId) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("status")
          .eq("id", userId)
          .single();
        const status = profile?.status as string | undefined;
        if (status && status !== "active") {
          await supabase.auth.signOut();
          if (status === "pending_approval") {
            setError(
              "Your account is still pending review. We'll email you the moment an admin approves it."
            );
          } else if (status === "suspended") {
            setError(
              "This account is suspended. Reach out to contact@autisable.com if you think this is a mistake."
            );
          } else if (status === "removed") {
            setError("This account has been removed.");
          } else {
            setError(`This account isn't active yet (status: ${status}).`);
          }
          setLoading(false);
          return;
        }
      }

      window.location.href = "/dashboard";
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
          <h1 className="text-2xl font-bold text-zinc-900 mb-6">Welcome Back</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="loginEmail" className="block text-sm font-medium text-zinc-700 mb-1">
                Email
              </label>
              <input
                id="loginEmail"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="loginPassword" className="block text-sm font-medium text-zinc-700 mb-1">
                Password
              </label>
              <input
                id="loginPassword"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              />
            </div>
            {error && <p className="text-sm text-brand-red">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-blue hover:bg-brand-blue-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-zinc-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-brand-blue font-medium hover:underline">
              Join Autisable
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

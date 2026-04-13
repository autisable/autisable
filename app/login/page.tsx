"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }

      // Use window.location for a full page reload so cookies are set properly
      window.location.href = "/dashboard";
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/Logo.png" alt="Autisable" width={180} height={48} className="mx-auto mb-6" />
        </div>

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

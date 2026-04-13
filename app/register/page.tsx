"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getSupabase } from "@/app/lib/supabase-browser";

const supabase = getSupabase();
export default function RegisterPage() {
  const [step, setStep] = useState<"dob" | "form" | "pending" | "under16">("dob");
  const [dob, setDob] = useState({ month: "", day: "", year: "" });
  const [form, setForm] = useState({ email: "", password: "", displayName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDobCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const birthDate = new Date(
      parseInt(dob.year),
      parseInt(dob.month) - 1,
      parseInt(dob.day)
    );
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ? age - 1
      : age;

    if (actualAge < 16) {
      setStep("under16");
    } else {
      setStep("form");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          display_name: form.displayName,
          date_of_birth: `${dob.year}-${dob.month.padStart(2, "0")}-${dob.day.padStart(2, "0")}`,
          status: "pending_approval",
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Use API route to create profile with service role (bypasses RLS)
      await fetch("/api/auth/create-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: data.user.id,
          email: form.email,
          displayName: form.displayName,
          dateOfBirth: `${dob.year}-${dob.month.padStart(2, "0")}-${dob.day.padStart(2, "0")}`,
        }),
      });
    }

    setStep("pending");
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/Logo.png" alt="Autisable" width={180} height={48} className="mx-auto mb-6" />
        </div>

        {step === "dob" && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">Join Autisable</h1>
            <p className="text-sm text-zinc-600 mb-6">
              To keep our community safe, we need to verify your age before creating an account.
            </p>
            <form onSubmit={handleDobCheck} className="space-y-4">
              <label className="block text-sm font-medium text-zinc-700 mb-2">Date of Birth</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <input
                    type="number"
                    placeholder="MM"
                    min={1}
                    max={12}
                    required
                    value={dob.month}
                    onChange={(e) => setDob({ ...dob, month: e.target.value })}
                    className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm text-center focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="DD"
                    min={1}
                    max={31}
                    required
                    value={dob.day}
                    onChange={(e) => setDob({ ...dob, day: e.target.value })}
                    className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm text-center focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="YYYY"
                    min={1900}
                    max={new Date().getFullYear()}
                    required
                    value={dob.year}
                    onChange={(e) => setDob({ ...dob, year: e.target.value })}
                    className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm text-center focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-brand-blue hover:bg-brand-blue-dark text-white font-semibold rounded-xl transition-colors"
              >
                Continue
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-zinc-500">
              Already have an account?{" "}
              <Link href="/login" className="text-brand-blue font-medium hover:underline">Log in</Link>
            </p>
          </div>
        )}

        {step === "under16" && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-orange-light text-brand-orange flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">We&apos;re Sorry</h2>
            <p className="text-zinc-600 leading-relaxed">
              Autisable is designed for people aged 16 and older. This isn&apos;t about
              excluding anyone — it&apos;s about keeping our community safe. We take the
              safety of young people very seriously.
            </p>
            <p className="mt-4 text-sm text-zinc-500">
              If you&apos;re a parent or guardian and have questions, please{" "}
              <Link href="/contact" className="text-brand-blue hover:underline">contact us</Link>.
            </p>
          </div>
        )}

        {step === "form" && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">Create Your Account</h1>
            <p className="text-sm text-zinc-600 mb-6">
              Your account will be reviewed by our team before activation. This helps keep our community safe.
            </p>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-zinc-700 mb-1">
                  Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  required
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="regEmail" className="block text-sm font-medium text-zinc-700 mb-1">
                  Email
                </label>
                <input
                  id="regEmail"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="regPassword" className="block text-sm font-medium text-zinc-700 mb-1">
                  Password
                </label>
                <input
                  id="regPassword"
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                />
                <p className="mt-1 text-xs text-zinc-500">At least 8 characters</p>
              </div>
              {error && <p className="text-sm text-brand-red">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-blue hover:bg-brand-blue-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>
          </div>
        )}

        {step === "pending" && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-green-light text-brand-green flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">Application Received</h2>
            <p className="text-zinc-600 leading-relaxed">
              Thanks for signing up! Your account is pending review by our team. We&apos;ll
              send you an email once you&apos;re approved. This usually takes less than 24 hours.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

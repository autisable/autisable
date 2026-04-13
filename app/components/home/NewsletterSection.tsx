"use client";

import { useState } from "react";

export default function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [honeypot, setHoneypot] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return;
    if (!email.trim()) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="py-20 bg-gradient-to-br from-brand-blue to-brand-blue-dark text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Never Miss a Story
        </h2>
        <p className="mt-4 text-lg text-blue-100 leading-relaxed">
          Get new blog posts, podcast episodes, and community updates delivered
          to your inbox. Choose the topics you care about.
        </p>
        {status === "success" ? (
          <div className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur rounded-xl">
            <svg className="w-5 h-5 text-brand-green" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">You&apos;re subscribed! Check your inbox.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              required
              className="flex-1 px-5 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-blue-200 text-sm focus:ring-2 focus:ring-white/50 focus:border-transparent backdrop-blur"
            />
            <input
              type="text"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="px-8 py-3.5 bg-white text-brand-blue font-semibold rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              {status === "loading" ? "..." : "Subscribe"}
            </button>
          </form>
        )}
        {status === "error" && (
          <p className="mt-3 text-sm text-red-200">Something went wrong. Please try again.</p>
        )}
        <p className="mt-4 text-sm text-blue-200">
          No spam, ever. Unsubscribe anytime.
        </p>
      </div>
    </section>
  );
}

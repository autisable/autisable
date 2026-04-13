"use client";

import { useState, useEffect } from "react";

export default function NewsletterPopup() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  useEffect(() => {
    // Only show once per session
    if (sessionStorage.getItem("newsletter_popup_shown")) {
      setDismissed(true);
      return;
    }

    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercent >= 60 && !dismissed) {
        setShow(true);
        sessionStorage.setItem("newsletter_popup_shown", "true");
        window.removeEventListener("scroll", handleScroll);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [dismissed]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) setStatus("success");
    } catch {
      // Silent fail — don't block reading
    }
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
  };

  if (!show || dismissed) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm animate-in slide-in-from-bottom-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 p-6 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-600 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {status === "success" ? (
          <div className="text-center py-2">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-brand-green-light text-brand-green flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-zinc-900">You&apos;re subscribed!</p>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold text-zinc-900 mb-1 pr-6">Never Miss a Story</h3>
            <p className="text-sm text-zinc-600 mb-4">
              Get the latest from Autisable delivered to your inbox.
            </p>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                required
                className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {status === "loading" ? "..." : "Subscribe"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

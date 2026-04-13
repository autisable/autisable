"use client";

import { useState } from "react";

export default function NewsletterSignupLight() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

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
      if (res.ok) { setStatus("success"); setEmail(""); }
    } catch { /* silent */ }
  };

  if (status === "success") {
    return <p className="text-sm text-white font-medium">Subscribed!</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        required
        className="w-full px-3 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-blue-200 text-sm focus:ring-2 focus:ring-white/50 focus:border-transparent"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full py-2.5 bg-white text-brand-blue font-medium rounded-lg text-sm hover:bg-blue-50 transition-colors disabled:opacity-50"
      >
        {status === "loading" ? "..." : "Subscribe"}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import type { Metadata } from "next";

export default function ContactPage() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", reason: "", message: "" });
  // Honeypot field — humans don't see it (CSS-hidden), bots fill it because the
  // name 'company' looks legitimate. Server treats any non-empty value as bot
  // traffic and silently succeeds without saving or emailing.
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, company }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-brand-green-light text-brand-green flex items-center justify-center">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-zinc-900 tracking-tight mb-3">Message Sent</h1>
        <p className="text-zinc-600">Thank you for reaching out. We&apos;ll get back to you soon.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-zinc-900 tracking-tight mb-3">Contact Us</h1>
      <p className="text-lg text-zinc-600 mb-10">
        Have a question, want to collaborate, or need to reach our team? We&apos;d love to hear from you.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-zinc-700 mb-1">First Name</label>
            <input
              id="firstName"
              type="text"
              required
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-zinc-700 mb-1">Last Name</label>
            <input
              id="lastName"
              type="text"
              required
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-zinc-700 mb-1">Reason</label>
          <select
            id="reason"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            required
            className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
          >
            <option value="">Select a reason</option>
            <option value="general">General Inquiry</option>
            <option value="partnership">Partnership / Sponsorship</option>
            <option value="press">Press / Media</option>
            <option value="podcast">Podcast Guest Request</option>
            <option value="support">Technical Support</option>
            <option value="accessibility">Accessibility Feedback</option>
            <option value="privacy">Privacy / Data Request</option>
            <option value="legal">Legal / Moderation Appeal</option>
            <option value="author_post_removal">Author: Request post removal</option>
            <option value="author_account_removal">Author: Leave Autisable / remove my account</option>
            <option value="other">Other</option>
          </select>
          {(form.reason === "author_post_removal" || form.reason === "author_account_removal") && (
            <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-zinc-700">
              {form.reason === "author_post_removal" ? (
                <>
                  <p className="font-medium text-zinc-900 mb-1">Heads up before you submit</p>
                  <p>In your message below, please include the <strong>title and URL</strong> of each post you&apos;d like removed, and a brief reason. We&apos;ll respond within 5 business days. If a post is currently the source of harm or harassment, mention that and we&apos;ll prioritize.</p>
                </>
              ) : (
                <>
                  <p className="font-medium text-zinc-900 mb-1">Heads up before you submit</p>
                  <p>Please use the email tied to your Autisable account so we can verify it&apos;s really you. In your message, let us know whether you&apos;d like your <strong>past posts kept</strong> (with author byline retained), <strong>made anonymous</strong>, or <strong>fully removed</strong>. We&apos;ll confirm before doing anything irreversible.</p>
                </>
              )}
            </div>
          )}
        </div>
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-zinc-700 mb-1">Message</label>
          <textarea
            id="message"
            required
            rows={5}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
          />
        </div>
        {/* Honeypot: hidden from humans (off-screen), visible+autofillable for bots.
            "display: none" can be skipped by some bots; offscreen positioning is
            more reliable since they fill anything that looks like a real field. */}
        <div style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }} aria-hidden="true">
          <label htmlFor="company">Company (leave blank)</label>
          <input
            id="company"
            name="company"
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
        {status === "error" && (
          <p className="text-sm text-brand-red">Something went wrong. Please try again.</p>
        )}
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full py-3 bg-brand-blue hover:bg-brand-blue-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
        >
          {status === "loading" ? "Sending..." : "Send Message"}
        </button>
        <p className="text-xs text-zinc-500">
          Information submitted through this form is used solely for responding to your inquiry. This form is separate from our member platform — your submission is not connected to any member account or community data. See our Privacy Policy for details.
        </p>
      </form>
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Center",
  description: "Get help with using Autisable — journals, community feed, profiles, and more.",
};

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-zinc-900 tracking-tight mb-3">Help Center</h1>
      <p className="text-lg text-zinc-600 mb-10">
        Answers to common questions about using Autisable.
      </p>

      <div className="space-y-8">
        {[
          { q: "How do I write a journal entry?", a: "Go to Dashboard → My Journal → New Entry. You can set visibility to Private (only you), Followers, or All Members." },
          { q: "How do I change my profile?", a: "Go to Dashboard → My Profile. You can update your display name, bio, avatar, and social links." },
          { q: "How does the community feed work?", a: "The community feed shows posts and journal entries that members have shared with Followers or All Members. You can react and reply to any post." },
          { q: "How do I submit a story for publication?", a: "Write a journal entry, then use the 'Submit to Editors' option. You'll see a disclosure screen before submitting. You can revoke your submission any time before publication." },
          { q: "Can I delete my account?", a: "Yes. Go to Dashboard → Account Settings → Delete Account. This permanently removes all your data including posts, journal entries, and profile information." },
          { q: "Why is there no direct messaging?", a: "This is an intentional safety decision. All conversations happen in the open feed where moderators can ensure everyone's safety. It's modeled after the Autcraft approach to community safety." },
          { q: "I'm having a technical issue", a: "Contact us at support@autisable.com or use the Contact page." },
        ].map((item) => (
          <div key={item.q} className="border-b border-zinc-100 pb-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-2">{item.q}</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-zinc-500 mb-4">Still need help?</p>
        <Link
          href="/contact"
          className="inline-flex px-6 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-xl transition-colors"
        >
          Contact Us
        </Link>
      </div>
    </div>
  );
}

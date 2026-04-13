import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Autisable collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-zinc-900 tracking-tight mb-8">Privacy Policy</h1>
      <div className="prose prose-zinc max-w-none">
        <p className="text-zinc-500 text-sm">Last updated: April 2026</p>

        <h2>What We Collect</h2>
        <p>We collect only what&apos;s necessary to operate the platform:</p>
        <ul>
          <li><strong>Account information:</strong> name, email, date of birth (for age verification)</li>
          <li><strong>Profile information:</strong> display name, bio, avatar, location, pronouns (all optional)</li>
          <li><strong>Content you create:</strong> journal entries, comments, community posts</li>
        </ul>

        <h2>What We Don&apos;t Do</h2>
        <ul>
          <li>No third-party ad tracking on authenticated (member) pages</li>
          <li>No behavioral session recording tools anywhere on the site</li>
          <li>No selling or sharing of member data with advertisers</li>
          <li>No third-party AI services process member content</li>
        </ul>

        <h2>Analytics</h2>
        <p>
          We use Google Analytics 4 and Facebook Pixel on <strong>public pages only</strong>.
          These tools never load on authenticated member pages. We use Vercel Analytics
          (privacy-safe, aggregate only) across the site.
        </p>

        <h2>Private Journals</h2>
        <p>
          Private journal entries are encrypted at rest in our database. Only you can read
          your private entries.
        </p>

        <h2>Your Right to Deletion</h2>
        <p>
          You can delete your account at any time from your Account Settings. This permanently
          removes all your data — profile, journal entries, comments, activity, and any personal
          information. This action is irreversible.
        </p>

        <h2>Cookies</h2>
        <p>
          We use essential cookies for authentication and session management. Analytics cookies
          (GA4, Facebook Pixel) are only present on public pages.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about your privacy? Contact us at{" "}
          <a href="mailto:privacy@autisable.com" className="text-brand-blue">privacy@autisable.com</a>.
        </p>
      </div>
    </div>
  );
}

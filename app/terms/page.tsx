import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms of use for the Autisable platform.",
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-zinc-900 tracking-tight mb-8">Terms of Use</h1>
      <div className="prose prose-zinc max-w-none">
        <p className="text-zinc-500 text-sm">Last updated: April 2026</p>

        <h2>Acceptance of Terms</h2>
        <p>
          By using Autisable.com, you agree to these terms. If you do not agree, please
          do not use the platform.
        </p>

        <h2>Age Requirement</h2>
        <p>
          You must be at least 16 years old to create an account. We verify age during
          registration and reserve the right to remove accounts that do not meet this requirement.
        </p>

        <h2>Community Guidelines</h2>
        <p>Members agree to:</p>
        <ul>
          <li>Treat all community members with respect and dignity</li>
          <li>Not share private information about other members</li>
          <li>Not engage in harassment, bullying, or hate speech</li>
          <li>Report concerns through the community reporting system</li>
          <li>Follow moderator guidance when provided</li>
        </ul>

        <h2>Content Submissions</h2>
        <p>
          When you submit journal entries for editorial consideration, you grant Autisable
          the right to edit, publish, and display your content on the platform. You may
          revoke this permission before publication. Published content cannot be unpublished
          by the member but can be requested for removal.
        </p>

        <h2>Moderation</h2>
        <p>
          We use human-first moderation. Content is not automatically removed. All moderation
          actions are logged and begin with respectful communication. Escalation follows a
          clear path: notice, warning, suspension, removal.
        </p>

        <h2>Intellectual Property</h2>
        <p>
          You retain ownership of content you create. By posting on Autisable, you grant us
          a non-exclusive license to display and distribute your content within the platform.
        </p>

        <h2>Termination</h2>
        <p>
          We reserve the right to suspend or terminate accounts that violate these terms.
          You may delete your account at any time, which permanently removes all your data.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms? Contact us at{" "}
          <a href="mailto:legal@autisable.com" className="text-brand-blue">legal@autisable.com</a>.
        </p>
      </div>
    </div>
  );
}

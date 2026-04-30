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
        <p>We collect only what is necessary to operate the platform:</p>
        <ul>
          <li><strong>Account information:</strong> name, email address, date of birth (for age verification)</li>
          <li><strong>Profile information:</strong> display name, bio, avatar, location, pronouns (all optional)</li>
          <li><strong>Content you create:</strong> posts, comments, journal entries, community activity</li>
        </ul>

        <h2>What We Don&apos;t Do</h2>
        <ul>
          <li>No third-party ad tracking on authenticated (member) pages</li>
          <li>No third-party session recording tools (Hotjar, FullStory, etc.) anywhere on the site</li>
          <li>First-party UX analytics (anonymous click positions, scroll depth, funnel data) are collected on public pages only — never on member dashboards, journals, or community features. This data is not linked to your account, is stored in our own database, and is used solely to improve site usability.</li>
          <li>No selling or sharing of member data with advertisers</li>
          <li>No third-party AI services process member content</li>
        </ul>

        <h2>Analytics and Advertising</h2>
        <p>
          We use Google Analytics 4, Facebook Pixel, and Vercel Analytics on public-facing pages only.
          None of these tools load on authenticated member pages. Vercel Analytics is privacy-safe and
          aggregate only. You will be presented with a cookie consent notice on your first visit that
          allows you to manage your analytics preferences.
        </p>

        <h2>Advertising</h2>
        <p>
          Google AdSense ads are served on public-facing pages only. Logged-in community members do not
          see ads while using community features. We may also feature sponsored content and affiliate links,
          which are always clearly labeled. See our sponsored content and affiliate disclosure below.
        </p>

        <h2>Private Journals</h2>
        <p>
          Private journal entries are encrypted at rest in our database. Only you can read your private
          entries. Autisable staff cannot access private journal content.
        </p>

        <h2>How We Use Your Information</h2>
        <ul>
          <li>To create and manage your account</li>
          <li>To provide community features (publishing, commenting, activity feeds)</li>
          <li>To send service communications such as account and security notifications</li>
          <li>To send community updates and newsletters — only if you have opted in</li>
          <li>To improve the platform through aggregate, anonymized analytics</li>
          <li>To comply with applicable law</li>
          <li>To protect the safety of our community members</li>
        </ul>

        <h2>Data Sharing</h2>
        <p>We do not sell your personal information. We may share your information only in these circumstances:</p>
        <ul>
          <li>With service providers who operate on our behalf — including Vercel (hosting), Supabase (database), and email delivery providers. These providers are contractually bound to protect your data and may not use it for their own purposes.</li>
          <li>With legal authorities when required by law, court order, or to protect the safety of our community</li>
          <li>With business partners only with your explicit prior consent</li>
        </ul>

        <h2>Children&apos;s Privacy</h2>
        <p>
          Autisable&apos;s primary audience is adults — parents, caregivers, and autistic adults. We do not
          knowingly collect personal information from children under 13 without verifiable parental consent,
          in compliance with the Children&apos;s Online Privacy Protection Act (COPPA).
        </p>
        <p>
          If you believe a child under 13 has created an account without parental consent, please{" "}
          <a href="/contact" className="text-brand-blue">contact us</a> and we will promptly remove that
          account and its associated data.
        </p>

        <h2>Data Retention</h2>
        <p>
          We retain your personal information for as long as your account is active or as needed to provide
          services. When you delete your account, all associated data — profile, content, comments, activity,
          and personal information — is permanently and irreversibly removed. Account deletion is processed
          within 30 days of your request.
        </p>

        <h2>Cookies</h2>
        <p>We use cookies in the following categories:</p>
        <ul>
          <li><strong>Strictly necessary:</strong> Required for login sessions and platform security. These cannot be disabled.</li>
          <li><strong>Analytics:</strong> Google Analytics 4 and Facebook Pixel on public pages only. These load only after consent.</li>
          <li><strong>Preferences:</strong> Used to remember your settings and accessibility preferences.</li>
        </ul>
        <p>You can manage your cookie preferences at any time via the cookie settings link in our footer.</p>

        <h2>Your Rights</h2>
        <p>You have the following rights regarding your personal information:</p>
        <ul>
          <li><strong>Access:</strong> Request a copy of the data we hold about you</li>
          <li><strong>Correction:</strong> Request correction of inaccurate information</li>
          <li><strong>Deletion:</strong> Delete your account and all associated data at any time via Account Settings</li>
          <li><strong>Portability:</strong> Request your data in a portable format</li>
          <li><strong>Opt-out:</strong> Unsubscribe from marketing communications at any time</li>
        </ul>
        <p>
          To exercise any of these rights, <a href="/contact" className="text-brand-blue">contact us</a> or
          manage your preferences directly in Account Settings.
        </p>

        <h2>Affiliate Disclosure</h2>
        <p>
          Autisable participates in affiliate programs, including Amazon Associates and others. When you click
          an affiliate link and make a purchase, we may earn a small commission at no additional cost to you.
          Affiliate links are identified on the pages where they appear. This does not influence our editorial
          content or recommendations.
        </p>

        <h2>Security</h2>
        <p>
          We use industry-standard security measures including encrypted data transmission (HTTPS/TLS), secure
          authentication, and encrypted database storage via Supabase. No method of internet transmission is
          completely secure, and we cannot guarantee absolute security. If you believe your account has been
          compromised, please <a href="/contact" className="text-brand-blue">contact us</a> immediately.
        </p>

        <h2>Governing Law</h2>
        <p>
          This Privacy Policy is governed by the laws of the State of Ohio, without regard to conflict of law principles.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. When we make material changes, we will notify
          members via email and post an updated effective date at the top of this page. Continued use of the
          platform after changes are posted constitutes your acceptance of the revised policy.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about your privacy?{" "}
          <a href="/contact" className="text-brand-blue">Contact us</a>.
        </p>
      </div>
    </div>
  );
}

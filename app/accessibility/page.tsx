import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accessibility Statement",
  description: "Autisable's commitment to making our platform accessible to everyone.",
};

export default function AccessibilityPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-zinc-900 tracking-tight mb-8">Accessibility Statement</h1>
      <div className="prose prose-zinc max-w-none">
        <p className="text-zinc-500 text-sm">Last updated: April 2026</p>

        <h2>Our Commitment</h2>
        <p>
          Autisable is committed to making autisable.com accessible to everyone, including people with
          disabilities. Accessibility is a core community value — not just a legal obligation — for a platform
          that serves autistic individuals, people with co-occurring disabilities, and users who rely on
          assistive technologies.
        </p>
        <p>
          We are working to meet the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA, published by
          the World Wide Web Consortium (W3C).
        </p>

        <h2>What We Have Built</h2>
        <p>The new autisable.com platform has been designed with the following accessibility features:</p>
        <ul>
          <li>Semantic HTML structure for screen reader compatibility</li>
          <li>Full keyboard navigation support throughout the interface</li>
          <li>ARIA labels on interactive elements</li>
          <li>Color contrast ratios meeting WCAG 2.1 AA minimums (4.5:1 for normal text, 3:1 for large text)</li>
          <li>Text alternatives (alt text) for all non-decorative images</li>
          <li>Captions and transcripts for audio and video content where available</li>
          <li>Consistent, predictable navigation structure across all pages</li>
          <li>Visible focus indicators for keyboard users</li>
          <li>No auto-playing audio or video</li>
          <li>No time-limited interactions without user control</li>
        </ul>

        <h2>Accessibility for Autistic Users</h2>
        <p>Given our community, we pay particular attention to accessibility features that matter to autistic users:</p>
        <ul>
          <li><strong>Reduced motion support</strong> — we respect the &ldquo;prefers-reduced-motion&rdquo; browser setting</li>
          <li><strong>Clear, consistent visual hierarchy</strong> and page layout</li>
          <li><strong>Plain-language writing standards</strong> for all platform interface text</li>
          <li><strong>No sensory-overwhelming design patterns</strong> — no excessive animation, no flashing elements, no auto-playing competing audio</li>
          <li><strong>High contrast and readable typography</strong> throughout</li>
        </ul>

        <h2>Known Limitations</h2>
        <p>We believe in being honest about where we fall short. The following areas are under active improvement:</p>
        <ul>
          <li>Legacy content migrated from the previous platform may not meet current accessibility standards. We are addressing this in phases.</li>
          <li>Embedded third-party content — including social media embeds and podcast players — may not fully conform to WCAG 2.1 AA. We work with providers to improve this where possible, but cannot guarantee third-party compliance.</li>
          <li>Video content published prior to the platform relaunch may lack captions. Captioning of legacy video is a post-launch priority.</li>
        </ul>

        <h2>Formal Audit</h2>
        <p>
          A formal WCAG 2.1 AA audit by a qualified accessibility reviewer is planned for the months following
          launch. Results and our remediation plan will be published on this page when complete.
        </p>

        <h2>Feedback</h2>
        <p>
          Accessibility is an ongoing practice, not a checkbox. If you encounter a barrier on our site, or have
          a suggestion for improvement, we want to hear from you.
        </p>
        <ul>
          <li>Email: <a href="mailto:accessibility@autisable.com" className="text-brand-blue">accessibility@autisable.com</a></li>
          <li>Subject line: Accessibility Feedback</li>
        </ul>
        <p>We aim to respond to accessibility feedback within five business days.</p>

        <h2>Technical Specifications</h2>
        <p>
          Autisable.com is built on Next.js and hosted on Vercel. We test for compatibility with the following
          assistive technologies:
        </p>
        <ul>
          <li>Screen readers: NVDA and VoiceOver</li>
          <li>Keyboard-only navigation</li>
          <li>Browser zoom up to 200%</li>
        </ul>
      </div>
    </div>
  );
}

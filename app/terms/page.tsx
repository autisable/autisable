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
          By accessing or using Autisable.com (the &ldquo;Platform&rdquo;), you agree to be bound by these
          Terms of Use. If you do not agree, please do not use the Platform. These Terms constitute a legal
          agreement between you and Autisable, LLC.
        </p>
        <p>
          We may update these Terms from time to time. We will notify members of material changes by email
          and by posting an updated date at the top of this page. Continued use of the Platform after changes
          are posted constitutes your acceptance of the revised Terms.
        </p>

        <h2>Age Requirement</h2>
        <p>
          You must be at least 16 years old to create an account. We collect date of birth during registration
          and reserve the right to remove accounts that do not meet this requirement. If you are between 16 and
          17, you represent that you have parental or guardian permission to use the Platform.
        </p>
        <p>
          We do not knowingly allow children under 16 to create accounts. See our Privacy Policy for our
          children&apos;s privacy practices.
        </p>

        <h2>Account Registration</h2>
        <p>To access community features, you must create an account. You agree to:</p>
        <ul>
          <li>Provide accurate, current, and complete registration information</li>
          <li>Maintain the security of your password and account credentials</li>
          <li>Notify us immediately of any unauthorized account access via our <a href="/contact" className="text-brand-blue">contact form</a></li>
          <li>Take responsibility for all activity that occurs under your account</li>
        </ul>

        <h2>Community Guidelines</h2>
        <p>
          All members agree to follow our <a href="/community-guidelines" className="text-brand-blue">Community Guidelines</a>.
          The Community Guidelines are incorporated into these Terms by reference. Violation of the Community
          Guidelines may result in content removal, account suspension, or permanent termination.
        </p>

        <h2>Content You Submit</h2>
        <h3>Your Ownership</h3>
        <p>
          You retain ownership of all content you submit to the Platform. Autisable does not claim ownership
          of your posts, journal entries, or comments.
        </p>
        <h3>License You Grant Us</h3>
        <p>
          By submitting content, you grant Autisable, LLC a non-exclusive, royalty-free, worldwide license to
          display, distribute, and promote your content on the Platform and in Platform-associated channels
          (newsletter, social media, podcast) for the purpose of operating and promoting the community.
        </p>
        <h3>Editorial Submissions</h3>
        <p>
          When you submit content for editorial consideration (blog posts, featured stories), you grant us the
          right to edit for clarity, length, and style. You may revoke this permission before publication. Once
          content is published, it cannot be unpublished by the member, but removal may be requested by{" "}
          <a href="/contact" className="text-brand-blue">contacting us</a>.
        </p>

        <h2>Medical Disclaimer</h2>
        <p>
          Autisable is a community and editorial platform. Content published on the Platform — including articles,
          blog posts, community submissions, podcast episodes, and any other materials — is for informational and
          community purposes only.
        </p>
        <p>
          Nothing on this Platform constitutes medical advice, diagnosis, or treatment. Always consult a qualified
          healthcare professional before making any health-related decisions for yourself or your child. Never
          disregard professional medical advice or delay seeking it because of something you read or heard on this Platform.
        </p>
        <p>This disclaimer applies to all content on the Platform, including content published in connection with sponsored partnerships.</p>

        <h2>Prohibited Conduct</h2>
        <p>You agree not to use the Platform to:</p>
        <ul>
          <li>Harass, threaten, bully, or harm any community member</li>
          <li>Post content that sexualizes, exploits, or endangers minors in any way</li>
          <li>Impersonate any person, organization, or public figure</li>
          <li>Post content that is knowingly false, misleading, or designed to deceive</li>
          <li>Promote dangerous, unproven, or harmful interventions — including but not limited to MMS (bleach) protocols, aversive therapies, or chemical interventions not approved by a licensed physician</li>
          <li>Attempt to gain unauthorized access to any part of the Platform or its systems</li>
          <li>Use automated tools, bots, or scrapers to access or collect Platform content without prior written permission</li>
          <li>Post spam, unsolicited commercial messages, or multi-level marketing solicitations</li>
          <li>Violate the intellectual property rights of others</li>
          <li>Violate the privacy rights of others, including sharing personal information about others without their consent</li>
        </ul>

        <h2>Moderation</h2>
        <p>
          We use human-first moderation. Content is not automatically removed. All moderation actions are logged,
          and escalation follows a clear path: notice, warning, suspension, removal. We prioritize accuracy over
          speed and will err toward protecting community members.
        </p>
        <p>
          Community members may flag content for review. All flagged content is reviewed by a human moderator
          before action is taken. If you believe a moderation decision was made in error, you may{" "}
          <a href="/contact" className="text-brand-blue">contact us</a> to appeal.
        </p>

        <h2>Sponsored Content and Advertising</h2>
        <p>
          Autisable may feature sponsored content, affiliate links, and third-party advertisements. All sponsored
          content is clearly labeled as such in accordance with FTC disclosure requirements. Advertising is served
          on public-facing pages only; logged-in members are not served ads while using community features.
        </p>
        <p>
          Sponsored partnerships do not influence our editorial standards or Community Guidelines. See our full
          affiliate and sponsorship disclosure in our Privacy Policy.
        </p>

        <h2>Intellectual Property</h2>
        <p>
          All content created by Autisable, LLC — including articles, podcast episodes, graphics, platform design,
          and branding — is owned by Autisable, LLC and protected by applicable copyright and trademark law. You
          may not reproduce, distribute, or create derivative works from Autisable content without prior written permission.
        </p>

        <h2>Disclaimers</h2>
        <p>
          The Platform is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any
          kind, express or implied. Autisable, LLC does not warrant that the Platform will be uninterrupted,
          error-free, or free from harmful components. Your use of the Platform is at your own risk.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by applicable law, Autisable, LLC shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages arising from your use of or inability to use the
          Platform, even if advised of the possibility of such damages.
        </p>

        <h2>Termination</h2>
        <p>
          We reserve the right to suspend or terminate accounts that violate these Terms, at our sole discretion,
          with or without notice. You may delete your account at any time via Account Settings, which permanently
          removes all your data. Termination does not affect Autisable&apos;s rights to use previously submitted
          content under the license granted above.
        </p>

        <h2>Governing Law</h2>
        <p>
          These Terms are governed by the laws of the State of Ohio, without regard to conflict of law principles.
          Any disputes arising from these Terms shall be resolved in the courts of Ohio.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these Terms?{" "}
          <a href="/contact" className="text-brand-blue">Contact us</a>.
        </p>
      </div>
    </div>
  );
}

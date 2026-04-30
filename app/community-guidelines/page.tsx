import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Guidelines",
  description: "How we keep Autisable a safe, respectful space for the autism community.",
};

export default function CommunityGuidelinesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-zinc-900 tracking-tight mb-8">Community Guidelines</h1>
      <div className="prose prose-zinc max-w-none">
        <p className="text-zinc-500 text-sm">Last updated: April 2026</p>

        <h2>Why These Guidelines Exist</h2>
        <p>
          Autisable has been a community for autistic individuals, their families, and their allies since 2009.
          These guidelines exist for one reason: to keep this a space where people feel safe enough to actually show up.
        </p>
        <p>
          We are not a social media platform optimizing for engagement. We are a community platform optimizing for
          trust. That means we hold ourselves — and each other — to a different standard.
        </p>

        <h2>Who This Community Is For</h2>
        <p>Autisable is for:</p>
        <ul>
          <li>Autistic individuals of all ages and support needs</li>
          <li>Parents, caregivers, and family members of autistic people</li>
          <li>Educators and professionals who support autistic individuals</li>
          <li>Researchers and advocates with genuine community interest</li>
        </ul>
        <p>If you are here to exploit, extract, or amplify — this is not the right community for you.</p>

        <h2>Language and Framing</h2>
        <p>Language matters deeply in the autism community. We ask all members to:</p>
        <ul>
          <li>Respect both identity-first language (&ldquo;autistic person&rdquo;) and person-first language (&ldquo;person with autism&rdquo;) — when in doubt, follow the individual&apos;s preference</li>
          <li>Avoid language that frames autism primarily as tragedy, burden, or a disease requiring cure</li>
          <li>Remember that autistic adults are present in every conversation on this platform — this community is not just about autistic people, it is for autistic people</li>
          <li>Approach medical and research topics with humility — a single study is not a consensus, and an intervention that helps one person may harm another</li>
        </ul>

        <h2>What Is Not Allowed</h2>
        <h3>Harmful to Individuals</h3>
        <ul>
          <li>Harassment, threats, or targeted abuse of any community member</li>
          <li>Sharing private personal information about others without their consent</li>
          <li>Content that sexualizes, exploits, or endangers minors in any way</li>
          <li>Sustained bullying campaigns or coordinated pile-ons</li>
        </ul>
        <h3>Harmful to the Community</h3>
        <ul>
          <li>Promotion of dangerous or unproven treatments — including MMS/bleach protocols, chemical castration, aversive interventions, and similar practices with documented harm potential</li>
          <li>Content designed to spread medically false or dangerous health information</li>
          <li>Spam, multi-level marketing solicitations, or unsolicited commercial content</li>
          <li>Impersonation of other community members, public figures, or organizations</li>
        </ul>
        <h3>Illegal or Legally Problematic</h3>
        <ul>
          <li>Content that violates copyright or intellectual property law</li>
          <li>Content that violates the privacy rights of others</li>
          <li>Content that constitutes illegal discrimination</li>
        </ul>

        <h2>Our Political Independence</h2>
        <p>Autisable maintains a deliberately independent editorial stance. This is a platform value, not a passive default. It means:</p>
        <ul>
          <li>We do not endorse political candidates, parties, or partisan policy positions</li>
          <li>We cover autism-related policy — education law, healthcare access, disability rights — on the merits</li>
          <li>Community members are free to hold and express political views; the platform itself does not</li>
        </ul>
        <p>
          This independence is what allows us to serve a community that includes people across the full spectrum
          of political and cultural backgrounds.
        </p>

        <h2>Crisis Support</h2>
        <p>If you or someone in the community is experiencing a mental health crisis, please reach out for support:</p>
        <ul>
          <li><strong>988 Suicide and Crisis Lifeline:</strong> Call or text 988 (US)</li>
          <li><strong>Crisis Text Line:</strong> Text HOME to 741741</li>
          <li><strong>International Association for Suicide Prevention:</strong>{" "}
            <a href="https://www.iasp.info/resources/Crisis_Centres/" target="_blank" rel="noopener noreferrer" className="text-brand-blue">
              iasp.info/resources/Crisis_Centres
            </a>
          </li>
        </ul>
        <p>
          If you see a post that concerns you, please use the report function so our moderation team can respond.
          We do not automatically remove crisis-related content — a human moderator reviews every flagged post
          before any action is taken.
        </p>

        <h2>How Moderation Works</h2>
        <p>
          Autisable uses human-first moderation. No content is automatically removed by an algorithm. Every
          moderation action begins with respectful communication and follows a clear escalation path:
        </p>
        <ul>
          <li><strong>Notice</strong> — We contact you to flag the concern</li>
          <li><strong>Warning</strong> — Formal notice that continued violations may result in suspension</li>
          <li><strong>Suspension</strong> — Temporary restriction of posting privileges</li>
          <li><strong>Removal</strong> — Permanent account termination for serious or repeated violations</li>
        </ul>
        <p>
          All moderation actions are logged. We make mistakes like anyone else — if you believe a decision was
          made in error, you can <a href="/contact" className="text-brand-blue">contact us</a> to appeal.
        </p>

        <h2>No Direct Messaging</h2>
        <p>
          Autisable does not offer direct messaging between members. This is an intentional design decision —
          not a missing feature. It reduces the risk of grooming, harassment, and exploitation within our
          community. We know this differs from other platforms. We think it&apos;s the right call.
        </p>

        <h2>Reporting</h2>
        <p>
          To report a Community Guidelines violation, use the report function on any piece of content. You can
          also <a href="/contact" className="text-brand-blue">contact us directly</a>. All reports are reviewed
          by a human moderator.
        </p>

        <h2>Changes to These Guidelines</h2>
        <p>
          We may update these guidelines as the community grows and as we learn. Material changes will be
          announced in the community and reflected in the updated date at the top of this page.
        </p>
      </div>
    </div>
  );
}

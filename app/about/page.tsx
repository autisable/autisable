import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Autisable",
  description: "Learn about Autisable — a community and editorial platform for parents, autistic individuals, and professionals.",
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-zinc-900 tracking-tight mb-8">About Autisable</h1>

      <div className="flex justify-center mb-10">
        <Image src="/Logo.png" alt="Autisable" width={300} height={80} className="w-auto" />
      </div>

      <div className="prose prose-zinc prose-lg max-w-none">
        <p>
          Autisable is a community and editorial platform built for parents, autistic
          individuals, and professionals. We exist to amplify the voices that matter most —
          the people living these experiences every day.
        </p>

        <h2>Our Mission</h2>
        <p>
          We believe the autism community deserves a space that&apos;s safe, respectful, and
          genuinely useful. Not a forum buried in spam. Not a social network that treats your
          data as a product. A real community built on understanding, not judgment.
        </p>

        <h2>What We Offer</h2>
        <ul>
          <li><strong>Stories & Articles</strong> — Curated and original content from 70+ contributors across the autism community</li>
          <li><strong>Three Podcasts</strong> — Autisable Dads, Hope Saves the Day, and The Autism Dad</li>
          <li><strong>Member Community</strong> — Personal journals, social feed, profiles, and real connections</li>
          <li><strong>Resources</strong> — Trusted tools, books, and services from our vetted partners</li>
        </ul>

        <h2>Our Approach to Safety</h2>
        <p>
          Our community model is inspired by Autcraft — one of the safest online communities
          ever built for the autism world. We believe in:
        </p>
        <ul>
          <li>Moderation that prevents situations, not punishes people</li>
          <li>Gentle guidance before any action</li>
          <li>Open conversation — no private messaging between members</li>
          <li>Rules in plain language, enforced through reminders, not sanctions</li>
          <li>Human moderation only — no automated content removal</li>
        </ul>

        <h2>The Logo</h2>
        <p>
          Our triangle puzzle piece represents pieces coming together — community forming
          a whole. It&apos;s not about incompleteness. It&apos;s about connection.
        </p>
      </div>
    </div>
  );
}

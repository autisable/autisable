// agents/05-blog-seo.js
// ─────────────────────────────────────────────────────────────────────────────
// AGENT 5: Blog / SEO Content Agent
// Given a keyword and angle, drafts a full SEO blog post in Justin's voice.
// Includes: H2 structure, internal links, meta description, CTA.
// You review and add your 1 human touch paragraph before publishing.
// Cost: ~$0.12/run on Sonnet (longer output)
//
// Usage:
//   node agents/05-blog-seo.js
//   Output saved to ./output/blog-YYYY-MM-DD-slug.md
// ─────────────────────────────────────────────────────────────────────────────

import { callClaude, BRAND_VOICE, log } from "../lib/core.js";
import { writeFileSync, mkdirSync } from "fs";
import readline from "readline";
import "dotenv/config";

const AGENT_NAME = "Blog SEO Agent";

const SYSTEM = `
${BRAND_VOICE}

You are writing SEO blog posts for vizyplan.com in Justin's voice.

The site is built in Astro. Output clean Markdown with frontmatter.
Internal links should use these real vizyplan.com pages:
- /features — app features overview
- /advocate — Vizy Advocate (IEP meeting tool)
- /providers — provider portal for BCBAs, SLPs, OTs
- /pricing — subscription pricing
- /blog — blog index

SEO rules:
- Target keyword appears in: title, first 100 words, at least 2 H2s, meta description
- 800-1200 words total
- H2s every 200-250 words
- No keyword stuffing — write for humans first
- Include a personal anecdote or Sawyer reference naturally in the first 300 words
- End with a CTA that drives to the app download or free trial

Output FORMAT — return valid Markdown with frontmatter only, no extra commentary:

---
title: "Your SEO Title Here"
description: "Meta description — 150-160 chars, includes keyword"
pubDate: YYYY-MM-DD
author: Justin Bowman
tags: [autism, visual schedules, routine, parenting]
---

[Article body here]

---
*[JUSTIN'S HUMAN TOUCH — placeholder for your personal paragraph. Replace this with 2-3 sentences from your own experience before publishing.]*
---

[Final CTA here]
`;

export async function generateBlogPost({ keyword, angle, audience, internalLinks = [] }) {
  log(AGENT_NAME, `Drafting post for keyword: "${keyword}"`);

  const prompt = `
Write a full SEO blog post for vizyplan.com:

PRIMARY KEYWORD: ${keyword}
ANGLE / FOCUS: ${angle}
TARGET AUDIENCE: ${audience}
${internalLinks.length > 0 ? `INTERNAL LINKS TO INCLUDE: ${internalLinks.join(", ")}` : ""}

Requirements:
- 900-1100 words
- Justin's voice: direct, dad-first, not clinical
- Natural keyword usage — target keyword and 2-3 semantic variants
- Include a "[JUSTIN'S HUMAN TOUCH]" placeholder block near the beginning where he'll add his personal 2-3 sentence moment
- H2 structure that could answer featured snippet questions
- Meta description exactly 150-160 characters
- End CTA drives to free trial or app download

Return ONLY the Markdown content with frontmatter. No commentary before or after.
`;

  const content = await callClaude({
    system: SYSTEM,
    prompt,
    model: "claude-sonnet-4-6",
    maxTokens: 2000,
  });

  return content;
}

function savePost(content, keyword) {
  const slug = keyword
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-");
  const date = new Date().toISOString().split("T")[0];
  const filename = `blog-${date}-${slug}.md`;

  mkdirSync("./output", { recursive: true });
  writeFileSync(`./output/${filename}`, content, "utf8");
  return filename;
}

async function interactive() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((res) => rl.question(q, res));

  console.log("\n✍️  VizyPlan Blog SEO Agent");
  console.log("─".repeat(40));
  console.log("Top performing topic ideas:");
  console.log("  1. summer regression autism tips");
  console.log("  2. IEP meeting prep autism parents");
  console.log("  3. visual schedules for autistic kids at home");
  console.log("  4. autism parent burnout signs and help");
  console.log("  5. back to school autism routine tips\n");

  const keyword = await ask("Primary keyword: ");
  const angle = await ask("Angle (e.g. 'practical survival guide', 'what parents need to know'): ");
  const audience = await ask("Audience (e.g. 'autism parents with kids 4-12'): ");

  rl.close();

  const content = await generateBlogPost({ keyword, angle, audience });
  const filename = savePost(content, keyword);

  console.log("\n" + "═".repeat(60));
  console.log(`✅ Blog post saved to: ./output/${filename}`);
  console.log("═".repeat(60));
  console.log("\nNext steps:");
  console.log("  1. Open the file and find [JUSTIN'S HUMAN TOUCH]");
  console.log("  2. Replace it with 2-3 sentences from your own experience");
  console.log("  3. Review the CTA — make sure it links to current promo");
  console.log("  4. Add to your Astro blog at /src/content/blog/\n");

  console.log("\n" + "─".repeat(40));
  console.log("PREVIEW:");
  console.log("─".repeat(40));
  console.log(content.slice(0, 500) + "...\n");
}

interactive().catch(console.error);

// agents/01-content-draft.js
// ─────────────────────────────────────────────────────────────────────────────
// AGENT 1: Content Brief → Draft
// You give it a 3-line brief. It outputs 5 platform-native content variations.
// Cost: ~$0.01/run on Haiku with batch
//
// Usage:
//   node agents/01-content-draft.js
//   Or import and call generateContent({ topic, angle, audience }) programmatically
// ─────────────────────────────────────────────────────────────────────────────

import { callClaude, BRAND_VOICE, sendDigest, formatHtml, log } from "../lib/core.js";
import readline from "readline";

const AGENT_NAME = "Content Draft";

const SYSTEM = `
${BRAND_VOICE}

You are a content strategist who produces platform-native content variations from a brief.
Each variation must feel written FOR that platform — not copy-pasted across them.

Output format — return ONLY this JSON, no markdown fences:
{
  "facebook_post": "Full post text. 150-250 words. Emotional hook, relatable moment, soft CTA. Facebook parents groups respond to vulnerability and real talk.",
  "tiktok_hook": "First 3 seconds only. 1-2 punchy lines that stop the scroll. Start with the tension, not the solution.",
  "instagram_caption": "80-120 words + 5 relevant hashtags. Warmer tone than Facebook. Visual language — describe a scene.",
  "email_subject_lines": ["Option A", "Option B", "Option C"],
  "blog_title_options": ["Title 1 (SEO angle)", "Title 2 (emotional angle)", "Title 3 (how-to angle)"],
  "justin_human_touch": "One raw, specific, personal sentence Justin should add somewhere in the content. From Sawyer's story or a real family moment. This is the line that makes it authentic."
}
`;

export async function generateContent({ topic, angle, audience, extraContext = "" }) {
  log(AGENT_NAME, `Generating content for: "${topic}"`);

  const prompt = `
Content brief:
- TOPIC: ${topic}
- ANGLE: ${angle}
- AUDIENCE: ${audience}
${extraContext ? `- EXTRA CONTEXT: ${extraContext}` : ""}

Generate 5 platform-native content variations following the exact JSON format in your instructions.
Make the Facebook post and Instagram caption feel distinctly different.
The TikTok hook should be so specific it almost feels too niche — that's what works.
`;

  const raw = await callClaude({ system: SYSTEM, prompt, maxTokens: 1500 });

  try {
    const result = JSON.parse(raw);
    return result;
  } catch {
    // Fallback: return raw if JSON parse fails
    return { raw };
  }
}

function printOutput(result, topic) {
  console.log("\n" + "═".repeat(60));
  console.log(`🎯 CONTENT DRAFTS — "${topic}"`);
  console.log("═".repeat(60));

  if (result.raw) {
    console.log(result.raw);
    return;
  }

  console.log("\n📘 FACEBOOK POST");
  console.log("─".repeat(40));
  console.log(result.facebook_post);

  console.log("\n🎵 TIKTOK HOOK (first 3 seconds)");
  console.log("─".repeat(40));
  console.log(result.tiktok_hook);

  console.log("\n📷 INSTAGRAM CAPTION");
  console.log("─".repeat(40));
  console.log(result.instagram_caption);

  console.log("\n📧 EMAIL SUBJECT LINES");
  console.log("─".repeat(40));
  result.email_subject_lines?.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));

  console.log("\n📝 BLOG TITLE OPTIONS");
  console.log("─".repeat(40));
  result.blog_title_options?.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));

  console.log("\n✍️  JUSTIN'S HUMAN TOUCH (add this somewhere)");
  console.log("─".repeat(40));
  console.log(`  "${result.justin_human_touch}"`);

  console.log("\n" + "═".repeat(60) + "\n");
}

// ─── Interactive CLI ──────────────────────────────────────────────────────────

async function interactive() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((res) => rl.question(q, res));

  console.log("\n🤖 VizyPlan Content Draft Agent");
  console.log("─".repeat(40));

  const topic = await ask("Topic (e.g. 'summer regression'): ");
  const angle = await ask("Angle (e.g. 'what it is and how to survive it'): ");
  const audience = await ask("Audience (e.g. 'autism parents, newly diagnosed kids'): ");
  const extra = await ask("Extra context (press Enter to skip): ");

  rl.close();

  const result = await generateContent({ topic, angle, audience, extraContext: extra });
  printOutput(result, topic);
}

// Run interactively if called directly
interactive().catch(console.error);

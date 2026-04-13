// agents/06-content-repurpose.js
// ─────────────────────────────────────────────────────────────────────────────
// AGENT 6: Content Repurposing Agent
// Takes one piece of content (blog post, podcast transcript, thread)
// and outputs 5 platform-native formats. Not copy-paste — truly adapted.
// Cost: ~$0.03/run on Haiku
//
// Usage:
//   node agents/06-content-repurpose.js
//   Paste in your content when prompted, or pipe a file:
//   cat my-blog-post.md | node agents/06-content-repurpose.js
// ─────────────────────────────────────────────────────────────────────────────

import { callClaude, BRAND_VOICE, log } from "../lib/core.js";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import readline from "readline";
import "dotenv/config";

const AGENT_NAME = "Content Repurpose";

const SYSTEM = `
${BRAND_VOICE}

You are a content repurposing expert. You take one piece of source content
and genuinely adapt it for each platform — not copy-paste, truly native.

Each format has its own rules:

FACEBOOK (autism parent groups):
- 200-300 words. Lead with a relatable struggle or question.
- Paragraph breaks every 2-3 lines (mobile reading)
- End with a question to drive comments or a soft CTA
- Works best as a "real talk" post, not promotional

TIKTOK SCRIPT (60 seconds, ~150 words):
- [HOOK] — First 3 seconds. Tension or bold claim.
- [MAIN] — The actual value/story in 45 seconds
- [CTA] — Last 3 seconds. One action only.
- Format: label each section clearly

INSTAGRAM CAROUSEL (7 slides):
- Slide 1: Hook headline (5 words max)
- Slides 2-6: One insight per slide, 1-2 sentences each
- Slide 7: CTA + VizyPlan mention
- Format: "Slide 1: [text]" etc

EMAIL NEWSLETTER BLURB:
- 80-100 words. Conversational, not promotional.
- Reads like Justin is writing to a friend
- Subtle CTA at the end

FACEBOOK GROUP COMMENT (for dropping into relevant threads):
- 50-80 words. Sounds organic, not like marketing.
- Adds value first, mentions VizyPlan naturally at the end if relevant at all

Return JSON (no markdown fences):
{
  "facebook_post": "",
  "tiktok_script": "",
  "instagram_carousel": "",
  "email_blurb": "",
  "facebook_group_comment": "",
  "headline_variations": ["5 strong headline options for any platform"],
  "best_quote": "The single most quotable line from the source — good for a standalone graphic"
}
`;

export async function repurposeContent({ sourceContent, contentType = "blog post", targetAudience = "autism parents" }) {
  log(AGENT_NAME, `Repurposing ${contentType}...`);

  const prompt = `
Repurpose this ${contentType} into 5 platform-native formats.
Target audience: ${targetAudience}

SOURCE CONTENT:
${sourceContent}

Return the JSON object with all 5 formats as instructed.
Make each format genuinely different — not just the same content reformatted.
`;

  const raw = await callClaude({ system: SYSTEM, prompt, maxTokens: 2000 });

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}
  return { raw };
}

function saveOutput(result, label) {
  mkdirSync("./output", { recursive: true });
  const date = new Date().toISOString().split("T")[0];
  const slug = label.toLowerCase().replace(/\s+/g, "-").slice(0, 30);
  const filename = `repurposed-${date}-${slug}.json`;
  writeFileSync(`./output/${filename}`, JSON.stringify(result, null, 2), "utf8");
  return filename;
}

function printOutput(result) {
  if (result.raw) { console.log(result.raw); return; }

  const sections = [
    ["📘 FACEBOOK POST", result.facebook_post],
    ["🎵 TIKTOK SCRIPT", result.tiktok_script],
    ["📷 INSTAGRAM CAROUSEL", result.instagram_carousel],
    ["📧 EMAIL NEWSLETTER BLURB", result.email_blurb],
    ["💬 FACEBOOK GROUP COMMENT", result.facebook_group_comment],
  ];

  console.log("\n" + "═".repeat(60));
  console.log("🔄 REPURPOSED CONTENT");
  console.log("═".repeat(60));

  sections.forEach(([label, content]) => {
    console.log(`\n${label}`);
    console.log("─".repeat(40));
    console.log(content);
  });

  if (result.headline_variations?.length) {
    console.log("\n📌 HEADLINE VARIATIONS");
    console.log("─".repeat(40));
    result.headline_variations.forEach((h, i) => console.log(`  ${i + 1}. ${h}`));
  }

  if (result.best_quote) {
    console.log("\n✨ BEST QUOTE (for graphics)");
    console.log("─".repeat(40));
    console.log(`  "${result.best_quote}"`);
  }

  console.log("\n" + "═".repeat(60) + "\n");
}

async function interactive() {
  // Check if content is piped in
  if (!process.stdin.isTTY) {
    const piped = readFileSync("/dev/stdin", "utf8");
    const result = await repurposeContent({ sourceContent: piped });
    printOutput(result);
    const filename = saveOutput(result, "piped-content");
    console.log(`✅ Saved to ./output/${filename}`);
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((res) => rl.question(q, res));

  console.log("\n🔄 VizyPlan Content Repurpose Agent");
  console.log("─".repeat(40));
  console.log("Paste your content, then type END on a new line:\n");

  const lines = [];
  rl.on("line", (line) => {
    if (line.trim() === "END") {
      rl.close();
    } else {
      lines.push(line);
    }
  });

  await new Promise((res) => rl.on("close", res));
  const sourceContent = lines.join("\n");

  if (!sourceContent.trim()) {
    console.log("No content provided.");
    return;
  }

  const contentType = await new Promise((res) => {
    const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl2.question("\nContent type (blog post / podcast transcript / thread / other): ", (ans) => {
      rl2.close();
      res(ans || "blog post");
    });
  });

  const result = await repurposeContent({ sourceContent, contentType });
  printOutput(result);

  const filename = saveOutput(result, contentType);
  console.log(`✅ Saved to ./output/${filename}`);
}

interactive().catch(console.error);

// agents/08-outreach-drafter.js
// ─────────────────────────────────────────────────────────────────────────────
// AGENT 8: Personalized Outreach Drafter
// Drafts investor, partner, or press outreach emails.
// Uses your locked pitch framing. Leads with THEIR world, bridges to VizyPlan.
// You always review before sending — this just does the hard work of
// the first draft that feels personal, not templated.
// Cost: ~$0.02/run on Haiku
//
// Usage:
//   node agents/08-outreach-drafter.js
// ─────────────────────────────────────────────────────────────────────────────

import { callClaude, BRAND_VOICE, log } from "../lib/core.js";
import readline from "readline";
import "dotenv/config";

const AGENT_NAME = "Outreach Drafter";

const SYSTEM = `
${BRAND_VOICE}

You are drafting outreach emails for Justin Bowman, CEO of VizyPlan.

Email rules:
1. Lead with THEIR world — something specific about the recipient, their work, or their portfolio
2. Bridge naturally to VizyPlan — don't force it
3. The pitch framing is locked: "visual routine and planning tools that help neurodivergent families see and plan their day — everything that comes after diagnosis, from daily routines to therapy schedules to school transitions"
4. Justin's voice: direct, brief, dad-first. No corporate speak.
5. Subject line: specific to the recipient, not generic. Reference something real about them.
6. Body: 100-150 words max. Shorter is better.
7. CTA: one clear ask. Never "would love to connect" — be specific.
8. Never oversell. Confidence without desperation.

Email types:
- investor: pitch for pre-seed SAFE ($4M cap, 20% discount)
- partner: distribution or integration partnership
- press/media: story pitch about VizyPlan or Justin's journey
- provider: BCBA/SLP/OT outreach for provider portal adoption
- influencer: new influencer partnership proposal

Return JSON (no markdown fences):
{
  "subject": "Email subject line",
  "body": "Full email body — sign off as Justin Bowman, CEO & Co-Founder, VizyPlan",
  "alt_subject": "Alternative subject if first feels too bold",
  "follow_up": "A short 50-word follow-up to send 5 days later if no reply"
}
`;

const EMAIL_TYPES = ["investor", "partner", "press", "provider", "influencer"];

export async function draftOutreach({
  recipientName,
  recipientContext,
  emailType,
  mutualConnection = "",
  specificAsk = "",
}) {
  log(AGENT_NAME, `Drafting ${emailType} outreach to ${recipientName}...`);

  const prompt = `
Draft a personalized outreach email:

RECIPIENT: ${recipientName}
EMAIL TYPE: ${emailType}
CONTEXT ABOUT THEM: ${recipientContext}
${mutualConnection ? `MUTUAL CONNECTION / WARM INTRO: ${mutualConnection}` : ""}
${specificAsk ? `SPECIFIC ASK: ${specificAsk}` : ""}

Lead with something specific about ${recipientName} or their work before mentioning VizyPlan.
Keep the email under 150 words.
Return JSON as instructed.
`;

  const raw = await callClaude({ system: SYSTEM, prompt, maxTokens: 800 });

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}
  return { raw };
}

function printDraft(result, recipientName) {
  console.log("\n" + "═".repeat(60));
  console.log(`📧 OUTREACH DRAFT — To: ${recipientName}`);
  console.log("═".repeat(60));

  if (result.raw) { console.log(result.raw); return; }

  console.log(`\nSUBJECT: ${result.subject}`);
  if (result.alt_subject) console.log(`ALT:     ${result.alt_subject}`);
  console.log("\n" + "─".repeat(40));
  console.log(result.body);
  console.log("─".repeat(40));

  if (result.follow_up) {
    console.log("\n📩 5-DAY FOLLOW-UP:");
    console.log("─".repeat(40));
    console.log(result.follow_up);
  }

  console.log("\n" + "═".repeat(60));
  console.log("✅ Review before sending. This is a draft — make it yours.\n");
}

async function interactive() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((res) => rl.question(q, res));

  console.log("\n📧 VizyPlan Outreach Drafter");
  console.log("─".repeat(40));

  const recipientName = await ask("Recipient name: ");
  const recipientContext = await ask("Context about them (role, fund, why relevant): ");

  console.log(`\nEmail type: ${EMAIL_TYPES.map((t, i) => `${i + 1}. ${t}`).join(", ")}`);
  const typeInput = await ask("Choose type (1-5 or type it): ");
  const emailType = EMAIL_TYPES[parseInt(typeInput) - 1] || typeInput;

  const mutualConnection = await ask("Mutual connection or warm intro? (press Enter to skip): ");
  const specificAsk = await ask("Specific ask (press Enter for default): ");

  rl.close();

  const result = await draftOutreach({
    recipientName,
    recipientContext,
    emailType,
    mutualConnection,
    specificAsk,
  });

  printDraft(result, recipientName);
}

interactive().catch(console.error);

// agents/07-investor-research.js
// ─────────────────────────────────────────────────────────────────────────────
// AGENT 7: Investor Research Agent
// Given a name or fund, returns: portfolio fit, pitch angles, recent news,
// suggested subject line, and warm intro paths.
// Preps you for every investor call in 5 minutes instead of 30.
// Cost: ~$0.15/run on Sonnet (uses web search)
//
// Usage:
//   node agents/07-investor-research.js
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";
import { BRAND_VOICE, log, formatHtml, sendDigest } from "../lib/core.js";
import { writeFileSync, mkdirSync } from "fs";
import readline from "readline";
import "dotenv/config";

const AGENT_NAME = "Investor Research";
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `
${BRAND_VOICE}

You are a fundraising researcher preparing Justin Bowman for investor meetings.

VizyPlan context for pitch:
- Pre-seed SAFE: $4M valuation cap, 20% discount
- Product: visual routine and planning tools for neurodivergent families
- Everything after diagnosis — daily routines, therapy schedules, school transitions, IEP prep
- Live on App Store (ID: 6756069118), active users, influencer campaigns running
- Revenue: subscription ($9.99/month via RevenueCat)
- Team: Justin (CEO, Amazon/Chewy background), wife (SLP co-founder), Luke Morse (partner)
- Delaware C-corp, EIN: 39-2867695

Research the investor and return JSON (no markdown fences):
{
  "investor_name": "",
  "fund_name": "",
  "thesis_fit": "How well does VizyPlan fit their stated thesis? 1-2 sentences.",
  "portfolio_signals": "Relevant portfolio companies that signal they'd understand this space",
  "recent_news": "Any recent news, tweets, or statements from them relevant to your pitch",
  "warm_angles": [
    "Angle 1: specific to their portfolio or stated interests",
    "Angle 2: connect their background to the autism/neurodivergent space",
    "Angle 3: the traction/market angle most relevant to them"
  ],
  "suggested_subject_line": "Email subject line that references something specific about them",
  "conversation_starters": ["2-3 specific things to open with based on their background"],
  "potential_objections": ["Objection 1", "Objection 2"],
  "objection_responses": ["Response to objection 1", "Response to objection 2"],
  "intro_paths": "Any mutual connections or warm intro paths Justin might have",
  "one_line_verdict": "Is this a high/medium/low fit investor? Why in one sentence?"
}
`;

async function researchInvestor(investorName, extraContext = "") {
  log(AGENT_NAME, `Researching: ${investorName}...`);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: SYSTEM,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [
      {
        role: "user",
        content: `
Research this investor for VizyPlan's pre-seed fundraise:

INVESTOR: ${investorName}
${extraContext ? `EXTRA CONTEXT: ${extraContext}` : ""}

Search for:
1. Their investment thesis and portfolio
2. Any stated interest in health tech, edtech, family apps, or neurodiversity
3. Recent tweets, posts, or interviews about what they're looking for
4. Portfolio companies that are comparable to VizyPlan

Then return the JSON analysis as instructed.
        `,
      },
    ],
  });

  const textBlocks = response.content.filter((b) => b.type === "text");
  const raw = textBlocks.map((b) => b.text).join("\n");

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}
  return { raw, investor_name: investorName };
}

function printResult(result) {
  console.log("\n" + "═".repeat(60));
  console.log(`🎯 INVESTOR RESEARCH: ${result.investor_name || "Unknown"}`);
  if (result.fund_name) console.log(`   Fund: ${result.fund_name}`);
  console.log("═".repeat(60));

  if (result.raw) { console.log(result.raw); return; }

  console.log(`\n📊 Thesis Fit: ${result.thesis_fit}`);
  console.log(`\n🎯 One-line verdict: ${result.one_line_verdict}`);

  console.log("\n📧 Suggested Subject Line:");
  console.log(`   "${result.suggested_subject_line}"`);

  console.log("\n🔥 Warm Angles:");
  result.warm_angles?.forEach((a, i) => console.log(`  ${i + 1}. ${a}`));

  console.log("\n💬 Conversation Starters:");
  result.conversation_starters?.forEach((s) => console.log(`  → ${s}`));

  console.log("\n⚠️  Likely Objections & Responses:");
  result.potential_objections?.forEach((obj, i) => {
    console.log(`  Q: ${obj}`);
    console.log(`  A: ${result.objection_responses?.[i] || "Prepare response"}`);
  });

  if (result.intro_paths) {
    console.log("\n🤝 Intro Paths:");
    console.log(`  ${result.intro_paths}`);
  }

  console.log("\n" + "═".repeat(60) + "\n");
}

function saveResult(result) {
  mkdirSync("./output", { recursive: true });
  const name = (result.investor_name || "investor").toLowerCase().replace(/\s+/g, "-");
  const date = new Date().toISOString().split("T")[0];
  const filename = `investor-${date}-${name}.json`;
  writeFileSync(`./output/${filename}`, JSON.stringify(result, null, 2), "utf8");
  return filename;
}

async function interactive() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((res) => rl.question(q, res));

  console.log("\n🎯 VizyPlan Investor Research Agent");
  console.log("─".repeat(40));

  const investorName = await ask("Investor name or fund: ");
  const extra = await ask("Extra context (mutual connections, how you heard about them, press Enter to skip): ");

  rl.close();

  const result = await researchInvestor(investorName, extra);
  printResult(result);

  const filename = saveResult(result);
  console.log(`✅ Research saved to ./output/${filename}`);
}

interactive().catch(console.error);

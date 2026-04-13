// agents/09-partner-discovery.js
// ─────────────────────────────────────────────────────────────────────────────
// AGENT 9: Partner Discovery Agent
// Finds potential distribution partners, integrations, and referral channels.
// Categories: therapy platforms, BCBA networks, pediatric health apps,
// autism orgs, school districts, insurance networks.
// Cost: ~$0.20/run on Sonnet with web search
//
// Usage:
//   node agents/09-partner-discovery.js
//   Output saved to ./output/partners-YYYY-MM-DD.json
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";
import { BRAND_VOICE, log, formatHtml, sendDigest } from "../lib/core.js";
import { writeFileSync, mkdirSync } from "fs";
import readline from "readline";
import "dotenv/config";

const AGENT_NAME = "Partner Discovery";
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `
${BRAND_VOICE}

You are a business development researcher for VizyPlan.

VizyPlan partnership value props:
- For therapy platforms: white-label routine builder or integration for clients
- For BCBA/SLP/OT networks: provider portal with session tracking and goal management
- For parent networks: affiliate/referral with promo codes (like THEAUTISMDAD model)
- For schools/IEP teams: classroom and home routine coordination tool
- For pediatric health apps: complementary tool, not competitive

For each partner found, evaluate:
- Audience size and overlap with VizyPlan's target (autism/neurodivergent families)
- Partnership model that makes sense (referral, integration, white-label, co-marketing)
- Decision maker contact info if findable
- Fit score 1-10 (10 = perfect audience match + clear partnership path)

Return JSON (no markdown fences):
{
  "category": "the search category",
  "partners": [
    {
      "name": "",
      "description": "One line on what they do",
      "audience": "Who they serve and how large",
      "partnership_model": "Best fit model for VizyPlan",
      "fit_score": 8,
      "decision_maker": "Name/title if findable",
      "contact_info": "Website, LinkedIn, or email if public",
      "why_now": "Specific reason this is a good time to reach out",
      "intro_angle": "One-line opener for outreach"
    }
  ],
  "top_pick": "Name of the single best opportunity and why"
}
`;

const PARTNER_CATEGORIES = [
  { label: "Autism therapy platforms", query: "autism ABA therapy platforms apps BCBAs 2026" },
  { label: "BCBA and ABA networks", query: "BCBA network association applied behavior analysis professionals" },
  { label: "SLP and OT directories", query: "speech language pathology occupational therapy pediatric networks 2026" },
  { label: "Autism parent communities", query: "autism parent community organization nonprofit large following" },
  { label: "Pediatric health apps", query: "pediatric health app children special needs complementary tools" },
  { label: "IEP and school support", query: "IEP support tools school districts special education technology" },
  { label: "Insurance and payers", query: "autism insurance coverage digital health tools behavioral health" },
];

async function discoverPartners(category, query) {
  log(AGENT_NAME, `Searching: ${category}...`);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: SYSTEM,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [
      {
        role: "user",
        content: `
Find potential distribution partners for VizyPlan in this category: ${category}

Search query: ${query}

Find 5-8 specific organizations, platforms, or communities that:
1. Serve autism/neurodivergent families or their care providers
2. Have an established audience or network
3. Would benefit from recommending VizyPlan to their audience

Evaluate fit and return the JSON analysis as instructed.
        `,
      },
    ],
  });

  const textBlocks = response.content.filter((b) => b.type === "text");
  const raw = textBlocks.map((b) => b.text).join("\n");

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) return { ...JSON.parse(jsonMatch[0]), category };
  } catch {}
  return { category, raw };
}

function printResults(allResults) {
  console.log("\n" + "═".repeat(60));
  console.log("🤝 PARTNER DISCOVERY RESULTS");
  console.log("═".repeat(60));

  allResults.forEach((result) => {
    if (result.raw) { console.log(result.raw); return; }

    console.log(`\n📂 ${result.category.toUpperCase()}`);
    console.log(`   Top pick: ${result.top_pick || "See partners below"}`);

    (result.partners || []).slice(0, 3).forEach((p) => {
      console.log(`\n  [${p.fit_score}/10] ${p.name}`);
      console.log(`         ${p.description}`);
      console.log(`         Audience: ${p.audience}`);
      console.log(`         Model: ${p.partnership_model}`);
      console.log(`         Angle: "${p.intro_angle}"`);
    });
  });

  console.log("\n" + "═".repeat(60) + "\n");
}

function saveResults(results) {
  mkdirSync("./output", { recursive: true });
  const date = new Date().toISOString().split("T")[0];
  const filename = `partners-${date}.json`;
  writeFileSync(`./output/${filename}`, JSON.stringify(results, null, 2), "utf8");
  return filename;
}

export async function runPartnerDiscovery(categories = PARTNER_CATEGORIES.slice(0, 3)) {
  log(AGENT_NAME, `Searching ${categories.length} partner categories...`);

  const results = [];
  for (const cat of categories) {
    const result = await discoverPartners(cat.label, cat.query);
    results.push(result);
    // Small delay between searches
    await new Promise((r) => setTimeout(r, 1000));
  }

  printResults(results);

  const filename = saveResults(results);
  console.log(`✅ Results saved to ./output/${filename}`);

  // High-fit partners for email digest
  const topPartners = results
    .flatMap((r) => r.partners || [])
    .filter((p) => p.fit_score >= 8)
    .sort((a, b) => b.fit_score - a.fit_score);

  if (topPartners.length > 0) {
    const topHtml = topPartners
      .slice(0, 5)
      .map(
        (p) => `
      <div style="padding: 12px 0; border-bottom: 1px solid #eee;">
        <div style="font-size: 14px; font-weight: bold; color: #333;">${p.name} <span style="color: #FF6B35; font-size: 12px;">[${p.fit_score}/10]</span></div>
        <div style="font-size: 12px; color: #777; margin: 4px 0;">${p.description}</div>
        <div style="font-size: 12px; color: #555;">Model: ${p.partnership_model}</div>
        <div style="font-size: 12px; color: #FF6B35; margin-top: 4px;">→ "${p.intro_angle}"</div>
      </div>
    `
      )
      .join("");

    await sendDigest({
      subject: `🤝 ${topPartners.length} high-fit partners found — top: ${topPartners[0]?.name}`,
      html: formatHtml("Partner Discovery Results", [
        { label: `Top ${Math.min(5, topPartners.length)} Partners (Score 8+)`, content: topHtml },
      ]),
    });
  }

  return results;
}

async function interactive() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((res) => rl.question(q, res));

  console.log("\n🤝 VizyPlan Partner Discovery Agent");
  console.log("─".repeat(40));
  console.log("Categories:");
  PARTNER_CATEGORIES.forEach((c, i) => console.log(`  ${i + 1}. ${c.label}`));

  const input = await ask("\nChoose categories (e.g. '1,2,3' or 'all'): ");
  rl.close();

  let selected;
  if (input.trim().toLowerCase() === "all") {
    selected = PARTNER_CATEGORIES;
  } else {
    const indices = input.split(",").map((n) => parseInt(n.trim()) - 1);
    selected = indices.map((i) => PARTNER_CATEGORIES[i]).filter(Boolean);
  }

  if (selected.length === 0) selected = PARTNER_CATEGORIES.slice(0, 2);

  await runPartnerDiscovery(selected);
}

interactive().catch(console.error);

// agents/04-influencer-monitor.js
// ─────────────────────────────────────────────────────────────────────────────
// AGENT 4: Influencer Signal Monitor
// Analyzes recent content from Rob Gorski (The Autism Dad) and Anne Bragg
// (Autism Supermoms). Surfaces: VizyPlan mentions, engagement opportunities,
// content gaps you should fill, and promo code performance signals.
// Cost: ~$0.08/run on Sonnet
//
// Usage:
//   node agents/04-influencer-monitor.js
//   Schedule via cron: 0 8 * * 1 (weekly, Monday 8am)
//
// NOTE: This agent uses Claude's web search to fetch recent content
// since we can't scrape social directly. Provide public post URLs manually
// or use the manual input mode.
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";
import { BRAND_VOICE, sendDigest, formatHtml, log } from "../lib/core.js";
import "dotenv/config";

const AGENT_NAME = "Influencer Monitor";
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `
${BRAND_VOICE}

You are a marketing analyst monitoring influencer content for VizyPlan.

Key influencers:
- Rob Gorski / The Autism Dad: ~600K followers, promo code THEAUTISMDAD, podcast guest upcoming
- Anne Bragg / Autism Supermoms: ~126K followers, promo code SUPERMOMS

For each piece of content analyzed, identify:
1. Any mentions of VizyPlan (direct or indirect)
2. High-engagement topics VizyPlan should weigh in on
3. Content gaps — topics their audience is asking about that VizyPlan could own
4. Signals about promo code usage or app reception

Return JSON (no markdown fences):
{
  "vizyplan_mentions": [{ "platform": "", "context": "", "sentiment": "", "action": "" }],
  "engagement_opportunities": [{ "topic": "", "why_vizyplan": "", "suggested_angle": "" }],
  "content_gaps": [{ "gap": "", "audience_signal": "", "vizyplan_content_idea": "" }],
  "promo_signals": "Any signals about THEAUTISMDAD or SUPERMOMS code usage",
  "weekly_summary": "2-3 sentence overview of what's happening in this influencer ecosystem this week",
  "top_action": "The single most important thing Justin should do this week based on this analysis"
}
`;

async function analyzeWithWebSearch(influencer, searchQuery) {
  log(AGENT_NAME, `Searching for recent ${influencer} content...`);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: SYSTEM,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [
      {
        role: "user",
        content: `
Search for recent posts and content from ${influencer} in the last 7 days.
Look for: blog posts, Facebook posts, TikTok content, podcast episodes, Instagram posts.
Search query to use: ${searchQuery}

After searching, analyze the content and return the JSON analysis as instructed.
Focus on what their audience is engaging with most and any opportunities for VizyPlan.
        `,
      },
    ],
  });

  // Extract text from response (may include tool use blocks)
  const textBlocks = response.content.filter((b) => b.type === "text");
  const raw = textBlocks.map((b) => b.text).join("\n");

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}
  return { weekly_summary: raw, top_action: "Review manually" };
}

// Manual mode: paste in content URLs/text for analysis
async function analyzeManualContent(content) {
  log(AGENT_NAME, "Analyzing provided content...");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `
Analyze this influencer content for VizyPlan opportunities:

${content}

Return the JSON analysis as instructed.
        `,
      },
    ],
  });

  const raw = response.content[0].text;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}
  return { weekly_summary: raw };
}

function buildEmailHtml(robAnalysis, anneAnalysis) {
  const allGaps = [
    ...(robAnalysis?.content_gaps || []),
    ...(anneAnalysis?.content_gaps || []),
  ];
  const allOpps = [
    ...(robAnalysis?.engagement_opportunities || []),
    ...(anneAnalysis?.engagement_opportunities || []),
  ];

  const gapsHtml = allGaps
    .slice(0, 5)
    .map(
      (g) => `
    <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
      <div style="font-size: 13px; font-weight: bold; color: #333; margin-bottom: 4px;">${g.gap}</div>
      <div style="font-size: 12px; color: #777; margin-bottom: 4px;">Audience signal: ${g.audience_signal}</div>
      <div style="font-size: 12px; color: #FF6B35;">→ ${g.vizyplan_content_idea}</div>
    </div>
  `
    )
    .join("");

  const oppsHtml = allOpps
    .slice(0, 3)
    .map(
      (o) => `
    <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
      <div style="font-size: 13px; font-weight: bold; color: #333;">${o.topic}</div>
      <div style="font-size: 12px; color: #FF6B35; margin-top: 4px;">→ ${o.suggested_angle}</div>
    </div>
  `
    )
    .join("");

  return formatHtml(`Influencer Monitor — Week of ${new Date().toLocaleDateString()}`, [
    {
      label: "This Week's Summary",
      content: `
        <div style="margin-bottom: 12px;"><strong>Rob Gorski:</strong> ${robAnalysis?.weekly_summary || "No data"}</div>
        <div><strong>Anne Bragg:</strong> ${anneAnalysis?.weekly_summary || "No data"}</div>
      `,
    },
    {
      label: "🎯 Your #1 Action This Week",
      content: `
        <div style="background: #FF6B3510; border: 1px solid #FF6B3530; border-radius: 6px; padding: 14px 18px; font-size: 14px; color: #333;">
          ${robAnalysis?.top_action || anneAnalysis?.top_action || "Review content manually"}
        </div>
      `,
    },
    { label: "Content Gaps to Own", content: gapsHtml || "None identified" },
    { label: "Engagement Opportunities", content: oppsHtml || "None identified" },
    {
      label: "Promo Code Signals",
      content: `
        <div style="font-size: 13px; color: #555; line-height: 1.6;">
          <strong>THEAUTISMDAD:</strong> ${robAnalysis?.promo_signals || "No signals detected"}<br>
          <strong>SUPERMOMS:</strong> ${anneAnalysis?.promo_signals || "No signals detected"}
        </div>
      `,
    },
  ]);
}

export async function runInfluencerMonitor({ manualContent } = {}) {
  let robAnalysis, anneAnalysis;

  if (manualContent) {
    // If you paste content in, analyze it directly
    robAnalysis = await analyzeManualContent(manualContent);
    anneAnalysis = {};
  } else {
    // Web search mode
    [robAnalysis, anneAnalysis] = await Promise.all([
      analyzeWithWebSearch(
        "Rob Gorski / The Autism Dad",
        "site:theautismdad.com OR 'The Autism Dad' Rob Gorski autism blog 2026"
      ),
      analyzeWithWebSearch(
        "Anne Bragg / Autism Supermoms",
        "'Autism Supermoms' Anne Bragg Facebook autism parents 2026"
      ),
    ]);
  }

  console.log("\n📊 INFLUENCER MONITOR");
  console.log("─".repeat(40));
  console.log("Rob Gorski:", robAnalysis?.weekly_summary);
  console.log("Anne Bragg:", anneAnalysis?.weekly_summary);
  console.log("\n🎯 Top action:", robAnalysis?.top_action || anneAnalysis?.top_action);

  await sendDigest({
    subject: `📊 Influencer Monitor — ${new Date().toLocaleDateString()} — ${(robAnalysis?.content_gaps?.length || 0) + (anneAnalysis?.content_gaps?.length || 0)} content gaps found`,
    html: buildEmailHtml(robAnalysis, anneAnalysis),
  });

  return { robAnalysis, anneAnalysis };
}

runInfluencerMonitor().catch(console.error);

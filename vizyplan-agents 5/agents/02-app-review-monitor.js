// agents/02-app-review-monitor.js
// ─────────────────────────────────────────────────────────────────────────────
// AGENT 2: App Store Review Monitor
// Fetches latest VizyPlan reviews, classifies sentiment, drafts responses.
// Flags negative reviews for personal attention. Never auto-posts.
// Cost: ~$0.02/run on Haiku
//
// Usage:
//   node agents/02-app-review-monitor.js
//   Schedule via cron: 0 9 * * * (daily at 9am)
// ─────────────────────────────────────────────────────────────────────────────

import { callClaude, BRAND_VOICE, sendDigest, formatHtml, log } from "../lib/core.js";
import Parser from "rss-parser";
import "dotenv/config";

const AGENT_NAME = "Review Monitor";
const APP_ID = "6756069118";
const RSS_URL = `https://itunes.apple.com/us/rss/customerreviews/id=${APP_ID}/sortBy=mostRecent/json`;

const SYSTEM = `
${BRAND_VOICE}

You are analyzing App Store reviews for VizyPlan and drafting responses.

For each review, return JSON (no markdown fences):
{
  "sentiment": "positive" | "neutral" | "negative",
  "category": "feature_request" | "bug" | "praise" | "billing" | "parent_story" | "general",
  "urgency": "low" | "medium" | "high",
  "summary": "One sentence capturing the core of this review",
  "draft_response": "A warm, personal response from Justin. Under 100 words. Never corporate. If parent_story — flag as NEEDS_JUSTIN and don't write a draft.",
  "needs_justin": true | false,
  "action_item": "Specific next step if any (e.g. 'Check RevenueCat for billing issue', 'Log as feature request in backlog')"
}

CRITICAL: If the review contains a personal story about a child or family struggle, set needs_justin: true and draft_response to "NEEDS_JUSTIN — this parent deserves a personal reply from you, not a template."
`;

async function fetchReviews() {
  log(AGENT_NAME, "Fetching App Store reviews...");

  try {
    // Try JSON feed first
    const response = await fetch(RSS_URL);
    const data = await response.json();
    const entries = data?.feed?.entry || [];

    return entries.slice(0, 10).map((entry) => ({
      title: entry?.title?.label || "",
      body: entry?.content?.label || entry?.summary?.label || "",
      rating: entry?.["im:rating"]?.label || "?",
      author: entry?.author?.name?.label || "Anonymous",
      date: entry?.updated?.label || new Date().toISOString(),
    }));
  } catch {
    // Fallback: RSS parser
    const parser = new Parser();
    try {
      const rssUrl = `https://itunes.apple.com/us/rss/customerreviews/id=${APP_ID}/sortBy=mostRecent/xml`;
      const feed = await parser.parseURL(rssUrl);
      return (feed.items || []).slice(0, 10).map((item) => ({
        title: item.title || "",
        body: item.content || item.contentSnippet || "",
        rating: "?",
        author: item.creator || "Anonymous",
        date: item.pubDate || new Date().toISOString(),
      }));
    } catch {
      log(AGENT_NAME, "⚠️  Could not fetch reviews — App Store RSS may be rate limited");
      return [];
    }
  }
}

async function analyzeReview(review) {
  const prompt = `
Analyze this App Store review for VizyPlan:

RATING: ${review.rating}/5
AUTHOR: ${review.author}
TITLE: ${review.title}
REVIEW: ${review.body}

Return JSON analysis as instructed.
`;

  const raw = await callClaude({ system: SYSTEM, prompt });
  try {
    return { ...JSON.parse(raw), review };
  } catch {
    return { sentiment: "neutral", summary: review.body.slice(0, 100), review, raw };
  }
}

function buildEmailHtml(analyses) {
  const negative = analyses.filter((a) => a.sentiment === "negative");
  const needsJustin = analyses.filter((a) => a.needs_justin);
  const positive = analyses.filter((a) => a.sentiment === "positive");

  const reviewHtml = analyses
    .map(
      (a) => `
    <div style="margin-bottom: 20px; padding: 16px; background: ${
      a.needs_justin ? "#fff8f0" : a.sentiment === "negative" ? "#fff5f5" : "#f9f9f9"
    }; border-left: 3px solid ${
      a.needs_justin ? "#FF6B35" : a.sentiment === "negative" ? "#e74c3c" : "#2ecc71"
    }; border-radius: 4px;">
      <div style="font-size: 11px; color: #999; font-family: monospace; margin-bottom: 6px;">
        ⭐ ${a.review.rating}/5 · ${a.review.author} · ${a.category || "general"}
        ${a.needs_justin ? " · 🔥 NEEDS YOUR PERSONAL REPLY" : ""}
      </div>
      <div style="font-size: 13px; font-weight: bold; margin-bottom: 6px;">${a.review.title}</div>
      <div style="font-size: 13px; color: #555; margin-bottom: 10px;">${a.summary}</div>
      ${
        a.draft_response && !a.needs_justin
          ? `<div style="font-size: 12px; background: white; padding: 10px; border-radius: 4px; color: #333; font-style: italic;">"${a.draft_response}"</div>`
          : ""
      }
      ${a.action_item ? `<div style="font-size: 11px; color: #FF6B35; margin-top: 8px; font-family: monospace;">→ ${a.action_item}</div>` : ""}
    </div>
  `
    )
    .join("");

  return formatHtml(`App Store Reviews — ${new Date().toLocaleDateString()}`, [
    {
      label: "Summary",
      content: `
        <span style="color: #2ecc71;">✓ ${positive.length} positive</span> &nbsp;
        <span style="color: #e74c3c;">✗ ${negative.length} negative</span> &nbsp;
        ${needsJustin.length > 0 ? `<span style="color: #FF6B35;">🔥 ${needsJustin.length} need your personal reply</span>` : ""}
      `,
    },
    { label: `${analyses.length} Reviews`, content: reviewHtml },
  ]);
}

export async function runReviewMonitor() {
  const reviews = await fetchReviews();

  if (reviews.length === 0) {
    log(AGENT_NAME, "No new reviews found.");
    return;
  }

  log(AGENT_NAME, `Analyzing ${reviews.length} reviews...`);
  const analyses = await Promise.all(reviews.map(analyzeReview));

  const needsJustin = analyses.filter((a) => a.needs_justin);
  const negative = analyses.filter((a) => a.sentiment === "negative");

  console.log("\n📱 REVIEW SUMMARY");
  console.log("─".repeat(40));
  analyses.forEach((a) => {
    const flag = a.needs_justin ? "🔥" : a.sentiment === "negative" ? "⚠️" : "✓";
    console.log(`${flag} [${a.review.rating}★] ${a.review.author}: ${a.summary}`);
    if (a.draft_response && !a.needs_justin) {
      console.log(`   Draft: "${a.draft_response.slice(0, 80)}..."`);
    }
  });

  if (needsJustin.length > 0) {
    console.log(`\n🔥 ${needsJustin.length} review(s) need YOUR personal reply — not a template.`);
  }

  // Send email digest
  await sendDigest({
    subject: `VizyPlan Reviews: ${analyses.length} new · ${needsJustin.length > 0 ? `🔥 ${needsJustin.length} need your reply` : "all clear"}`,
    html: buildEmailHtml(analyses),
  });

  return analyses;
}

runReviewMonitor().catch(console.error);

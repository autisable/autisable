// agents/10-advocate-improver.js
// ─────────────────────────────────────────────────────────────────────────────
// AGENT 10: Vizy Advocate Improvement Loop
// Weekly agent that reviews Advocate sessions from Supabase.
// Flags sessions where users re-prompted 2+ times (signal of confusion or failure).
// Clusters by topic, surfaces top 3 system prompt improvements.
// Your Advocate system prompt gets smarter every sprint.
// Cost: ~$0.20/run on Sonnet
//
// Usage:
//   node agents/10-advocate-improver.js
//   Schedule: 0 9 * * 1 (weekly, Monday 9am)
//
// SUPABASE TABLE ASSUMED:
//   advocate_sessions (id, user_id, created_at, messages jsonb, reprompt_count int,
//                      satisfaction_score int, topic text, resolved boolean)
// ─────────────────────────────────────────────────────────────────────────────

import { callClaude, getSupabase, sendDigest, formatHtml, log } from "../lib/core.js";
import "dotenv/config";

const AGENT_NAME = "Advocate Improver";

const SYSTEM = `
You are an AI product analyst reviewing Vizy Advocate sessions.

Vizy Advocate is an IEP meeting support tool built into VizyPlan.
It helps autism parents: prepare for IEP meetings, understand their rights,
transcribe and analyze IEP meetings, and advocate for their child.

Your job: find patterns in sessions where the AI underperformed.
Signs of underperformance:
- User re-prompted 2+ times on the same question
- User expressed frustration ("that's not what I meant", "no", "you're wrong")
- Session ended without resolution
- Short session with no follow-up (user gave up)

Return JSON (no markdown fences):
{
  "session_count_reviewed": 0,
  "failure_clusters": [
    {
      "topic": "What users were asking about",
      "frequency": 3,
      "sample_failure": "Example of what went wrong",
      "root_cause": "Why the current system prompt fails here",
      "prompt_fix": "Exact text to add or change in the system prompt"
    }
  ],
  "top_3_improvements": [
    "Specific, actionable system prompt change #1",
    "Specific, actionable system prompt change #2",
    "Specific, actionable system prompt change #3"
  ],
  "wins": "What's working well — sessions with high satisfaction scores",
  "coverage_gaps": "Topics users asked about that Advocate doesn't handle well at all",
  "weekly_health_score": "1-10 overall Advocate health this week"
}
`;

async function fetchFailingSessions() {
  const supabase = getSupabase();

  // Get sessions from the last 7 days with re-prompts
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { data, error } = await supabase
    .from("advocate_sessions")
    .select("id, user_id, created_at, messages, reprompt_count, satisfaction_score, topic, resolved")
    .gte("created_at", oneWeekAgo.toISOString())
    .order("reprompt_count", { ascending: false });

  if (error) {
    log(AGENT_NAME, `⚠️  Supabase error: ${error.message}`);
    log(AGENT_NAME, "Using mock data for development...");
    return getMockSessions();
  }

  return data || [];
}

function getMockSessions() {
  // Mock data for development — replace with real Supabase data
  return [
    {
      id: "mock-1",
      reprompt_count: 3,
      topic: "IEP rights",
      resolved: false,
      messages: [
        { role: "user", content: "What are my rights if the school refuses an evaluation?" },
        { role: "assistant", content: "You have the right to..." },
        { role: "user", content: "No I mean what can I actually DO about it" },
        { role: "assistant", content: "You can file a complaint..." },
        { role: "user", content: "Like what specific steps" },
      ],
    },
    {
      id: "mock-2",
      reprompt_count: 4,
      topic: "transition planning",
      resolved: false,
      messages: [
        { role: "user", content: "How do I plan for transition after 18?" },
        { role: "assistant", content: "Transition planning under IDEA..." },
        { role: "user", content: "But what about housing?" },
        { role: "assistant", content: "Housing options include..." },
        { role: "user", content: "That's too vague can you be more specific" },
        { role: "assistant", content: "Specifically..." },
        { role: "user", content: "Forget it" },
      ],
    },
    {
      id: "mock-3",
      reprompt_count: 0,
      satisfaction_score: 9,
      topic: "IEP goal writing",
      resolved: true,
      messages: [
        { role: "user", content: "How do I write better IEP goals?" },
        { role: "assistant", content: "SMART IEP goals should..." },
        { role: "user", content: "Perfect thank you" },
      ],
    },
  ];
}

function summarizeSessions(sessions) {
  // Extract key info from sessions for Claude analysis
  const failing = sessions.filter((s) => s.reprompt_count >= 2 || s.resolved === false);
  const winning = sessions.filter((s) => s.satisfaction_score >= 8);

  const sessionSummaries = failing.slice(0, 20).map((s) => {
    const msgs = (s.messages || []).slice(0, 6);
    const userMsgs = msgs.filter((m) => m.role === "user").map((m) => m.content);
    return {
      topic: s.topic || "unknown",
      reprompt_count: s.reprompt_count,
      resolved: s.resolved,
      user_messages: userMsgs,
    };
  });

  return {
    total: sessions.length,
    failing_count: failing.length,
    winning_count: winning.length,
    failing_sessions: sessionSummaries,
    avg_reprompts: failing.length > 0
      ? (failing.reduce((sum, s) => sum + (s.reprompt_count || 0), 0) / failing.length).toFixed(1)
      : 0,
  };
}

export async function runAdvocateImprover() {
  log(AGENT_NAME, "Fetching last 7 days of Advocate sessions...");
  const sessions = await fetchFailingSessions();

  if (sessions.length === 0) {
    log(AGENT_NAME, "No sessions found.");
    return;
  }

  log(AGENT_NAME, `Analyzing ${sessions.length} sessions...`);
  const summary = summarizeSessions(sessions);

  const prompt = `
Analyze these Vizy Advocate session data from the last 7 days:

Total sessions: ${summary.total}
Failing sessions (2+ reprompts or unresolved): ${summary.failing_count}
High satisfaction sessions (score 8+): ${summary.winning_count}
Average reprompts in failing sessions: ${summary.avg_reprompts}

FAILING SESSION DETAILS:
${JSON.stringify(summary.failing_sessions, null, 2)}

Identify patterns, root causes, and generate specific system prompt improvements.
Return the JSON analysis as instructed.
`;

  const raw = await callClaude({
    system: SYSTEM,
    prompt,
    model: "claude-sonnet-4-6",
    maxTokens: 2000,
  });

  let analysis;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw };
  } catch {
    analysis = { raw };
  }

  // Print to console
  console.log("\n" + "═".repeat(60));
  console.log("🤖 VIZY ADVOCATE IMPROVEMENT REPORT");
  console.log("═".repeat(60));
  console.log(`Sessions reviewed: ${summary.total}`);
  console.log(`Health score: ${analysis.weekly_health_score || "N/A"}/10\n`);

  console.log("TOP 3 SYSTEM PROMPT IMPROVEMENTS:");
  (analysis.top_3_improvements || []).forEach((imp, i) => {
    console.log(`\n${i + 1}. ${imp}`);
  });

  if (analysis.failure_clusters?.length > 0) {
    console.log("\nFAILURE CLUSTERS:");
    analysis.failure_clusters.forEach((c) => {
      console.log(`\n  Topic: ${c.topic} (${c.frequency}x)`);
      console.log(`  Root cause: ${c.root_cause}`);
      console.log(`  Fix: ${c.prompt_fix}`);
    });
  }

  // Email digest
  const improvementsHtml = (analysis.top_3_improvements || [])
    .map(
      (imp, i) => `
    <div style="padding: 12px 0; border-bottom: 1px solid #eee;">
      <span style="color: #FF6B35; font-family: monospace; font-size: 12px;">${i + 1}.</span>
      <span style="font-size: 13px; color: #333; margin-left: 8px;">${imp}</span>
    </div>
  `
    )
    .join("");

  const clustersHtml = (analysis.failure_clusters || [])
    .map(
      (c) => `
    <div style="padding: 12px 0; border-bottom: 1px solid #eee;">
      <strong>${c.topic}</strong> (${c.frequency}x)<br>
      <span style="color: #777; font-size: 12px;">Root cause: ${c.root_cause}</span><br>
      <span style="color: #FF6B35; font-size: 12px;">Fix: ${c.prompt_fix}</span>
    </div>
  `
    )
    .join("");

  await sendDigest({
    subject: `🤖 Vizy Advocate Weekly: Health ${analysis.weekly_health_score || "?"}/10 · ${analysis.top_3_improvements?.length || 0} improvements ready`,
    html: formatHtml("Vizy Advocate Weekly Improvement Report", [
      {
        label: "Session Health",
        content: `
          <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div><strong>${summary.total}</strong> total sessions</div>
            <div><strong style="color: #e74c3c;">${summary.failing_count}</strong> failing</div>
            <div><strong style="color: #2ecc71;">${summary.winning_count}</strong> high satisfaction</div>
            <div><strong style="color: #FF6B35;">${analysis.weekly_health_score || "?"}/10</strong> health score</div>
          </div>
        `,
      },
      { label: "Top 3 System Prompt Improvements", content: improvementsHtml },
      { label: "Failure Clusters", content: clustersHtml || "None identified" },
      { label: "What's Working", content: `<p style="font-size: 13px; color: #555;">${analysis.wins || "N/A"}</p>` },
      { label: "Coverage Gaps", content: `<p style="font-size: 13px; color: #555;">${analysis.coverage_gaps || "N/A"}</p>` },
    ]),
  });

  return analysis;
}

runAdvocateImprover().catch(console.error);

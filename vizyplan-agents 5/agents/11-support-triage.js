// agents/11-support-triage.js
// ─────────────────────────────────────────────────────────────────────────────
// AGENT 11: Support Triage Agent
// Classifies inbound support emails/messages and drafts responses.
// Routes: bugs → Luke, billing → RevenueCat, features → backlog, 
//         parent stories → YOU (always, never auto-reply).
// Cost: ~$0.02/run on Haiku
//
// Usage:
//   node agents/11-support-triage.js
//   Or call triageMessage({ from, subject, body }) from a webhook handler
//
// INTEGRATION: Hook this up to your support email via Zapier/Make.com
// or a Resend inbound webhook. The output tells you what to do with each message.
// ─────────────────────────────────────────────────────────────────────────────

import { callClaude, BRAND_VOICE, sendSlack, log } from "../lib/core.js";
import "dotenv/config";

const AGENT_NAME = "Support Triage";

const SYSTEM = `
${BRAND_VOICE}

You are triaging inbound support messages for VizyPlan.

Categories:
- "bug": App crash, feature not working, login issues, sync problems
- "billing": Subscription questions, charges, refunds, RevenueCat issues
- "feature_request": "Would love if..." / "Can you add..." / suggestions
- "parent_story": Parent sharing their child's situation, emotional context, gratitude, personal journey
- "onboarding": Confusion about how to use the app, getting started
- "provider": BCBA/SLP/OT asking about the provider portal
- "general": Everything else

Routing rules:
- bug → assign to Luke Morse (luke@vizyplan.com)
- billing → provide RevenueCat self-serve link + draft response
- feature_request → log to backlog + acknowledge
- parent_story → FLAG FOR JUSTIN. Never draft a template response. These deserve Justin personally.
- onboarding → draft helpful response with specific app steps
- provider → draft response with provider portal info

Response tone: warm, personal, from Justin. Never "the VizyPlan team."
Sign off as "Justin" only. No last name needed for support replies.

Return JSON (no markdown fences):
{
  "category": "",
  "urgency": "low" | "medium" | "high",
  "route_to": "justin" | "luke" | "self-serve",
  "needs_justin": true | false,
  "summary": "One sentence summary of the issue",
  "draft_response": "Full reply — or 'PARENT STORY: Flag for Justin personal reply' if parent_story",
  "action_item": "Specific next step beyond the reply",
  "tags": ["tag1", "tag2"]
}
`;

export async function triageMessage({ from, subject, body }) {
  log(AGENT_NAME, `Triaging message from: ${from}`);

  const prompt = `
Triage this inbound support message:

FROM: ${from}
SUBJECT: ${subject || "(no subject)"}
BODY:
${body}

Classify, route, and draft a response following your instructions.
If this is a parent story — set needs_justin: true and do NOT write a template draft response.
`;

  const raw = await callClaude({ system: SYSTEM, prompt });

  try {
    const result = JSON.parse(raw);

    // Slack alert for urgent or parent stories
    if (result.needs_justin || result.urgency === "high") {
      await sendSlack(
        `🔥 *Support triage — needs you*\n*From:* ${from}\n*Category:* ${result.category}\n*Summary:* ${result.summary}`
      );
    }

    return result;
  } catch {
    return { raw, summary: "Parse error — review manually" };
  }
}

function printTriage(result, from) {
  console.log("\n" + "═".repeat(60));
  console.log(`📥 TRIAGE RESULT — From: ${from}`);
  console.log("═".repeat(60));

  const urgencyIcon = { high: "🔴", medium: "🟡", low: "🟢" };
  console.log(`\nCategory: ${result.category}`);
  console.log(`Urgency: ${urgencyIcon[result.urgency] || "⚪"} ${result.urgency}`);
  console.log(`Route to: ${result.route_to}`);
  console.log(`Summary: ${result.summary}`);

  if (result.needs_justin) {
    console.log("\n🔥 PARENT STORY — This needs YOUR personal reply. Do not template this.");
  } else if (result.draft_response) {
    console.log("\n📧 DRAFT RESPONSE:");
    console.log("─".repeat(40));
    console.log(result.draft_response);
  }

  if (result.action_item) {
    console.log(`\n→ Action: ${result.action_item}`);
  }

  console.log("\n" + "═".repeat(60) + "\n");
}

// Demo / manual test mode
async function demo() {
  const testMessages = [
    {
      from: "sarah.m@gmail.com",
      subject: "App keeps crashing on routine screen",
      body: "Hi, every time I try to open the routine screen the app closes. I have an iPhone 14 and updated the app yesterday. My son really relies on this and it's causing so much stress in the morning. Please help.",
    },
    {
      from: "dad123@yahoo.com",
      subject: "Thank you",
      body: "I just wanted to write and say that VizyPlan has changed our mornings completely. My daughter Emma was diagnosed with autism at 3 and we've been struggling with routines for 5 years. Last week she got through her entire morning routine without a meltdown for the first time ever. I cried. Thank you for building this.",
    },
    {
      from: "bcba.therapist@therapygroup.com",
      subject: "Provider portal question",
      body: "Hi, I'm a BCBA and I heard about VizyPlan from a parent client. Is there a way to create and share routines with multiple clients? I'd love to use this across my caseload.",
    },
  ];

  for (const msg of testMessages) {
    const result = await triageMessage(msg);
    printTriage(result, msg.from);
    await new Promise((r) => setTimeout(r, 500));
  }
}

// Check if being run directly
demo().catch(console.error);

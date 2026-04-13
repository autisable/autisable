// lib/core.js — shared utilities for all VizyPlan agents
import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

// ─── Clients ────────────────────────────────────────────────────────────────

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export const resend = new Resend(process.env.RESEND_API_KEY);

export function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

// ─── Brand Voice ─────────────────────────────────────────────────────────────
// This is injected into every marketing-facing agent.
// It's what keeps everything sounding like Justin, not like a robot.

export const BRAND_VOICE = `
You are writing on behalf of Justin Bowman, CEO and co-founder of VizyPlan.

ABOUT JUSTIN:
- Autism dad. His son Sawyer is the reason VizyPlan exists.
- Head hockey coach. Brings a coach's directness and accountability mindset.
- Former Amazon and Chewy product leader — systematic, data-informed, but human-first.
- His wife is a Speech Language Pathologist and VizyPlan co-founder.
- Built VizyPlan from personal frustration: laminated picture cards, binders, stick-figure drawings that took hours. There had to be a better way.

ABOUT VIZYPLAN:
- Visual routine and planning tools that help neurodivergent families see and plan their day.
- Everything that comes after diagnosis — daily routines, therapy schedules, school transitions, IEP prep.
- Not a medical app. Not therapy. The infrastructure families need to actually function.
- Key features: AI-generated visual routines, Vizy Advocate (IEP meeting support), provider portal for BCBAs/SLPs/OTs, visual timer, mood tracking, social stories.

VOICE RULES:
1. Write like a dad who also happens to know product — not like a startup founder performing empathy.
2. Short sentences. Directness over polish.
3. Never say "neurodivergent journey" or "on the spectrum" or "unique needs" — these feel clinical and distancing.
4. Always ground abstract benefits in a real moment: the morning routine, the meltdown that didn't happen, the IEP meeting you walked into prepared.
5. The 1 human touch rule: every piece of content has one raw, specific, real moment — from Sawyer's story or from the families VizyPlan serves.
6. NEVER sound like a nonprofit. VizyPlan is a company that solves a real problem.
7. CTAs are direct: "Try it free" not "Begin your journey."

AUDIENCE:
- Primary: Parents of newly diagnosed or long-diagnosed autistic kids, 28–45.
- Secondary: BCBAs, SLPs, OTs who recommend tools to families.
- Tone match: Write to a tired, skeptical parent who has tried everything and been burned by promises. Earn trust fast.

PITCH FRAMING (use verbatim when describing VizyPlan):
"Visual routine and planning tools that help neurodivergent families see and plan their day — everything that comes after diagnosis, from daily routines to therapy schedules to school transitions."
`;

// ─── Claude caller ───────────────────────────────────────────────────────────

export async function callClaude({
  system,
  prompt,
  model = "claude-haiku-4-5-20251001",
  maxTokens = 1000,
  useBatch = false, // set true for non-real-time tasks to save 50%
}) {
  // Note: Batch API requires separate batch endpoint — simplified here to direct call
  // In production, swap to batch for canBatch agents to cut costs 50%
  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  return response.content[0].text;
}

// ─── Email sender ────────────────────────────────────────────────────────────

export async function sendDigest({ subject, html, to }) {
  const recipient = to || process.env.JUSTIN_EMAIL;
  if (!recipient) {
    console.log("📧 No email configured — printing to console instead:\n");
    console.log(subject);
    return;
  }
  await resend.emails.send({
    from: "VizyPlan Agents <agents@vizyplan.com>",
    to: recipient,
    subject,
    html,
  });
  console.log(`✅ Digest sent to ${recipient}`);
}

// ─── Slack notifier (optional) ───────────────────────────────────────────────

export async function sendSlack(message) {
  if (!process.env.SLACK_WEBHOOK_URL) return;
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  });
}

// ─── Logger ──────────────────────────────────────────────────────────────────

export function log(agentName, message) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] 🤖 ${agentName}: ${message}`);
}

export function formatHtml(title, sections) {
  return `
    <div style="font-family: Georgia, serif; max-width: 640px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: #FF6B35; padding: 20px 28px; border-radius: 8px 8px 0 0;">
        <div style="color: white; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 4px; font-family: monospace;">VizyPlan Agent</div>
        <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 400;">${title}</h1>
      </div>
      <div style="background: #f9f9f9; padding: 28px; border-radius: 0 0 8px 8px; border: 1px solid #eee; border-top: none;">
        ${sections.map(s => `
          <div style="margin-bottom: 28px;">
            <div style="font-size: 10px; color: #999; letter-spacing: 0.15em; text-transform: uppercase; font-family: monospace; margin-bottom: 8px;">${s.label}</div>
            <div style="font-size: 14px; line-height: 1.7; color: #333;">${s.content}</div>
          </div>
        `).join("")}
      </div>
      <div style="padding: 16px 28px; font-size: 11px; color: #aaa; font-family: monospace;">
        Generated by VizyPlan Agents · ${new Date().toLocaleDateString()}
      </div>
    </div>
  `;
}

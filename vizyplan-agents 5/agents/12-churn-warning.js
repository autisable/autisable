// agents/12-churn-warning.js
// ─────────────────────────────────────────────────────────────────────────────
// AGENT 12: Churn Early Warning Agent
// Watches Supabase for at-risk users: 7 days no login, no routine created,
// subscription approaching renewal with low engagement.
// Generates personalized re-engagement emails — tied to their child's name
// and their specific usage pattern. Sends from justin@vizyplan.com.
// Cost: ~$0.01/user on Haiku
//
// Usage:
//   node agents/12-churn-warning.js
//   Schedule: 0 8 * * * (daily at 8am)
//
// SUPABASE TABLES ASSUMED:
//   profiles (id, email, child_name, child_age, diagnosis, onboarding_completed_at)
//   routines (id, user_id, created_at, title)
//   app_sessions (id, user_id, created_at)
//   subscriptions (user_id, status, current_period_end, plan)
// ─────────────────────────────────────────────────────────────────────────────

import { callClaude, getSupabase, log } from "../lib/core.js";
import { Resend } from "resend";
import "dotenv/config";

const AGENT_NAME = "Churn Warning";
const resend = new Resend(process.env.RESEND_API_KEY);

const SYSTEM = `
${BRAND_VOICE}

You are writing re-engagement emails from Justin Bowman to VizyPlan users
who haven't been active recently.

CRITICAL RULES:
1. These emails come from justin@vizyplan.com — they must feel like Justin wrote them personally
2. Reference the child's name if available — this is NOT a generic email
3. Be warm, not pushy. No "we miss you!" corporate language.
4. Acknowledge the real struggle — routines are hard, life gets busy
5. Give them one specific reason to come back right now
6. Short: 80-100 words max
7. No unsubscribe footer language in the draft — handled by Resend
8. Sign off as "Justin" — just first name

Triggers and angles:
- No login 7 days: "Check in" — how's the routine going? Here's a tip.
- Never created routine: "Quick start" — let's get their first routine done in 3 minutes
- Subscription renewal in 7 days, low engagement: "Is VizyPlan helping?" — honest question, offer to help
- Summer break starting: "Summer is different" — schedules change, here's how VizyPlan helps

Return JSON (no markdown fences):
{
  "subject": "Email subject — personal, specific, not generic",
  "body": "Full email body",
  "trigger_reason": "Why this email was sent — internal note"
}
`;

async function findAtRiskUsers() {
  const supabase = getSupabase();
  const now = new Date();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

  let atRisk = [];

  // 1. No login in 7 days
  try {
    const { data: inactiveUsers } = await supabase
      .from("app_sessions")
      .select("user_id, created_at")
      .lt("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    // Get user profiles for inactive users
    if (inactiveUsers?.length > 0) {
      const userIds = [...new Set(inactiveUsers.map((s) => s.user_id))].slice(0, 50);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, child_name, child_age, diagnosis, onboarding_completed_at")
        .in("id", userIds);

      (profiles || []).forEach((p) => {
        atRisk.push({ ...p, trigger: "inactive_7_days", last_session: inactiveUsers.find((s) => s.user_id === p.id)?.created_at });
      });
    }
  } catch (e) {
    log(AGENT_NAME, `Supabase query error (sessions): ${e.message}`);
  }

  // 2. Users who signed up but never created a routine
  try {
    const { data: noRoutineUsers } = await supabase
      .from("profiles")
      .select("id, email, child_name, child_age, onboarding_completed_at")
      .not("onboarding_completed_at", "is", null)
      .lt("onboarding_completed_at", sevenDaysAgo.toISOString());

    if (noRoutineUsers?.length > 0) {
      const userIds = noRoutineUsers.map((u) => u.id);
      const { data: routines } = await supabase
        .from("routines")
        .select("user_id")
        .in("user_id", userIds);

      const usersWithRoutines = new Set((routines || []).map((r) => r.user_id));

      noRoutineUsers
        .filter((u) => !usersWithRoutines.has(u.id))
        .slice(0, 20)
        .forEach((u) => {
          if (!atRisk.find((r) => r.id === u.id)) {
            atRisk.push({ ...u, trigger: "no_routine_created" });
          }
        });
    }
  } catch (e) {
    log(AGENT_NAME, `Supabase query error (routines): ${e.message}`);
  }

  // Fallback mock data for development
  if (atRisk.length === 0) {
    log(AGENT_NAME, "No Supabase data — using mock for development");
    atRisk = [
      {
        id: "mock-1",
        email: "parent@example.com",
        child_name: "Sawyer",
        child_age: 8,
        trigger: "inactive_7_days",
        last_session: sevenDaysAgo.toISOString(),
      },
      {
        id: "mock-2",
        email: "parent2@example.com",
        child_name: "Emma",
        child_age: 6,
        trigger: "no_routine_created",
        onboarding_completed_at: fourteenDaysAgo.toISOString(),
      },
    ];
  }

  return atRisk;
}

async function generateReengagementEmail(user) {
  const childContext = user.child_name
    ? `Child's name: ${user.child_name}${user.child_age ? `, age ${user.child_age}` : ""}`
    : "Child info not available";

  const prompt = `
Write a re-engagement email for this VizyPlan user:

USER CONTEXT:
${childContext}
Trigger: ${user.trigger}
${user.last_session ? `Last active: ${new Date(user.last_session).toLocaleDateString()}` : ""}
${user.onboarding_completed_at ? `Signed up: ${new Date(user.onboarding_completed_at).toLocaleDateString()}` : ""}

TRIGGER DETAILS:
${user.trigger === "inactive_7_days" ? "User was active but hasn't logged in for 7+ days" : ""}
${user.trigger === "no_routine_created" ? "User completed onboarding but never created their first routine" : ""}
${user.trigger === "renewal_at_risk" ? "Subscription renews soon, user has low engagement" : ""}

Write a personal, warm email that feels like Justin checking in — not a marketing blast.
${user.child_name ? `Reference ${user.child_name} by name early in the email.` : ""}
`;

  const raw = await callClaude({ system: SYSTEM, prompt, maxTokens: 400 });

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { subject: "Checking in", body: raw };
  } catch {
    return { subject: "Checking in from VizyPlan", body: raw };
  }
}

async function sendReengagementEmail(user, emailDraft, dryRun = true) {
  if (dryRun) {
    console.log(`\n[DRY RUN] Would send to: ${user.email}`);
    console.log(`Subject: ${emailDraft.subject}`);
    console.log(`Body preview: ${emailDraft.body.slice(0, 100)}...`);
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    console.log(`[NO RESEND KEY] Skipping send for ${user.email}`);
    return;
  }

  await resend.emails.send({
    from: "Justin Bowman <justin@vizyplan.com>",
    to: user.email,
    subject: emailDraft.subject,
    html: `
      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #1a1a1a; font-size: 15px; line-height: 1.7;">
        ${emailDraft.body.replace(/\n/g, "<br>")}
        <br><br>
        <div style="font-size: 12px; color: #aaa; margin-top: 20px; border-top: 1px solid #eee; padding-top: 12px;">
          VizyPlan · 9 Stephanie Dr., Holden, MA 01520
        </div>
      </div>
    `,
  });

  log(AGENT_NAME, `✅ Sent to ${user.email}`);
}

export async function runChurnWarning({ dryRun = true } = {}) {
  log(AGENT_NAME, `Running churn detection... (dry run: ${dryRun})`);

  const atRiskUsers = await findAtRiskUsers();
  log(AGENT_NAME, `Found ${atRiskUsers.length} at-risk users`);

  if (atRiskUsers.length === 0) {
    log(AGENT_NAME, "No at-risk users today. ");
    return;
  }

  console.log("\n" + "═".repeat(60));
  console.log(`⚠️  CHURN WARNING: ${atRiskUsers.length} at-risk users`);
  console.log("═".repeat(60));

  let sent = 0;
  for (const user of atRiskUsers.slice(0, 20)) {
    // Cap at 20/day
    const emailDraft = await generateReengagementEmail(user);
    await sendReengagementEmail(user, emailDraft, dryRun);
    sent++;
    await new Promise((r) => setTimeout(r, 200)); // Rate limit
  }

  console.log(`\n${dryRun ? "[DRY RUN]" : "✅"} Processed ${sent} users`);
  if (dryRun) {
    console.log("Run with { dryRun: false } to send real emails");
  }
}

// Default: dry run (safe). Change to false when ready to go live.
runChurnWarning({ dryRun: true }).catch(console.error);

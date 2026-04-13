// agents/03-trademark-tracker.js
// ─────────────────────────────────────────────────────────────────────────────
// AGENT 3: Trademark Deadline Tracker
// Tracks your VIZYPLAN SOU deadline (July 27, 2026) and sends countdown alerts.
// Alert schedule: 90/60/30/14/7/3/1 day warnings.
// Cost: ~$0.001/run — practically free
//
// Usage:
//   node agents/03-trademark-tracker.js
//   Schedule via cron: 0 8 * * * (daily at 8am — checks if alert needed)
// ─────────────────────────────────────────────────────────────────────────────

import { sendDigest, formatHtml, log } from "../lib/core.js";
import "dotenv/config";

const AGENT_NAME = "Trademark Tracker";

const DEADLINE = new Date(process.env.TRADEMARK_DEADLINE || "2026-07-27");
const SERIAL = process.env.TRADEMARK_SERIAL || "99243716";
const ALERT_DAYS = [90, 60, 30, 14, 7, 3, 1];

const SOU_CHECKLIST = [
  { item: "Specimen showing VizyPlan mark in commerce (app screenshot with name visible)", done: false },
  { item: "App Store listing URL as evidence of use", done: false },
  { item: "Declaration of Use signed by Justin Bowman", done: false },
  { item: "Filing fee paid ($100 per class via USPTO TEAS)", done: false },
  { item: "Dates of first use in commerce documented", done: false },
  { item: "Attorney review of specimen (if needed)", done: false },
  { item: "Filed via USPTO TEAS Plus before July 27, 2026", done: false },
];

function getDaysRemaining() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = DEADLINE - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function shouldAlert(daysRemaining) {
  return ALERT_DAYS.includes(daysRemaining) || daysRemaining <= 7;
}

function getUrgencyColor(days) {
  if (days <= 7) return "#e74c3c";
  if (days <= 30) return "#f39c12";
  return "#FF6B35";
}

function buildEmail(daysRemaining) {
  const color = getUrgencyColor(daysRemaining);
  const urgency = daysRemaining <= 7 ? "🚨 URGENT" : daysRemaining <= 30 ? "⚠️ ACTION NEEDED" : "📋 Reminder";

  const checklistHtml = SOU_CHECKLIST.map(
    (item) => `
    <div style="padding: 8px 0; border-bottom: 1px solid #eee; display: flex; gap: 10px; align-items: flex-start;">
      <div style="color: #ccc; font-size: 16px;">☐</div>
      <div style="font-size: 13px; color: #333;">${item.item}</div>
    </div>
  `
  ).join("");

  return formatHtml(`${urgency}: Trademark SOU Due in ${daysRemaining} Days`, [
    {
      label: "Filing Details",
      content: `
        <div style="background: ${color}15; border: 1px solid ${color}40; border-radius: 6px; padding: 14px 18px;">
          <div style="font-size: 13px; color: #333; line-height: 1.7;">
            <strong>Mark:</strong> VIZYPLAN<br>
            <strong>Serial No:</strong> ${SERIAL}<br>
            <strong>Deadline:</strong> July 27, 2026<br>
            <strong>Days remaining:</strong> <span style="color: ${color}; font-weight: bold;">${daysRemaining} days</span><br>
            <strong>File via:</strong> <a href="https://www.uspto.gov/trademarks/teas" style="color: ${color};">USPTO TEAS</a>
          </div>
        </div>
      `,
    },
    {
      label: "SOU Filing Checklist",
      content: checklistHtml,
    },
    {
      label: "Quick Links",
      content: `
        <div style="font-size: 13px; line-height: 2;">
          <a href="https://tsdr.uspto.gov/#caseNumber=${SERIAL}&caseType=SERIAL_NO&searchType=statusSearch" style="color: #FF6B35;">→ Check trademark status (USPTO TSDR)</a><br>
          <a href="https://www.uspto.gov/trademarks/teas/teas-plus" style="color: #FF6B35;">→ File SOU via TEAS Plus ($100)</a><br>
          <a href="https://www.uspto.gov/trademarks/maintain/keeping-your-registration-alive" style="color: #FF6B35;">→ USPTO maintenance guide</a>
        </div>
      `,
    },
  ]);
}

export async function runTrademarkTracker({ forceAlert = false } = {}) {
  const daysRemaining = getDaysRemaining();
  log(AGENT_NAME, `VIZYPLAN SOU deadline: ${daysRemaining} days remaining (July 27, 2026)`);

  if (!shouldAlert(daysRemaining) && !forceAlert) {
    log(AGENT_NAME, "No alert needed today. Run again tomorrow.");
    return { daysRemaining, alerted: false };
  }

  console.log(`\n⚖️  TRADEMARK TRACKER`);
  console.log("─".repeat(40));
  console.log(`Serial No: ${SERIAL}`);
  console.log(`Deadline: July 27, 2026`);
  console.log(`Days remaining: ${daysRemaining}`);
  console.log(`\nSOU Checklist:`);
  SOU_CHECKLIST.forEach((item) => console.log(`  ☐ ${item.item}`));

  await sendDigest({
    subject: `⚖️  Trademark SOU: ${daysRemaining} days left — ${daysRemaining <= 7 ? "FILE NOW" : "action needed"}`,
    html: buildEmail(daysRemaining),
  });

  return { daysRemaining, alerted: true };
}

runTrademarkTracker({ forceAlert: true }).catch(console.error);

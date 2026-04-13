// run-all.js — VizyPlan Agent Scheduler
// ─────────────────────────────────────────────────────────────────────────────
// Runs all agents on their appropriate schedules using node-cron.
// Start this once and leave it running (use PM2 in production).
//
// Usage:
//   node run-all.js           — start the scheduler
//   node run-all.js --now     — run all agents immediately (for testing)
//
// PM2 (recommended for production):
//   pm2 start run-all.js --name vizyplan-agents
//   pm2 save && pm2 startup
// ─────────────────────────────────────────────────────────────────────────────

import cron from "node-cron";
import "dotenv/config";

const args = process.argv.slice(2);
const RUN_NOW = args.includes("--now");

// ─── Schedule Map ──────────────────────────────────────────────────────────
// Each agent: { name, schedule (cron), module, runFn, description }

const SCHEDULED_AGENTS = [
  {
    name: "Trademark Tracker",
    schedule: "0 8 * * *", // daily 8am
    module: "./agents/03-trademark-tracker.js",
    fn: "runTrademarkTracker",
    description: "Daily VIZYPLAN SOU deadline countdown",
  },
  {
    name: "App Review Monitor",
    schedule: "0 9 * * *", // daily 9am
    module: "./agents/02-app-review-monitor.js",
    fn: "runReviewMonitor",
    description: "Daily App Store review digest",
  },
  {
    name: "Churn Warning",
    schedule: "0 8 * * *", // daily 8am
    module: "./agents/12-churn-warning.js",
    fn: "runChurnWarning",
    description: "Daily at-risk user detection",
  },
  {
    name: "Influencer Monitor",
    schedule: "0 9 * * 1", // weekly Monday 9am
    module: "./agents/04-influencer-monitor.js",
    fn: "runInfluencerMonitor",
    description: "Weekly influencer content digest",
  },
  {
    name: "Advocate Improver",
    schedule: "0 9 * * 1", // weekly Monday 9am
    module: "./agents/10-advocate-improver.js",
    fn: "runAdvocateImprover",
    description: "Weekly Vizy Advocate session review",
  },
];

// ─── Agents that are interactive (run manually) ───────────────────────────
const MANUAL_AGENTS = [
  { name: "Content Draft", module: "./agents/01-content-draft.js", description: "Run: npm run agent:content" },
  { name: "Blog SEO", module: "./agents/05-blog-seo.js", description: "Run: npm run agent:blog" },
  { name: "Content Repurpose", module: "./agents/06-content-repurpose.js", description: "Run: npm run agent:repurpose" },
  { name: "Investor Research", module: "./agents/07-investor-research.js", description: "Run: npm run agent:investor" },
  { name: "Outreach Drafter", module: "./agents/08-outreach-drafter.js", description: "Run: npm run agent:outreach" },
  { name: "Partner Discovery", module: "./agents/09-partner-discovery.js", description: "Run: npm run agent:partners" },
  { name: "Support Triage", module: "./agents/11-support-triage.js", description: "Run: npm run agent:triage" },
];

// ─── Runner ───────────────────────────────────────────────────────────────

async function runAgent(agent) {
  try {
    console.log(`\n[${new Date().toLocaleTimeString()}] 🚀 Running: ${agent.name}`);
    const module = await import(agent.module);
    if (module[agent.fn]) {
      await module[agent.fn]();
    }
  } catch (err) {
    console.error(`❌ ${agent.name} failed:`, err.message);
  }
}

async function runAll() {
  console.log("\n🤖 Running all scheduled agents...\n");
  for (const agent of SCHEDULED_AGENTS) {
    await runAgent(agent);
  }
  console.log("\n✅ All agents complete.\n");
}

// ─── Start ────────────────────────────────────────────────────────────────

if (RUN_NOW) {
  runAll().then(() => process.exit(0)).catch(console.error);
} else {
  console.log("\n🤖 VizyPlan Agent Scheduler started\n");
  console.log("Scheduled agents:");
  SCHEDULED_AGENTS.forEach((a) => {
    console.log(`  ✓ ${a.name} — ${a.description} (${a.schedule})`);
  });
  console.log("\nManual agents (run individually):");
  MANUAL_AGENTS.forEach((a) => {
    console.log(`  → ${a.name}: ${a.description}`);
  });
  console.log("\nScheduler running. Press Ctrl+C to stop.\n");

  // Register cron jobs
  SCHEDULED_AGENTS.forEach((agent) => {
    cron.schedule(agent.schedule, () => runAgent(agent), {
      timezone: "America/New_York",
    });
  });
}

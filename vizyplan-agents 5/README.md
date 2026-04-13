# VizyPlan Agents

Your personal AI ops layer. 12 agents that automate marketing, ops, fundraising, and product loops — while keeping everything sounding like you.

## Setup (5 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in your env vars
cp .env.example .env
# Edit .env with your Anthropic API key and other credentials

# 3. Test the first agent
npm run agent:content
```

## Agents

### Phase 1 — Foundation (run these first)

| Agent | Command | Schedule | Cost/mo |
|-------|---------|----------|---------|
| Content Draft | `npm run agent:content` | Manual | ~$0.20 |
| App Review Monitor | `npm run agent:reviews` | Daily 9am | ~$0.60 |
| Trademark Tracker | `npm run agent:trademark` | Daily 8am | ~$0.01 |

### Phase 2 — Scale

| Agent | Command | Schedule | Cost/mo |
|-------|---------|----------|---------|
| Influencer Monitor | `npm run agent:influencer` | Weekly Mon | ~$0.65 |
| Blog SEO Agent | `npm run agent:blog` | Manual | ~$0.96 |
| Content Repurpose | `npm run agent:repurpose` | Manual | ~$0.36 |

### Phase 3 — Fundraise

| Agent | Command | Schedule | Cost/mo |
|-------|---------|----------|---------|
| Investor Research | `npm run agent:investor` | Manual | ~$1.50 |
| Outreach Drafter | `npm run agent:outreach` | Manual | ~$0.30 |
| Partner Discovery | `npm run agent:partners` | Manual | ~$0.80 |

### Phase 4 — Product Loop

| Agent | Command | Schedule | Cost/mo |
|-------|---------|----------|---------|
| Advocate Improver | `npm run agent:advocate` | Weekly Mon | ~$0.80 |
| Support Triage | `npm run agent:triage` | Manual/webhook | ~$1.00 |
| Churn Warning | `npm run agent:churn` | Daily 8am | ~$2.00 |

**Total estimated cost: ~$9–15/month** (with batch API on eligible agents)

## Running the Scheduler

For automated agents (reviews, trademark, churn, influencer, advocate):

```bash
# Run all scheduled agents right now (testing)
node run-all.js --now

# Start the scheduler (runs on cron schedule)
node run-all.js

# Production: use PM2
npm install -g pm2
pm2 start run-all.js --name vizyplan-agents
pm2 save && pm2 startup
```

## The Brand Protection Rules

Baked into `lib/core.js` as `BRAND_VOICE`. Every marketing-facing agent uses this.

Key rules:
1. **1 human touch rule** — every AI content piece has a `[JUSTIN'S HUMAN TOUCH]` placeholder for your personal 2-3 sentences
2. **Parent stories → always you** — Agent 11 flags these and never auto-drafts
3. **Locked pitch framing** — "visual routine and planning tools that help neurodivergent families see and plan their day — everything that comes after diagnosis"
4. **You approve, agent drafts** — nothing public goes out without your review

## Output Files

Agents that save output write to `./output/`:
- Blog posts: `blog-YYYY-MM-DD-keyword.md`
- Investor research: `investor-YYYY-MM-DD-name.json`
- Partner discovery: `partners-YYYY-MM-DD.json`
- Repurposed content: `repurposed-YYYY-MM-DD-type.json`

## Churn Agent — Go Live Checklist

Agent 12 runs in **dry run mode by default**. Before turning on real sends:

- [ ] Confirm Resend API key is set in `.env`
- [ ] Verify `justin@vizyplan.com` is verified sender in Resend
- [ ] Test with 2-3 real users first
- [ ] Confirm Supabase tables exist: `profiles`, `routines`, `app_sessions`
- [ ] Change `dryRun: true` → `dryRun: false` in `run-all.js`

## Support Triage — Webhook Integration

Agent 11 exports `triageMessage({ from, subject, body })`.

To hook into your support email:
1. Set up a Zapier/Make.com trigger on new email to support@vizyplan.com
2. POST the email data to a simple Express endpoint that calls `triageMessage()`
3. Or run it manually in demo mode: `npm run agent:triage`

## File Structure

```
vizyplan-agents/
├── agents/
│   ├── 01-content-draft.js
│   ├── 02-app-review-monitor.js
│   ├── 03-trademark-tracker.js
│   ├── 04-influencer-monitor.js
│   ├── 05-blog-seo.js
│   ├── 06-content-repurpose.js
│   ├── 07-investor-research.js
│   ├── 08-outreach-drafter.js
│   ├── 09-partner-discovery.js
│   ├── 10-advocate-improver.js
│   ├── 11-support-triage.js
│   └── 12-churn-warning.js
├── lib/
│   └── core.js          ← Brand voice, Claude caller, email sender
├── output/              ← Agent output files (gitignored)
├── run-all.js           ← Scheduler
├── package.json
├── .env.example
└── README.md
```

## Gitignore

Add to your `.gitignore`:
```
.env
output/
node_modules/
```

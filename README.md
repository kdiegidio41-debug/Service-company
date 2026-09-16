# Agent Ops

A local-first AI agent operation. It runs on your machine, uses your own
Anthropic API key, and is built to be **packaged and resold** — the same stack
you run is the product you sell.

```
node cli.js setup     # answer 5 questions about the business
node cli.js dash      # mission control in your browser
node cli.js start     # the schedule runs until you stop it
```

---

## What this actually is

Three parts:

| Part | Where | What it does |
| --- | --- | --- |
| **The agents** | `agents/*.agent.json` | 14 agents as plain JSON. Prompt, schedule, inputs, tools. No code. |
| **The runner** | `core/`, `cli.js` | Loads a spec, fills in your business context, calls Claude, saves the output, logs the run and its cost. |
| **Mission control** | `dashboard/` | Local web UI: run any agent, see history, read output, watch spend. |

An agent is just a file. This is the whole spec format:

```json
{
  "id": "product-scout",
  "name": "Product Scout",
  "category": "store",
  "description": "Hunts product ideas with real demand signals.",
  "tools": ["web_search"],
  "schedule": { "everyHours": 168 },
  "inputs": [{ "key": "niche", "label": "Niche to hunt in", "required": true }],
  "system": "You work for {{business.name}}...",
  "prompt": "Find product opportunities in {{niche}} for {{business.audience}}...",
  "output": { "filename": "products-{{date}}.md" }
}
```

Drop a new `.agent.json` in `agents/` and it appears in the CLI and dashboard on
the next run. That's the whole extension model — and it's what makes new agents
cheap to ship to buyers.

---

## Setup

**1. Install** (Node 20+):

```bash
npm install
```

**2. Add your API key.** Copy `.env.example` to `.env` and paste a key from
[console.anthropic.com](https://console.anthropic.com/settings/keys):

```
ANTHROPIC_API_KEY=sk-ant-...
```

**3. Configure your ecosystem:**

```bash
node cli.js setup
```

It asks what the business does, who it sells to, and which agents to turn on.
Answers land in `config/ecosystem.json` and get injected into every prompt.
Vague answers here produce vague output everywhere — be specific.

**4. Try it without spending anything:**

```bash
node cli.js run product-scout --dry-run
```

`--dry-run` renders the full prompt and saves it as an artifact, but makes no API
call. Use it to read exactly what an agent would send before you pay for it.

---

## Commands

| Command | What it does |
| --- | --- |
| `node cli.js setup` | Configure the ecosystem |
| `node cli.js list` | Every agent, its schedule, and whether it's on |
| `node cli.js run <id>` | Run one agent now. Prompts for any input it needs. |
| `node cli.js runs` | Recent run history with cost |
| `node cli.js start` | Run the schedule until Ctrl-C |
| `node cli.js dash` | Mission control at http://localhost:4317 |
| `node cli.js packs` | List your agent packs, and `packs add <name>` to switch one on |
| `npm test` | Verify the install |
| `npm run package` | Build a clean zip to hand a buyer |

Add `--dry-run` to any of these to spend nothing.

---

## The agent library

| Agent | Category | Schedule | What it does |
| --- | --- | --- | --- |
| Product Scout | store | weekly | Hunts product ideas with real demand signals, flags crowded ones |
| Keyword Miner | store | manual | Marketplace keyword set — 13 tags, long-tails, terms to avoid |
| Listing Writer | store | manual | Full listing: titles, tags, description, FAQ, photo shot list |
| Listing Doctor | store | manual | Audits a listing that isn't converting, fixes ranked by payoff |
| Shop Teardown | store | manual | Reverse-engineers a competitor shop and names their weak spots |
| Margin Checker | money | manual | Real margin math — fees, shipping, ads, returns — shown line by line |
| Offer Designer | money | manual | Bundles, tiers, order bumps, and upsells that raise order value |
| Trend Scout | content | daily 07:00 | What's actually moving in your niche today, and the non-obvious angle |
| Short-Form Writer | content | manual | 5 TikTok/Reels/Shorts scripts with hooks, shot lists, overlays |
| Repurposer | content | manual | One asset into a week of platform-native posts |
| Title Lab | content | manual | 10 titles plus thumbnail concepts, stress-tested against what ranks |
| Review Miner | research | manual | Mines reviews for copy, complaints, and the next product |
| Niche Validator | research | manual | A straight go / no-go before you spend money |
| Operator Report | research | weekly | What the numbers say and three things to do Monday |

### Packs

Packs are agent sets that ship inactive, so the library you see is the one
you chose. `node cli.js packs` lists them; `node cli.js packs add <name>`
switches one on.

| Pack | Agents | For |
| --- | --- | --- |
| `service` | 14 | Local service businesses — lead finding, proposals, review replies, follow-ups |
| `trading` | 8 | Market research — ticker briefs, filings, thesis stress-testing, risk arithmetic, trade journal review |
| `betting` | 8 | Betting math — vig, EV, line shopping, staking, closing line value, bet log review |

The `trading` and `betting` packs hold hard research-only boundaries: no
buy/sell calls, no picks or guarantees, no invented figures, no predictions,
and dated disclaimers on every output. `test/packs.test.js` enforces this on
every spec, so stripping a guardrail fails the build. Both carry legal and
payment-processor considerations the other packs don't — read each pack's own
README before selling it.

Every agent carries the same house rules: never invent a fact, price, or quote —
write `[NEEDS: ...]` instead. That constraint is the difference between output
you can send to a customer and output you have to fact-check line by line.

---

## Cost

Runs are billed to your key at Anthropic's rates. `core/pricing.js` estimates
each run and the dashboard totals it. Defaults to `claude-opus-5` at
$5/$25 per million input/output tokens.

A typical agent run is a few thousand tokens in and one to three thousand out —
cents, not dollars. Scheduled agents are the ones to watch: an agent on
`dailyAt` runs 30 times a month whether or not you read the output. Check
`node cli.js runs` before you leave it running unattended.

To cut cost: set `"model": "claude-sonnet-5"` or lower `"effort"` on individual
agents in their spec, or in `config/ecosystem.json` under `defaults`.

---

## Where things land

```
config/ecosystem.json     Your business context and enabled agents (private)
data/runs.jsonl           Every run: status, duration, tokens, cost
data/artifacts/           The actual output, one file per run
```

`.gitignore` already excludes all three plus `.env`. Keep it that way.

---

## Selling this

`sell/` has the resale side: the sales page, the license, and the playbook on
pricing, packaging, delivery, and support. Start with
[`sell/docs/PLAYBOOK.md`](sell/docs/PLAYBOOK.md).

`npm run package` builds `dist/agent-ops-v1.0.0.zip` with your key, your config,
and your run history stripped out. It refuses to build if any of those slip in.

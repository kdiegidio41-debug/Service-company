# Jarvis metrics proxy

A small server that holds your API keys and hands Jarvis one merged JSON payload.

**Why it exists:** the console is a static page. Anything you put in it is readable by
anyone who opens it. A Stripe key in that page is a Stripe key you've published. So the
page holds nothing, calls this, and this calls Stripe.

You do **not** need this to use Jarvis. Logging by voice works fine forever. Set this up
when hand-logging becomes the annoying part.

---

## Pick a path

### A. Cloudflare Worker — free, always on, recommended

```bash
cd jarvis/server
npm install -g wrangler          # once
wrangler login

wrangler secret put JARVIS_TOKEN        # paste a long random string
wrangler secret put STRIPE_SECRET_KEY   # and whichever others you want
wrangler deploy
```

You get a URL like `https://jarvis-metrics.yourname.workers.dev`. In the app press **D**,
scroll to **Live feed**, paste `<that URL>/metrics` and your `JARVIS_TOKEN`, press
**Connect**.

Generate a token with `openssl rand -hex 32`.

### B. On your own machine — nothing to deploy

```bash
cd jarvis/server
cp .dev.vars.example .env        # fill it in
node local.js                    # → http://localhost:8787/metrics
```

Same thing, except it only answers while that process is running. Fine if you already run
Jarvis from `start.command`.

---

## The sources

Each one is independent. Configure one, three, or none — an unconfigured or failing source
returns `not configured` / `error: …` and the others carry on. The app shows you exactly
which answered, per source, under **Live feed**.

### Stripe — revenue *(the one that just works)*

| | |
| --- | --- |
| Set | `STRIPE_SECRET_KEY` |
| Get it | Dashboard → Developers → API keys → **Create restricted key** |
| Permissions | Read on **Charges** and **Subscriptions**. Nothing else. |
| Gives you | True per-day revenue across the full 14-day window, and MRR summed from active subscriptions with annual and weekly plans normalised to monthly |

Refunded and unpaid charges are excluded. Partial refunds are netted off.

Use a **restricted** key, not your secret key. If it leaks, a read-only key is a bad day;
a full key is a catastrophe.

### YouTube — followers and recent videos

| | |
| --- | --- |
| Set | `YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID` |
| Get it | [console.cloud.google.com](https://console.cloud.google.com) → enable **YouTube Data API v3** → Credentials → API key. Channel id at youtube.com/account_advanced |
| Gives you | Subscriber count, and title + views + likes for uploads in the last 14 days |
| **Does not give you** | **Views per day.** That's the YouTube *Analytics* API, which needs OAuth as the channel owner — a plain API key can't reach it. |

### Sheet — everything else, and the one you'll actually lean on

| | |
| --- | --- |
| Set | `SHEET_CSV_URL` |
| Get it | Google Sheets → File → Share → **Publish to web** → CSV → copy the link |
| Gives you | Whatever you type in it, with a full daily series |

Header row, exactly these names (extra columns are ignored, missing ones count as zero):

```
date,revenue,downloads,tiktok,instagram,youtube,x
2026-09-10,240,18,12400,3100,900,120
2026-09-11,310,22,9800,2600,1400,80
```

**This is the realistic path for TikTok and Instagram.** Neither has a usable metrics API
without submitting an app for review, which takes weeks and is refused for personal
projects. Pasting a row a day into a sheet takes ten seconds and gives you every chart.

### Anthropic — the thinking agents

| | |
| --- | --- |
| Set | `ANTHROPIC_API_KEY`, optionally `AGENT_MODEL` |
| Get it | [console.anthropic.com](https://console.anthropic.com) → API keys |
| Gives you | `POST /agent` — strategy, prose briefings, hooks and scripts written against your real figures |

**This one costs money per call.** Nothing triggers it automatically — not a timer, not the
page load, not the metrics refresh. Only a command you give. Responses are never cached,
because caching a paid call the user just asked for is worse than the cost it saves.

Model defaults to `claude-opus-5`. Set `AGENT_MODEL` to something cheaper if you'd rather;
that's your call, not a default I'll make for you. Each task sets its own effort and token
ceiling in `brain.js` — the strategist runs at high effort, the briefing at low.

Every task's system prompt forbids inventing figures: it works only from the JSON it's
handed and is told to say "nothing logged" rather than imply a trend. If the model declines
a request, the proxy surfaces that as an error rather than returning empty text.

### Figures with no API worth calling

`ACTIVE_USERS`, `TRIAL_CONVERSION`, `CHURN` — set them as plain vars, or just leave them
and set them by voice in the app. Leave them unset here and the app keeps its own values.

---

## How live data merges with what you logged

One rule: **a source that answers wins; a source that doesn't, doesn't touch anything.**

- The proxy sends `null` for anything it can't determine — not `0`. So connecting Stripe
  never zeroes your view counts, and connecting YouTube never zeroes your MRR.
- **Where a source does answer, it is authoritative.** If you connect the sheet, the sheet
  owns `revenue`, `downloads` and all four view columns. Put your numbers in the sheet from
  then on — logging views by voice will be overwritten on the next refresh.
- **Your flags, handled items, queue, ideas and reminders are never touched.** No API
  produces those; they're your judgement and they stay local, always.

Press **Disconnect** and everything falls back to your local data, untouched.

---

## Security

- `JARVIS_TOKEN` is a shared secret between the app and the proxy. Without it, anyone who
  finds the URL can read your revenue. Set it.
- `ALLOWED_ORIGIN` restricts CORS to your app's origin. Set it once you know the origin;
  `*` is fine while you're testing.
- `.env` and `.dev.vars` are gitignored. Keep it that way — secrets belong in
  `wrangler secret put`, never in `wrangler.toml`.
- Responses are cached about four minutes, so many open tabs are still one round of
  upstream calls. Add `?fresh=1` to bypass.

`GET /health` reports which sources are configured (including `agents`) and lists the
available tasks, without revealing any values — the
quickest way to check a deploy landed.

---

## Adding a source

`sources.js` is a set of plain async functions. Write one that returns what you need, then
register it in `collect()`:

```js
export async function plausible(key, site) {
  const r = await getJSON(`https://plausible.io/api/v1/stats/timeseries?site_id=${site}&period=14d`,
                          { headers: { Authorization: `Bearer ${key}` } });
  const byDay = {};
  for (const row of r.results) byDay[row.date] = row.visitors;
  return shapeSeries(byDay, window14());
}
```

Rules: fail soft (throw, and `collect` records it), return `null` for anything you don't
know rather than `0`, and keep the day keys as `YYYY-MM-DD` local dates.

## Files

```
server/
├── sources.js          The metric adapters and shaping. Shared. ← add sources here
├── brain.js            The thinking agents: prompts, model call, guardrails
├── worker.js           Cloudflare entry: auth, CORS, caching
├── local.js            Node entry: same, for running on your machine
├── wrangler.toml       Cloudflare config (no secrets)
└── .dev.vars.example   Every variable, documented
```

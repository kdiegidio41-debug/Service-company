# Selling the ecosystem

How to turn `agent-ops` into something people pay for. This is the part that
decides whether you make money, not the code.

---

## What you're actually selling

Not "AI agents." Nobody wants agents. They want the thing the agent produces —
leads in the inbox on Monday, the proposal written before they lose the job,
the review answered before it sits there for a week.

Sell the output. Demo the dashboard.

The honest pitch: *"This runs on your machine, uses your own API key so there's
no per-seat markup, and you own the files. Here's what it produced for my
business last week."*

That last sentence is the entire sale. **Run this on your own business first.**
A screenshot of your real `data/artifacts/` beats any feature list, and you
cannot fake it convincingly.

---

## Three ways to sell it, in order of how fast you get paid

### 1. Done-for-you setup — $1,500–$5,000 + $200–$800/mo

You install it, configure it to their business, write 2–3 custom agents for
their specific workflow, and keep it running.

- **Fastest to first dollar.** You can sell this today, before you've polished
  anything, because you're selling your time plus a working stack.
- Highest price per customer, lowest volume.
- The retainer is the real business: new agents monthly, tuning prompts, and
  being the person who fixes it.
- Sell to: local service businesses, agencies, solo consultants who already
  feel the admin load.

**What you deliver:** the zip from `npm run package`, installed and configured
on their machine, plus a 45-minute handover call you record.

### 2. Self-serve license — $97–$497 one-time, or $29–$79/mo

They buy the zip, run `setup` themselves, use their own key.

- Scales without your time, but needs volume and marketing to matter.
- Recurring beats one-time here, and the honest justification for recurring is
  **new agents every month.** If you're not shipping new agents, charge once.
- Needs a checkout (Gumroad, Lemon Squeezy, Stripe Payment Links), a delivery
  mechanism, and a license key or an honor-system license.
- Sell to: people who already run a small online business and are comfortable
  in a terminal. That is a real constraint — see Friction below.

### 3. Agent packs — $27–$97 each

Sell `.agent.json` bundles for a specific niche. A "Real Estate Pack," a
"Restaurant Pack," a "Trades Pack."

- Best margin per hour of work. An agent spec is a JSON file.
- Works as an upsell to existing buyers and as a cheap first purchase for new
  ones.
- This is where a monthly subscription actually earns its price.

**Run all three.** Pack buyers become license buyers; license buyers who get
stuck become done-for-you clients at 20x the price.

---

## Pricing it

Anchor on what it replaces, not on what it costs you:

| What they'd otherwise do | Their cost | Your price |
| --- | --- | --- |
| VA doing lead research | $600–1,500/mo | $200–800/mo retainer |
| Freelance copywriter | $150–500/post | $97–497 one-time |
| Marketing agency retainer | $2,000–8,000/mo | $1,500–5,000 setup |

Two rules:

1. **Never price below $97 for the self-serve tier.** Below that you attract
   buyers who need the most support, and support is what kills this model.
2. **Their API spend is theirs and you say so up front.** Roughly $5–40/month
   for a normal operation. Hiding it produces an angry customer in week two.

---

## The friction you have to solve

Be honest about this, because it's where most sales die:

- **It needs Node and a terminal.** That disqualifies a large share of small
  business owners. Options: do the install for them (option 1), record a
  5-minute install video, or ship a one-line installer script.
- **It needs their own API key.** Getting a key means a Console account and a
  credit card. Walk them through it on the call — this is a real drop-off point.
- **It runs only while their machine is on.** Scheduled agents stop when the
  laptop sleeps. Either tell them plainly, or sell hosting as the upsell (a $5
  VPS you manage, billed at $50/mo).

Solving install friction is worth more than adding your 15th agent.

---

## Packaging and delivery

```bash
npm test            # never ship red
npm run package     # dist/agent-ops-v1.0.0.zip
```

The packager strips `.env`, `config/ecosystem.json`, `data/`, and `archive/`,
and **refuses to build** if any of them slip in. Don't defeat that check —
shipping your own API key is unrecoverable once it's in someone's hands.

**Before you ship the first copy:**

- [ ] Run `npm test` and confirm green
- [ ] Unzip into a fresh folder and run `npm install && node cli.js setup`
      as if you were the buyer. Every product ships broken the first time.
- [ ] Fill in the `[SET]` placeholders in `sell/index.html` — prices, contact,
      your name. It ships with blanks on purpose.
- [ ] Put your real terms in `sell/LICENSE-COMMERCIAL.md`
- [ ] Record the install screencast

**Delivery:** Gumroad or Lemon Squeezy handles checkout, file delivery, VAT, and
refunds for a small cut. Don't build a licensing server for your first ten sales.

---

## Support, before it eats you

Set the boundary in writing at purchase:

- Self-serve: email support, 48-hour response, install help only. No custom
  agent writing.
- Retainer: whatever you promised, and write down what you did *not* promise.

Every question you answer twice becomes a line in a FAQ. Every install problem
you hit twice becomes a fix in `setup`.

---

## What not to do

- **Don't promise revenue.** "Make $10k/mo with AI agents" is the claim that
  gets your payment processor to drop you and invites chargebacks. Sell the
  tool and the time it saves, which you can actually demonstrate.
- **Don't fake the testimonials or the dashboard screenshots.** Use your own
  real runs until you have customers who'll give you real quotes.
- **Don't sell an agent you haven't run yourself at least ten times.** You will
  not discover that a prompt drifts until you've read a lot of its output.
- **Don't resell someone else's branding.** Ship this as yours, with your name
  and your terms.

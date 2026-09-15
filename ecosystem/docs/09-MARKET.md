# The Market — turning the farm into money

Everything else in this repo spends money. This zone is the only one that brings
it in.

---

## The method, in one paragraph

Most people sell, then work. You work, **then** sell. An agent can audit fifty
local businesses in an evening, which means you can walk into a conversation
holding a finished, specific, checkable report instead of a pitch. That is an
advantage almost nobody selling to small businesses has, and it is the entire
strategy. **Give the finding away free. Charge for the fix.**

---

## What you're actually selling

Not an audit. Not AI. **A working phone number on a mobile site.**

The audit is the free thing that proves you know what you're talking about. The
money is in doing the fix — and then in doing it every month, which is where a
business rather than a series of odd jobs comes from.

| What they pay for | Rough range | Notes |
| --- | --- | --- |
| The audit | **Free** | It is the marketing. Never charge for it. |
| One-off fix of the findings | $150–800 | Start at the bottom. See below. |
| Monthly: reviews answered, listing kept current | $100–300/mo | The real prize |
| Re-audit after 90 days | Included in monthly | Proves the work, drives renewal |

**Price your first three at $150, or free.** You are not buying money at that
stage, you are buying **a testimonial and a before/after screenshot**. Those two
things are what let you charge $600 to the fourth. Say plainly that it's an
introductory rate so they don't anchor there.

---

## Your first week

**Day 1 — Pick one trade in one town.**
Not "small businesses." *Roofers in Ambler.* Narrow enough that you can honestly
say "I looked at every one of you," which is a real thing to say to a person.

```
Have the dowser find roofers in Ambler PA with a checkable web presence defect.
```

**Day 2 — Audit the top ten.**

```
Have the surveyor audit each site on the dowser's list.
```

Then **read them yourself.** If the reports are generic, stop — you have nothing
to sell and you've learned that for free in one evening. If three of them make
you go "oh, that's actually broken," you have a business.

**Day 3 — Write ten approaches.**

```
Have the factor write the approach for the three worst-scoring ones.
Then have the inspector check them before anything sends.
```

**You send them. Not an agent.** Ten emails, written to ten specific businesses.
Not fifty.

**Days 4–7 — Follow up once. Then wait.**

Realistic outcome from ten: **one or two replies, maybe one call.** That is a
normal, healthy result and it is not a sign the thing failed.

---

## The whole chain

```
dowser     find businesses with a named, provable defect
   ↓
surveyor   run audit.mjs · write the report a human can read
   ↓
factor     write the approach — most expensive finding first, free
   ↓
inspector  check every claim traces to a real finding
   ↓
YOU        send it, take the call, agree the scope
   ↓
field-hand do the fix
   ↓
surveyor   re-audit · show them the score moved
```

Track it on the board so nothing goes quiet:

```bash
node ecosystem/tools/farm.mjs goal "Land 3 local audit clients in Ambler" \
  --success "3 businesses paid for a fix and have a before/after score"
node ecosystem/tools/farm.mjs board --open
```

---

## The audit tool

```bash
node ecosystem/tools/audit.mjs https://theirsite.com
node ecosystem/tools/audit.mjs https://theirsite.com --json
node ecosystem/tools/audit.mjs --file saved.html --url https://theirsite.com
```

17 checks, weighted by severity, each with evidence and a fix. It reads **one
page's HTML** — it cannot see JavaScript-rendered content, real page speed, or
the Google Business Profile itself. Those limits are printed in every report on
purpose. Overclaiming is how you lose a client in the first meeting.

---

## Practical things that will bite you

**Getting paid.** If you're under 18, Stripe, PayPal Business and most processors
require 18+. Local clients paying by cash, check or Venmo work fine at this
scale. Anything beyond a few clients needs a parent on the account or an LLC —
sort it *before* you close one, not after.

**This is a real business.** Money from strangers for services means income, and
income has tax implications. Worth a conversation with a parent early rather than
in April.

**Don't become spam.** Ten personal emails is outreach. Fifty from a template is
spam, and it burns the town — there are only so many roofers in Ambler and you
cannot un-annoy them. The `factor` caps follow-ups at two for this reason.

**Never fabricate a finding.** One wrong item and the whole report is worthless,
because the first thing a suspicious owner does is check the part you got wrong.
The `surveyor` is built around this; don't override it.

**You cannot see their Google Business Profile from the tool.** If you're going to
claim their listing is incomplete, go look at it first.

---

## What this will actually feel like

Honest expectations, because the gap between these and the fantasy is where most
people quit:

- **The agents make the work cheap. They do not make the selling easy.** The
  bottleneck is getting a stranger to reply, and no agent fixes that.
- **Ten approaches is a normal batch. One reply is a normal result.** That is a
  10% response rate, which for cold outreach is good.
- **Your first client will probably come from someone you or your family already
  know**, not from the cold list. Use the cold list to get sharp; use the warm
  one to get paid.
- **The first month is likely $0.** The second is likely a few hundred. The
  interesting number is month six, and only if you kept going.

---

## When to add the rest of the Market crew

Three of the six Market roles are live. The others are charters, on purpose:

| Role | Build it when |
| --- | --- |
| **The Appraiser** — qualifying | You have more leads than time. Until then, qualify by hand; you learn the trade doing it. |
| **The Auctioneer** — pricing | You've priced five deals yourself and noticed you're inconsistent. |
| **The Reeve** — retention | You have your **second** month of a recurring client. Not before. |

Standing rule: **building an agent before there is work for it buys complexity and
no capability.**

---

## If this works, what it turns into

The same crew points at a bigger version without much change:

- **More trades, same town.** The dowser doesn't care whether it's roofers or dentists.
- **The fix, not just the finding.** Audits find the problem; `field-hand` and
  `smith` can do the work.
- **Everglow, properly, in 2027.** The plan in `/docs/BUSINESS_PLAN.md` needs
  **$28,900** and an inventory buy in **June or July**. This zone is how you'd
  fund that — and the Dowser, Factor and Reeve are exactly the crew that plan
  needs for finding customers and holding renewals.

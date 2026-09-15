# The Market — zone charter

**Finding and winning work.** The Wayside. Branch `claude/steading-market`.

> This is the deep dive for one zone. The whole ecosystem is in [the README](../README.md);
> the map is [map/steading-map.html](../map/steading-map.html).

---

## Charter

The only zone that faces a customer. Everything else on this farm spends money; this one brings it in. Its whole method is to do the work before asking for it — arrive holding a finished diagnostic rather than a pitch.

### Owns

- Finding prospects with a verifiable problem
- Qualifying who can actually pay
- The diagnostic that becomes the free artifact
- Outreach and follow-up
- Pricing and quotes
- Delivery and retention

### Where it breaks

It leads with the agent instead of the outcome. Nobody buys 'an AI audit'; they buy 'your phone number is not tappable and you are losing calls'. The moment the pitch is about how the work was done, the work stops being worth paying for.

---

## Build this first

1. **Pick one trade in one town.** Not "small businesses" — *roofers in Ambler*. Narrow enough that you can honestly say "I looked at every one of you".
2. **Ten audits before one email.** If the reports read as generic, stop: you have learned in one evening, for free, that there is nothing here to sell.
3. **Send ten approaches yourself.** Not fifty, and not from an agent. One reply from ten is a normal, healthy result.

See [docs/05-BUILD-ORDER.md](../docs/05-BUILD-ORDER.md) for where this sits against the other zones.

---

## What this zone promises everyone else

- Every prospect on the list carries the specific evidence for its defect — never an impression.
- Every claim in an approach traces to a finding in an audit that was actually run.
- Outreach stops after two follow-ups, and the stop is recorded.
- A human presses send. Always.

---

## Stations (4)

### The Wayside

Where you stand at the road and watch who goes past. Prospects are found here — businesses with a problem you can name and prove before you ever speak to them.

| | |
| --- | --- |
| Takes in | A trade and a geography · A problem that is checkable from outside |
| Puts out | A prospect list with a named, verifiable defect each · The ones not worth approaching, and why |
| Roles | The Dowser |

- **Find prospects with a named defect** (`t-find-prospects`, The Dowser) — done when every row names a specific checkable defect, not a general impression. *Watch for: listing businesses because they exist rather than because something is wrong*
- **Build the prospect list** (`t-build-list`, The Dowser) — done when contact details are verified rather than guessed. *Watch for: inventing an email address from a pattern*

### The Assay Bench

Where a prospect's problem is measured rather than asserted. The output is the artifact you hand over — it has to be right, because it is the entire argument for paying you.

| | |
| --- | --- |
| Takes in | A qualified prospect · Their public web presence |
| Puts out | A scored audit naming each defect, what it costs, and the fix · A note when there is nothing worth fixing |
| Roles | The Assayer |

- **Run the audit** (`t-run-audit`, The Assayer) — done when every finding cites what was actually found on the page. *Watch for: reporting a defect the page does not actually have — one wrong finding discredits the whole audit*
- **Write the report they receive** (`t-write-report`, The Assayer) — done when each finding says what it costs in customers, in their words. *Watch for: writing for an engineer. The reader does not know what a meta description is and does not need to*

### The Order Book

The pipeline. Who was found, who was approached, who replied, who paid, and who is due a follow-up. Without it the whole zone runs on memory and loses people.

| | |
| --- | --- |
| Takes in | Prospects · Responses · Delivered work |
| Puts out | A pipeline with a next action and a date on every row · Pricing decisions and the reasoning behind them |
| Roles | The Appraiser · The Auctioneer |

- **Qualify a lead** (`t-qualify-lead`, The Appraiser) — done when the reason would still convince you a week later. *Watch for: qualifying everyone because the list looks thin*
- **Price the fix** (`t-price-work`, The Auctioneer) — done when the scope is specific enough that 'done' is not arguable. *Watch for: pricing the hours instead of the outcome*
- **Keep the order book** (`t-track-pipeline`, The Appraiser) — done when no row is without a next action. *Watch for: leads going quiet and quietly disappearing from the book*

### The Market Stand

Where the farm meets a stranger. The approach is made here, the work is delivered here, and the relationship is kept here — which is worth more than any single sale.

| | |
| --- | --- |
| Takes in | A finished audit · A cleared artifact from the Weigh Station |
| Puts out | An approach, in the prospect's language · Delivered work and a receipt · A renewal, or an honest close |
| Roles | The Factor · The Reeve |

- **Make the approach** (`t-make-approach`, The Factor) — done when the finding is given away free and the ask is for the fix. *Watch for: explaining the method. Nobody is buying the method*
- **Follow up, then stop** (`t-follow-up`, The Factor) — done when at most two follow-ups, and the stop is written down. *Watch for: a third and fourth follow-up. That is not persistence, it is a reputation cost*
- **Deliver and prove it** (`t-deliver-fix`, The Reeve) — done when the customer can see the score change, not just take your word. *Watch for: declaring delivery without confirming it landed*

---

## Roles (6)

### The Dowser — Prospect Finder

*Sorter tier (`claude-haiku-4-5`) · The Wayside*

Finds businesses with a problem you can name, prove, and fix. A prospect without a specific verifiable defect is a stranger, not a lead.

- Search a named trade in a named geography
- Confirm the business is real and currently trading
- Find one concrete, checkable defect before listing anyone
- Discard the ones already doing it right — they are not prospects, they are proof the standard is achievable
- Never guess at a contact detail

Reads Public listings, directories, search results, Their own website. Writes A prospect list, each row carrying its evidence. Escalates to **The Appraiser**.

### The Appraiser — Lead Qualifier

*Sorter tier (`claude-haiku-4-5`) · The Order Book*

Decides who is worth the trip. Being fixable is not the same as being worth fixing, and neither is the same as being able to pay.

- Check the business is trading and has revenue to spend
- Weigh the size of the defect against the effort to fix it
- Rule out anyone already paying an agency for this
- Kill a lead early rather than carry it
- State the reason for every kill

Reads The prospect list, Public signals of size and activity. Writes Qualified leads, with a reason, Killed leads, with a reason. Escalates to **The Factor**.

### The Assayer — Diagnostic Surveyor

*Specialist tier (`claude-opus-5`) · The Assay Bench*

Measures the problem instead of asserting it. Produces the artifact the whole business rests on — if the audit is generic, there is nothing to sell.

- Run the audit against what is actually published, never against an assumption
- Report the specific evidence for every finding
- Say what each defect costs in customers, not in jargon
- Rank by what it costs, not by how hard it is to fix
- Say plainly when a site is already fine

Reads The prospect's public pages. Writes A scored audit with evidence and fixes per finding. Escalates to **The Factor**.

### The Factor — Outreach & Follow-up

*Specialist tier (`claude-opus-5`) · The Market Stand*

Takes the work to market. Historically the agent who sold a farmer's crop on their behalf — here, the one who turns a finished audit into a conversation.

- Lead with the single most expensive defect, in the owner's language
- Give the finding away for free and charge for the fix
- Never describe how the work was done — it is irrelevant to the buyer
- Follow up twice, then stop, and record the stop
- Keep every claim inside what the audit actually establishes

Reads The audit, The pipeline, Prior contact history. Writes Approaches, Follow-ups, Outcomes on the order book. Escalates to **The Farmer**.

### The Auctioneer — Pricing & Quotes

*Specialist tier (`claude-opus-5`) · The Order Book*

Sets the price. Prices the outcome the buyer gets, never the hours the farm spent.

- Quote one number for a defined scope
- Price against what the defect costs them, not what the work costs you
- Hold a floor and say no below it
- Offer a recurring option where the work actually recurs
- Never discount silently — trade scope for price, visibly

Reads The audit, Prior deals, What the market pays. Writes Quotes, Scope definitions. Escalates to **The Factor**.

### The Reeve — Account Steward

*Hand tier (`claude-sonnet-5`) · The Market Stand*

Keeps the customer after the sale. A second month from an existing customer costs nothing to acquire and is the only thing that turns work into a business.

- Deliver what was quoted, then confirm it landed
- Re-run the audit after the fix and show the movement
- Ask for the referral while the result is fresh
- Notice a lapsing account before it lapses
- Close an account honestly rather than let it rot

Reads Delivered work, The order book, Re-audit results. Writes Delivery receipts, Renewal and referral records. Escalates to **The Factor**.

---

## Wiring across the boundary

### In (1)

- **Task** from The Dispatch Porch (The Farmhouse) → The Wayside · *go find work*

### Out (3)

- **Artifact** The Market Stand → The Weigh Station (The Gatehouse) · *bound for a stranger*
- **Memory** The Market Stand → Silo II — Episodic (The Silo Row) · *what was sent, what came back*
- **Signal** The Order Book → The Tally Office (The Watchtower) · *pipeline value*

---

## Open questions

Unresolved on purpose. These are the decisions worth making deliberately rather than discovering.

- **What is the floor price?** Below some number the work is not worth doing even for a testimonial. Nobody has set it, and it will get set under pressure if it is not set now.
- **Free audit for everyone, or only for the qualified?** Free for all builds reputation and burns time. The Appraiser exists for this, and is not staffed yet.
- **When does a one-off fix become a monthly?** The recurring revenue is the whole prize, but pitching it too early kills the first sale.
- **What happens when a prospect says the audit is wrong?** Sometimes they will be right. There is no written process for retracting a finding, and there should be before it happens.

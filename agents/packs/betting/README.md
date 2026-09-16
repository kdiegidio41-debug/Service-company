# Sports Betting Pack

Eight agents for betting math and research. Install with:

```bash
node cli.js packs add betting
node cli.js setup
```

| Agent | What it produces |
| --- | --- |
| Vig Calculator | Strips the juice from a line; true no-vig probability and break-even win rate |
| EV Calculator | Expected value from your probability estimate and the offered price |
| Line Shopper | Best price across books you've collected, and what shopping is worth over 100 bets |
| Bankroll Math | Flat, percentage, and Kelly staking arithmetic with the drawdown risk shown |
| Bet Log Reviewer | The pattern in your own history costing you the most |
| CLV Tracker | Closing line value — the honest read on whether you're beating the market |
| Matchup Brief | Injuries, rest, travel, situational spots. No pick attached |
| Market Explainer | Why a line moved, and the general mechanics of line movement |

## What this pack is not

**It does not sell picks and it does not place bets.** Every agent shares a
system prompt that forbids:

- Calling anything a lock, a guarantee, free money, or a sure thing
- Stating any line, injury, or statistic the model did not retrieve
  (missing data comes back as `[NEEDS: ...]`)
- Telling you how much to bet beyond arithmetic on numbers you supplied
- Encouraging chasing losses or raising stakes after a losing run
- Suggesting any way to automate wagers or work around a book's terms

Every output ends with a dated "not a guarantee, every bet can lose" line and
the US National Problem Gambling Helpline. `test/packs.test.js` asserts all of
it on every spec, so stripping a guardrail fails the build.

**Bet Log Reviewer is explicitly instructed to lead with it** when your own data
shows stakes rising after losses or a sustained losing run at increasing size.
That is the pattern that does real damage, and softening it would defeat the
point of the agent.

## The honest framing

The pack is built around a claim that happens to be both true and legally
safer than the alternative: **long-run results come from price and process,
not from picking winners.** Vig, EV, line shopping, staking discipline, and
CLV are the things a bettor can actually control. That is why the pack is
weighted toward calculators and record review rather than predictions.

## Before you sell this pack

This carries more risk than anything else in the product.

1. **Never market it as picks, locks, guaranteed profit, or a winning system.**
   That is the claim that draws regulators, gets payment processors to drop
   you, and invites chargebacks. "Do your betting math correctly and see your
   own leaks" is sellable and true.
2. **Legality varies.** Sports betting is legal only in some jurisdictions,
   and is 21+ in most US states that permit it. Selling analysis software is
   not the same as operating a book, but where you and your buyers are located
   matters, and a README cannot settle it for you. Get advice before you take
   money.
3. **Payment processors have their own rules.** Stripe, PayPal, Gumroad and
   others restrict gambling-adjacent products independently of the law. Read
   the acceptable-use policy before you build a funnel on one, not after your
   account is frozen.
4. **Do not remove the helpline or the disclaimers.** If a buyer asks you to
   make it "more confident," that is the moment to say no.

If betting has stopped being fun: the US National Problem Gambling Helpline is
**1-800-GAMBLER**, 24/7, free and confidential.

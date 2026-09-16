# Trading Research Pack

Eight agents for researching markets. Install with:

```bash
node cli.js packs add trading
node cli.js setup
```

| Agent | Runs | What it produces |
| --- | --- | --- |
| Ticker Brief | manual | A factual one-pager: business, revenue, recent news, upcoming events, both cases |
| Earnings Preview | manual | What's expected into a print and how the stock reacted historically |
| Filing Digest | manual | What changed in a 10-K/10-Q/8-K you paste, including what's buried |
| Sector Scan | daily 16:30 | What moved, the stated reason, and where narrative outruns evidence |
| Thesis Stress Test | manual | The hardest available case against your own thesis |
| Risk Calculator | manual | Position-size arithmetic from your numbers, worked line by line |
| Journal Reviewer | manual | The behavioral pattern in your own trade log that costs you most |
| Macro Calendar | weekly | Scheduled events and what each has historically moved |

## The boundary these agents hold

Every agent in this pack shares a system prompt that forbids:

- **Telling you to buy, sell, or hold.** It presents evidence and both sides.
- **Stating a figure it did not retrieve.** Missing data comes back as
  `[NEEDS: ...]`, never as a plausible-looking number.
- **Predicting a specific price or date.**
- **Assuming your finances.** It will not suggest a risk tolerance or a
  position size from numbers you did not give it.

Every output ends with a dated research-only line. A test in `test/packs.test.js`
asserts all of this on every spec, so an edit that strips a guardrail fails the
build rather than shipping quietly.

**Why it's built this way:** the failure mode that costs money here isn't a
weak answer, it's a confident one nobody checked. A model that invents a P/E
ratio produces something that reads exactly like a real one.

## Before you sell this pack

This is the highest-risk thing in the product. Three things to get right:

1. **Never market it as advice, signals, or a system that makes money.**
   Research and education is a different legal category from personalized
   investment advice, and the marketing copy is what a regulator reads first.
   "Read the filing faster" is a sellable claim. "Beat the market" is not.
2. **Keep the disclaimers.** They're in the specs and enforced by tests. Don't
   let a buyer's request to "make it more confident" talk you into removing them.
3. **Check your jurisdiction.** Rules on who may publish investment research,
   and how, vary by country and by state. This pack is built to stay on the
   research side of that line, but where the line sits is not something a
   README can settle for you.

Verify every figure before you act on it. That instruction is in the agents
because it is genuinely the correct way to use them.

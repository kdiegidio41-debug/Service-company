# Dropshipping

A one-product dropshipping store, run by five Claude Code agents. Each agent's
instructions live in `.claude/agents/`.

| Order | Agent | Job | Writes to |
| --- | --- | --- | --- |
| 1 | `product-scout` (run one or two, each in a different lane) | Finds products with rising demand and weak competition | `research/scout-*.md` |
| 2 | `product-validator` | Tries to kill each candidate (saturation, Amazon, margins, IP, ad policy, returns, shipping, liability) and writes the brief for the survivor | `research/PRODUCT_BRIEF.md` |
| 3 | `store-builder` | Builds the store from the brief with the generator in `store/` | `store/products/<slug>/` |
| 4 | `ads-strategist` | Sets the budget, campaign setup, and the kill and scale rules before any money is spent | `ads/ADS_PLAN.md` |
| 5 | `ad-creative-maker` | Writes hooks, video scripts, the phone shot list, and static ads | `ads/CREATIVES.md` |

## The launch sequence

1. **Research**: scouts, then the validator. Nothing gets built until one product
   survives validation.
2. **Order a sample.** Check quality, packaging, and real delivery time yourself. Film
   the product while you have it: that footage becomes the first ads, and it's better
   than supplier photos.
3. **Build the store**, connect checkout (see `store/README.md`), and place one real test
   order.
4. **Ads plan**: agree on the kill rule (how much you'll spend before you call it) before
   the first dollar goes out.
5. **Creatives**, then launch the test.
6. **Read the numbers** with `ads-strategist` and make the cut, keep, or scale call on
   the rules from step 4.

## What you need that the agents can't do for you

- **An adult account holder.** Shopify, Stripe, PayPal, Meta and TikTok ad accounts all
  require the owner to be 18 or older. If you're under 18, a parent or guardian has to
  own the accounts and the business.
- **A business entity and a sales tax setup.** Shopify collects sales tax, but you
  register in the states where you have to.
- **A test budget you can lose.** Most products fail. Plan on testing two or three before
  one works.

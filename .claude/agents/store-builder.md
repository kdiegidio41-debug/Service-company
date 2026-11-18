---
name: store-builder
description: Builds a one-product storefront from a validated product brief, using the generator in dropshipping/store. Use once dropshipping/research/PRODUCT_BRIEF.md exists. Also use to revise an existing store's copy, offer, or page sections.
---

You build one-product stores with the generator in `dropshipping/store/`. Read
`dropshipping/store/README.md` first: it documents the config fields and the build
command. Read `dropshipping/research/PRODUCT_BRIEF.md` for the product, the buyer, the
positioning, and the claims you may and may not make.

## How you work

1. Create `dropshipping/store/products/<slug>/product.json` (copy the closest existing
   product as a starting point) and an `img/` folder beside it.
2. Write the page copy into the config. Build with `node build.mjs <slug>` from
   `dropshipping/store/`.
3. Read the build's preflight report and fix everything you can. Report what only the
   owner can fix (checkout connection, real photos, business details, pixel IDs).
4. Open the built page in a browser at phone width (390px) and desktop width, take
   screenshots, and look at them. Fix what looks wrong before you call it done.

## Copy rules

- The headline makes the same promise as the ads. Take it from the brief's positioning
  line, not from your own idea of what sounds good.
- Write to one buyer at the moment they feel the problem. Lead with the outcome, then
  show how the product delivers it.
- Be specific: measurements, materials, what is in the box, how long delivery takes.
  Specifics convert better than adjectives, and they prevent "not as described" refunds.
- Every claim must be true of the exact supplier version in the brief. If you are not
  sure, leave it out and list it as a question for the owner.

## What never goes on the page

These are common in dropshipping and each one is illegal, gets ad accounts banned, or
both. Do not add them even if asked to "optimize harder"; explain the risk instead.

- Invented reviews, star ratings, or customer counts. The `reviews` list stays empty
  until the owner supplies real ones. (FTC rule on fake reviews, 16 CFR Part 465.)
- A "compare at" price the product was never actually sold at. (FTC 16 CFR Part 233.)
- Fake countdown timers, fake stock counters, or "only 3 left" that is not true.
- Medical or health claims, and before/after body images.
- Photos or logos you do not have the right to use. Supplier photos are fine when the
  supplier permits it; another brand's photos are not.
- "Ships from the USA" or a delivery time that is not true of the supplier in the brief.
- Hidden subscription or pre-ticked add-ons at checkout.

## Page checklist

- One primary action, repeated: the buy button. No links that lead away from buying.
- Above the fold on a phone: product image, name, price, the main promise, the buy button.
- Honest delivery estimate near the button, generated from the config's shipping days.
- Bundle options that raise order value with a real per-unit saving.
- Shipping, returns, privacy, terms, and contact pages exist and are linked in the footer
  (payment processors and ad platforms check for them).
- Every image has alt text, and the page works with a keyboard.
- The page loads fast: compressed images, no extra scripts.

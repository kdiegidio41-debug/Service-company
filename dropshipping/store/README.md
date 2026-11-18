# One-product store generator

Turns one `product.json` file into a complete static store: a product page built to
sell one item, plus Shipping, Returns, Contact, Privacy, Terms and 404 pages. No
framework and no dependencies, only Node 18 or newer.

```bash
node build.mjs <slug>            # products/<slug>/  ->  dist/<slug>/
node build.mjs <slug> --strict   # same, but fails if any blocker remains
```

Start a new product by copying the template:

```bash
cp -r products/_template products/<slug>
```

Every build prints a preflight report:

- **Blockers** stop you taking real orders: checkout in demo mode, placeholder business
  details, missing photos, any field still marked `TODO`, and any line left in `verify`.
- **Warnings** won't break anything but cost money: no ad pixel, delivery over 14 days, a
  crossed-out "compare at" price.
- **Notes** are optional extras.

Missing photos don't break the build. Each one becomes a labeled "PHOTO NEEDED" card
that shows the shot to take, so the page can be reviewed before any photos exist.

## What the page includes

- Buy box: gallery, price, bullets, color or style options, bundle pricing with the
  saving worked out, a dated delivery estimate, and trust icons
- Sections you choose and order in `page.sections`: `problem`, `features`, `steps`,
  `compare`, `sizes`, `specs`, `reviews`, `guarantee`, `faq`, `cta`
- A sticky buy bar on phones once the main button scrolls off screen
- Product, shipping, return-policy and FAQ structured data for Google
- Meta, TikTok and Google Analytics events (ViewContent, AddToCart, InitiateCheckout),
  loaded only when an ID is set
- UTM tags and ad click IDs passed through to checkout, so orders trace back to ads

## Connecting checkout

This generator makes the storefront. Payment and order handling come from a checkout
provider. Pick one in `checkout.mode`:

| Mode | How it works | Bundle prices |
| --- | --- | --- |
| `demo` | The buy button shows a "checkout isn't connected" notice. Nothing is charged. | n/a |
| `shopify` | The buy button sends the buyer to `https://<shop>/cart/<variant>:<qty>`, which opens Shopify checkout with the item in the cart. | Make a discount code per bundle size in Shopify (for example `BUNDLE2` = $19 off 2 items) and list it in `discountCodes`: `{ "2": "BUNDLE2", "3": "BUNDLE3" }`. The code is applied automatically. |
| `links` | One payment link per option and bundle, for example Stripe Payment Links. Keys are `"<option>\|<qty>"`, such as `"Black\|2"`. Use `"default\|<qty>"` when there are no options. | Set each link's price to the bundle price. |

**Shopify is the recommended route** for dropshipping. Its dropshipping apps (DSers,
CJdropshipping, Zendrop and others) send each order to the supplier automatically, and
Shopify handles tax, order emails and refunds. Variant IDs are in Shopify admin: open the
product, click a variant, and the number at the end of the page address is its ID.

Always place one real order with a real card, then refund it, before you spend on ads.

## The rules built into the generator

Some things are left out on purpose, because each one is illegal, gets ad accounts
banned, or both:

- **Reviews and ratings only appear when real ones are supplied.** The `reviews` list
  starts empty. No reviews means no star rating on the page or in search results.
  (FTC rule on fake reviews, 16 CFR Part 465.)
- **The crossed-out price** (`compareAt`) prints a warning on every build. Only use it if
  the product genuinely sold at that price recently. (FTC 16 CFR Part 233.)
- **No countdown timers or stock counters.**
- **The delivery estimate is calculated** from `shipping.processingDays` and
  `shipping.transitDays`. Set them to what the supplier actually achieves.

## product.json fields

| Field | What it does |
| --- | --- |
| `brand.name`, `brand.wordmark`, `brand.blurb` | Store name, the text logo, and the footer line |
| `brand.colors` | `bg`, `surface`, `tint`, `ink`, `muted`, `accent`, `accentInk`, `line`. Keep `accentInk` readable on `accent`. |
| `business.*` | Legal name, email, mailing address, optional phone, reply time, governing-law state. Printed on the policy pages, so they must be real. |
| `site.url`, `site.title`, `site.description`, `site.ogImage` | Live address, search title (under 60 characters), search description (under 160), link-preview image |
| `product.name`, `shortName`, `eyebrow`, `tagline`, `sku`, `cta` | Product heading, the sticky-bar name, the small line above the heading, the main promise, SKU for pixels, button text |
| `product.gallery[]` | `file` in `img/`, `w`, `h`, `alt`, and `shot` (what to photograph, shown on the placeholder) |
| `product.bullets[]` | Three to five outcomes. `*text*` becomes emphasis. |
| `product.options` | Optional. One option group, or a list of groups (for example Size, then Finish). Each group has a `label` and `values[]`. Set `"style": "pills"` for text buttons, or leave it out for color swatches. Set `guideHref` (for example `"#sizes"`) to add a size-guide link. Each value has a `name`, an optional `swatch` color, an optional `galleryIndex` (the photo to show when picked), an optional `note`, and an optional `priceDelta` (added to the price of each unit, for example `30` for the Large size) |
| `product.bundles[]` | `qty`, `label`, `price`, optional `note`, `badge`, `default`. The first bundle must be qty 1. |
| `product.compareAt` | Crossed-out price. Leave `null` unless it's true. |
| `shipping` | `price` (0 = free), `processingDays` and `transitDays` as `[min, max]`, `region`, `origin` |
| `returns` | `days`, `defectDays`, `condition`, `returnShippingPaidBy` (`"customer"` or `"store"`) |
| `checkout` | See "Connecting checkout" above. With several option groups, variant names are joined Shopify-style: `"Medium / Walnut"`. |
| `tracking` | `metaPixelId`, `tiktokPixelId`, `ga4Id` |
| `reviews[]` | Real reviews only: `name`, `rating` (1 to 5), `text`, `verified` |
| `page.announcement`, `headerCta`, `nav[]` | Top bar text, header button, section links |
| `page.sections[]` | The page below the buy box, in order. See `products/_template/product.json` for every section's fields. The `sizes` section (a size table plus measuring steps) is shown in `products/denly-den-table/product.json`. |
| `verify[]` | Claims in the copy you still have to confirm against the exact supplier product or your sample. Each line is a launch blocker until you delete it. |

## Hosting

`dist/<slug>/` is a plain static site. Drag it onto Netlify Drop or Cloudflare Pages, or
point a Netlify site at this repository with the build command `cd dropshipping/store &&
node build.mjs <slug>` and publish directory `dropshipping/store/dist/<slug>`. The
`_headers` file sets caching rules on both hosts.

If you'd rather run everything inside Shopify, the copy in `product.json` drops straight
into a Shopify theme's product page. The generated page is then a fast landing page for
ads that hands off to Shopify checkout.

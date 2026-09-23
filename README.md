# EverGlow Christmas Lighting

Marketing website, brand, and business plan for a professional Christmas and holiday
lighting company: design, installation, maintenance, takedown, and storage.

The homepage is a single lead-generation landing page. Every section pushes toward one
action, **Get My Free Quote**, which opens a short on-page form. A longer 4-step quote
planner with a live ballpark estimate lives at `quote.html` for people who want a number
before they talk to anyone.

---

## ⚠ Before you launch: the must-change list

The site is complete and functional, but it ships with **placeholder business details**.

| Placeholder | Replace with | Where |
| --- | --- | --- |
| `(555) 555-0142` and `+15555550142` | Your real phone | `index.html`, `quote.html` |
| `hello@everglowlighting.com` | Your real email | `index.html`, `quote.html`, `assets/js/config.js` |
| `everglowlighting.com` | Your real domain | Both pages (canonical, Open Graph tags, JSON-LD) |
| Service-area towns (Jamison + Bucks County, and Chestnut Hill → Plymouth Meeting in Montgomery County) | Remove any town you won't actually serve | `index.html`: the service-area chips and `areaServed` in the JSON-LD |
| Social links (`href="#"`) | Your Instagram / Facebook / Google profile | `index.html` footer |
| `[LEGAL BUSINESS NAME]`, `[MAILING ADDRESS]`, `[LLC / sole proprietorship]` | Your registered business details | `privacy.html`, `terms.html` |

**Confirm these promises are true before going live.** The page makes them in plain
language, so they have to hold up:

- Quotes back **usually within 24 hours**
- Service calls for anything you installed are **included** until takedown, and you
  **aim** to be out within 24 hours, weather permitting
- **Clip-only** installs (no nails, staples, adhesive), with ladders set so nothing rests on gutters
- Takedown in **early January**, and a **storage option** quoted up front
- On `quote.html`: a **50% deposit** books the install week, balance due on install day

The site deliberately **does not claim you're insured.** Once you have a general liability
policy, you can add "Fully insured" back (and "certificate of insurance on request" for
commercial). Don't add it a day before the policy is active.

Things that are **deliberately not on the page**, and should stay off until they're real:

1. **Testimonials.** There's no reviews section, because inventing reviews is deceptive and
   against FTC rules. Once you have real, verbatim customer reviews, add them between the
   "Why EverGlow" and "Service area" sections.
2. **Star ratings in structured data.** There's no `aggregateRating` in the JSON-LD. Google
   penalizes invented ratings. Add one only when you have real reviews to count.
3. **Fake scarcity.** The "Installation Spots Are Limited" banner says the season fills up.
   It never shows a made-up number like "only 3 spots left." Keep it that way.

---

## Staying out of legal trouble

The site is written to avoid the things that most often get small service businesses
sued or fined. None of this is legal advice. Have a local attorney review `privacy.html`,
`terms.html`, and your customer contract before launch; for a small business that's
usually a short, flat-fee job.

**Already handled on the site**

- **No unprovable claims.** No "best in town," no fake reviews, no invented star ratings, no
  fake countdowns, no insurance claim until you have a policy. Promises are worded as
  what you *aim* to do ("usually," "weather permitting"), and actual guarantees are left
  to your written service agreement.
- **Texting consent (TCPA).** Both forms require a checkbox that says you may call or text,
  including automated texts, that consent isn't a condition of purchase, and that they can
  reply STOP. Unwanted texts can cost $500 to $1,500 *per message* under federal law, so
  honor every STOP and never text a number that didn't opt in.
- **Privacy Policy and Terms of Use** (`privacy.html`, `terms.html`), linked in the footer
  and from both consent boxes. They say estimates aren't binding, renderings are
  illustrations, and a submitted form doesn't reserve a date.
- **Images.** Stock photos are licensed (Unsplash) and credited, with house numbers and signs
  blurred; the before/after rendering is labeled as an illustration.
- **Accessibility.** Keyboard-usable, labeled forms, alt text on every image. Websites that
  don't work with screen readers do get sued; keep writing alt text for new photos.

**What protects you most is off the website**

1. **Form an LLC** and use the legal name in `privacy.html` / `terms.html`. It keeps a
   lawsuit against the business away from your personal savings.
2. **General liability insurance** before anyone climbs a ladder. Workers' comp as soon as
   you have employees. This is the big one for a business that works on roofs.
3. **A written service agreement for every job** (have a lawyer draft it once): scope,
   price, deposit and cancellation terms, what "service calls included" covers, how
   property damage is handled, weather delays, takedown window, and a **photo release**.
4. **Check Pennsylvania's Home Improvement Consumer Protection Act.** If it applies to your
   work (the site's service area is in PA), you must register with the Attorney General and
   your contracts need specific terms, including a 3-day cancellation right.
5. **Check the name before you print anything.** Search "EverGlow" in the USPTO trademark
   database and your state's business registry. A name conflict can force a rebrand after
   you've paid for signs, shirts, and a truck wrap.
6. **Only use photos you own.** Photos from Google, Pinterest, or another company's website
   are copyrighted, and using them can bring takedown demands and damages claims. Also
   ask customers before posting their house, and blur house numbers.

---

## Images: real photos plus one rendering

The hero and the five service cards use **real photos from Unsplash**, chosen by the owner
and used under the Unsplash License (free for business use). They're cropped per slot in
`assets/img/photos/`. The phone hero uses a taller photo with the night sky extended so the
headline has room. `docs/IMAGE_SOURCES.md` records where each photo came from and what was
edited; **save a screenshot of each photo's Unsplash page** as your proof of license.

Two rules keep the stock photos safe to use:

- They show the style of work you offer, **not your installs**. The hero and footer credit
  the photographers (Gautam Krishnan, Dmitry Spravko) and say the photos don't show EverGlow installs. Don't
  caption them as your work.
- A neighbor's house number and a restaurant sign in the photos were blurred. Do the same
  for any new photo.

The **before/after slider** still uses a 3D rendering (`assets/img/renders/before.*`,
`after.*`), labeled "Illustrative rendering." A before/after only means something when
it's the same real house, so it stays a rendering until you shoot your own pair. Replace
the two files, keep the names, and remove the caption.

**Swap in your own photos as soon as you have them.** A real install of a real customer's
house, with their permission, beats any stock photo.

### Photo shot list

Every image slot on the site, and the real photo that should replace it. Shoot at blue
hour (about 20–30 minutes after sunset), on a tripod or propped phone, with every
interior light on, cars and trash cans out of frame, and house numbers blurred.

| Slot | File | What to shoot |
| --- | --- | --- |
| Hero (desktop) | `hero.*`, `hero-md.*` | Your best house, wide and horizontal. Put the house in the **right half** of the frame; the headline sits on the left. |
| Hero (phones) | `hero-portrait.*` | Same house, vertical. House in the **middle third**, sky above for the headline, lawn below for the buttons. |
| Before / after | `before.*`, `after.*` | **Same tripod spot, same framing.** "Before" at dusk with no lights, "after" at blue hour with the install on. |
| Roofline card | `service-roofline.*` | Close on a peak or two and the gutter line, so you can see how straight and even the bulbs are. |
| Trees & landscape card | `service-landscape.*` | A wrapped tree plus lit shrubs or pathway lights. |
| Wreaths & garland card | `service-wreaths.*` | The front door and porch: wreath, garland on columns or railings. |
| Commercial card | `service-commercial.*` | A storefront or office you lit. Keep the rendering until you have one. |
| Full-service card | `service-full.*` | The whole property from a corner angle, house plus yard. |
| Link preview | `og.jpg` (1200×630) | Any strong horizontal shot; this is what shows when someone texts your link. |

Licensed stock photos (Unsplash, Pexels, Adobe Stock) are fine for the hero and service
cards as general mood images, but **never for the before/after** and never captioned as
your work. That slider only means something with your own photos.

To tweak and re-render the mock-ups (different bulb color, camera angle, image size), see
`tools/render/README.md`.

---

## What's in here

```
├── index.html              Landing page: hero, availability banner, 5-step process,
│                           before/after slider, services, why EverGlow, service area,
│                           FAQ, quote form
├── quote.html              Detailed 4-step quote planner with a live ballpark estimate
├── privacy.html            Privacy Policy (template: fill in placeholders, have it reviewed)
├── terms.html              Terms of Use (template: fill in placeholders, have it reviewed)
├── assets/
│   ├── css/styles.css      Design system + all landing-page components
│   ├── css/quote.css       Quote planner styles
│   ├── js/config.js        Form endpoint + fallback email (edit this one)
│   ├── js/main.js          Header, nav, reveals, slider, snowfall, mobile bar, lead form
│   ├── js/quote.js         Quote planner steps, validation, estimate, submission
│   └── img/
│       ├── photos/         Unsplash photos cropped per slot (WebP + JPEG)
│       ├── renders/        Before/after renderings (WebP + JPEG)
│       └── logo.svg, logo-mark.svg, favicon.svg
├── tools/render/           Source for the renderings (three.js scene + render script)
└── docs/
    ├── BRAND_GUIDE.md      Positioning, voice, logo rules, photography
    ├── BUSINESS_PLAN.md    Offer, pricing, unit economics, projections, risks
    ├── LEAD_GENERATION.md  Channel playbook, ad budgets, follow-up scripts
    └── IMAGE_SOURCES.md    Where every image came from and its license
```

No build step, no dependencies, no framework. Open `index.html` and it runs.

> The docs in `docs/` were written for the earlier "Everglow Holiday Lighting Co." name and
> midnight-blue palette. The strategy in them still applies; the site's name and colors are
> now the ones below.

---

## Running it locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploying

It's a static site, so anything works: Netlify, Vercel, Cloudflare Pages, or GitHub Pages.
Drag the folder into Netlify and you're live. Point your domain at it and add SSL (free
everywhere). `tools/` isn't needed on the server, but it does no harm there.

---

## Wiring up the forms

**Both forms are in DEMO MODE right now.** They validate and show the thank-you message,
but nothing is sent anywhere, and the thank-you message says so.

Open `assets/js/config.js` and set the endpoint. Both the homepage form and `quote.html`
use it:

```js
window.EVERGLOW = {
  endpoint: 'https://formspree.io/f/YOUR_ID',   // ← your form endpoint
  fallbackEmail: 'you@yourdomain.com'
};
```

| Service | Setup |
| --- | --- |
| **Formspree** | Free tier, 60-second setup. Create a form and paste its URL above. |
| **Zapier / Make webhook** | Paste the catch-hook URL. Lets you push into Jobber, Housecall Pro, a Google Sheet, and an SMS alert at once. |
| **Your CRM directly** | Jobber and Housecall Pro both accept inbound webhooks. |

Each form POSTs JSON. The homepage form sends `name`, `phone`, `email`, `address`,
`services`, `timing`, `notes`, `consent`, plus `form: "homepage"`, `submittedAt`, `page`,
and `referrer`. The quote planner sends every answer plus `estimateShown`.

**Set up an SMS alert on new submissions.** Reply speed wins jobs: the first company to
respond gets the job about half the time.

What the forms already handle:

- **Validation** with inline messages (10-digit phone, real-looking email, consent).
- **Honeypot field** that catches spam bots without a CAPTCHA.
- **Failure fallback.** If the POST fails, the lead isn't lost: the form shows your phone
  number and a pre-filled email with everything they typed.
- **Conversion tracking.** A successful homepage submission pushes
  `{ event: 'generate_lead' }` to `window.dataLayer`, so Google Tag Manager / GA4 / Google
  Ads can count it as a conversion with no extra code.
- **"Check Availability"** in the banner jumps to the form and highlights the
  installation-window field.

### Tuning the planner's estimate

The ranges on `quote.html` come from `STORY_MULT` in `quote.js` and the `data-price`
attributes on the scope checkboxes in `quote.html`. **Recalibrate them after your first ten
real quotes** so the number people see matches what you actually charge. If you'd rather
show no number at all, delete the `.qsummary` block from `quote.html`.

---

## Design system quick reference

| Token | Value | Use |
| --- | --- | --- |
| Evergreen 900 | `#0A1D16` | Dark sections, header, footer |
| Evergreen 600 | `#1C4633` | Icons, form accents, dark buttons |
| Gold 500 | `#D6A548` | The primary call to action, everywhere |
| Gold 300 | `#F2D796` | Highlights on dark ("Glow" in the headline) |
| Red 600 | `#A5242C` | Accent only: the availability button, a few bulbs |
| Cream | `#FBF8F1` | Light sections |
| White | `#FFFFFF` | Cards, services section, forms |
| Display type | Fraunces 500 | Headlines |
| Body type | Inter 400–700 | Everything else |

The page alternates dark evergreen sections (they sell the glow) with cream and white ones
(they sell trust). Gold is reserved for the quote button, so the eye always knows where
to click.

Accessibility and browser support: semantic HTML, keyboard-operable before/after slider,
visible focus rings, `prefers-reduced-motion` respected (no snowfall, no reveal animations),
no horizontal scroll down to 320px, WebP with JPEG fallbacks.

---

## Where to start (first 30 days)

1. Read `docs/BUSINESS_PLAN.md` §4 (pricing) and §5 (unit economics). Those two sections
   decide whether you make money.
2. Check the name against USPTO and your state registry, then buy the domain and handles.
3. Get insured. The site promises it.
4. Claim and fill out your Google Business Profile. For local service searches it outranks
   this website (`docs/LEAD_GENERATION.md` §1).
5. Set the form endpoint in `assets/js/config.js` and turn on the SMS alert.
6. Buy light inventory in **June or July**, before the seasonal markup.
7. Start commercial outreach in **July**. It books before residential and funds the
   inventory buy.

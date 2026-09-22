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
| Chestnut Hill, Blue Bell, Ambler, … | **Your** service area | `index.html`: the service-area chips and `areaServed` in the JSON-LD |
| The 15-mile radius | Your real radius | `index.html` service-area heading |
| Social links (`href="#"`) | Your Instagram / Facebook / Google profile | `index.html` footer |

**Confirm these promises are true before going live.** The page makes them in plain
language, so they have to hold up:

- Quotes back **within 24 hours**
- Service calls **within 24 hours**, free, from install to takedown
- **Clip-only** installs (no nails, staples, adhesive) and ladder stabilizers
- **Fully insured** crews, and a certificate of insurance on request for commercial jobs
- Takedown in **early January**, and a **storage option** for next season

Things that are **deliberately not on the page**, and should stay off until they're real:

1. **Testimonials.** There's no reviews section, because inventing reviews is deceptive and
   against FTC rules. Once you have real, verbatim customer reviews, add them between the
   "Why EverGlow" and "Service area" sections.
2. **Star ratings in structured data.** There's no `aggregateRating` in the JSON-LD. Google
   penalizes invented ratings. Add one only when you have real reviews to count.
3. **Fake scarcity.** The "Installation Spots Are Limited" banner says the season fills up.
   It never shows a made-up number like "only 3 spots left." Keep it that way.

---

## The images are renderings, not photos

Every image in `assets/img/renders/` is a **3D rendering of a fictional house** that was
generated in code (three.js, rendered in headless Chromium). No stock photos and no
copyrighted images are used. The page labels them honestly: the hero and the before/after
slider carry an "Illustrative rendering" caption, and so does the footer.

- `before.*` and `after.*` are the **same scene, pixel for pixel**, with the lighting install
  switched off and on. That's what makes the before/after slider line up.
- `hero.*` / `hero-md.*` are the wide desktop hero. `hero-portrait.*` is a 9:16 version
  that phones and other tall screens get, laid out as a poster (headline in the sky,
  buttons over the snow).
- `service-*.*` are the five service-card images. `og.jpg` is the link-preview image.

**Replace them with real photos of your own installs as soon as you have them.** A real
before/after of a real customer's house is the highest-converting asset you'll own. Shoot
the ~25 minutes after sunset (blue hour), from the same spot, before and after. Keep the
file names and sizes and nothing else needs to change. Then remove the "Illustrative
rendering" captions.

To tweak and re-render the mock-ups (different bulb color, camera angle, image size), see
`tools/render/README.md`.

---

## What's in here

```
├── index.html              Landing page: hero, availability banner, 5-step process,
│                           before/after slider, services, why EverGlow, service area,
│                           FAQ, quote form
├── quote.html              Detailed 4-step quote planner with a live ballpark estimate
├── assets/
│   ├── css/styles.css      Design system + all landing-page components
│   ├── css/quote.css       Quote planner styles
│   ├── js/config.js        Form endpoint + fallback email (edit this one)
│   ├── js/main.js          Header, nav, reveals, slider, snowfall, mobile bar, lead form
│   ├── js/quote.js         Quote planner steps, validation, estimate, submission
│   └── img/
│       ├── renders/        Mock-up renderings (WebP + JPEG fallbacks)
│       └── logo.svg, logo-mark.svg, favicon.svg
├── tools/render/           Source for the renderings (three.js scene + render script)
└── docs/
    ├── BRAND_GUIDE.md      Positioning, voice, logo rules, photography
    ├── BUSINESS_PLAN.md    Offer, pricing, unit economics, projections, risks
    └── LEAD_GENERATION.md  Channel playbook, ad budgets, follow-up scripts
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

# Yard sign — design, print spec, and the QR code

18" × 24" double-sided coroplast. The single cheapest lead source Everglow has:
the brand plan budgets ~1 lead per 6–8 signs per season, at roughly $4–7 a sign.

| File | What it is |
| --- | --- |
| `assets/print/yard-sign.html` | The editable master. Both faces, real print dimensions, fonts embedded. |
| `assets/print/yard-sign.pdf` | **Send this to the printer.** 2 pages, 18.25 × 24.25in, bleed included. |
| `assets/print/yard-sign-front.png` | Proof, front face |
| `assets/print/yard-sign-back.png` | Proof, back face |
| `assets/print/qr-yard-sign.svg` | The QR code on its own, for reuse on door hangers, the trailer, invoices |
| `tools/make_qr.py` | Regenerates the QR for a different URL |
| `tools/embed_fonts.py` | Re-embeds Fraunces + Inter (only needed if the type changes) |
| `tools/build_signs.py` | Rebuilds the PDF and the proofs from the master |

---

## 1. The design

A yard sign gets about **three seconds from 40 feet**, usually from a moving car.
So the front carries five things and nothing else, in the order a stranger reads them:

| Reading order | Element | Why it's that size |
| --- | --- | --- |
| 1 | Lit-bulb string across the top | Says "Christmas lights" before a single word is read |
| 2 | **EVERGLOW** wordmark, 1.8in caps | Legible at ~60ft. The O is the brand's lit bulb. |
| 3 | TAKEDOWN & STORAGE INCLUDED | The one thing no competitor offers. It is the whole positioning. |
| 4 | **(267) 853-0058**, 1.3in caps | The biggest actionable thing on the sign |
| 5 | QR in a white panel | The walk-up ask, for people who won't dial a stranger |

Everything else — domain, "licensed & insured," the January 15 line — is the
**walk-up read**, sized for someone standing on the sidewalk, not driving past.

The back is an optional alternate. Most printers charge the same for a different
back as for a duplicate one, so it carries a second QR, the phone again, and the
three guarantees. If your printer charges extra, just print the front twice —
the front works alone.

**Rules the layout obeys, if you edit it:**

- Nothing important sits in the **bottom 2 inches**. That's grass in October and
  snow in January.
- Bulb amber (`#FFC46B`) marks the action and nothing else. The moment three
  things are amber, none of them are.
- No script or "Christmas" font. It is the fastest way to look cheap and become
  unreadable at distance.
- Dark ground, warm light — it's what a good display actually looks like at 6pm,
  and it makes a white QR panel jump off the sign.

---

## 2. The QR code

### What it points at

```
https://everglowlighting.com/quote.html?utm_source=yard_sign&utm_medium=print
```

Straight to the quote form, not the homepage. Someone standing in front of a lit
house has already been sold; don't make them navigate.

The `utm_` tags are how you find out whether signs are working. In Google
Analytics, Traffic acquisition → Session source/medium → `yard_sign / print`.
Every scan shows up there, separated from search and ads.

### ⚠ Before you print anything

The QR encodes **`everglowlighting.com`, which is a placeholder in this repo and
is not a live site yet.** A yard sign is permanent — a wrong QR means reprinting
every sign you own. So, in order:

1. Buy the domain and get the site live at it.
2. Open the URL above on your phone. It must load the quote form.
3. Regenerate the QR with the real URL and rebuild:
   ```bash
   pip install segno playwright pillow
   python3 tools/make_qr.py --url "https://YOURDOMAIN.com/quote.html?utm_source=yard_sign&utm_medium=print"
   python3 tools/build_signs.py
   ```
4. Scan the QR **off the rendered PNG on a screen** with two different phones
   (one iPhone, one Android — the built-in camera app, not a QR app).
5. Order **one** sign. Scan the physical sign, outdoors, in daylight, from 4 feet.
   Then order the rest.

Step 5 is not optional paranoia. It's the difference between a $6 mistake and a
$300 one.

### Don't want to run the script?

Any free generator works — [qr.io](https://qr.io), [qrcode-monkey.com](https://www.qrcode-monkey.com),
or Chrome's built-in one (right-click a page → *Create QR code for this page*).
Two things matter: **download it as SVG or a 1000px+ PNG**, and don't use a
generator that charges you later to keep the code alive. Which brings us to:

### Never use a "dynamic" or free-trial QR service

Services like QR Code Generator's free tier hand you a QR pointing at *their*
domain, then redirect to yours. When the trial ends or the company folds, every
sign in your service area points at a dead link or an ad. Your QR must encode
**your own domain, directly.** You own the redirect either way: if the quote page
ever moves, add a redirect at the old path — the printed signs keep working.

### Why it's a white box on a dark sign

Scanners expect **dark modules on a light background**. Inverted QRs (light code
on dark) fail on a meaningful share of phones, including older Android cameras.
The Snow panel also gives the code its required **quiet zone** — 4 modules of
clear space on all sides — which is why the panel is bigger than the code.

### Size vs. scan distance

Rule of thumb: **a QR scans from about 10× its own width.**

| QR width | Scans from |
| --- | --- |
| 2in | ~1.5 ft |
| 4in | ~3 ft |
| **6.2in (this sign)** | **~5 ft** |

6.2in is sized for someone who has stopped walking and is standing at the edge of
the lawn. Nobody scans a yard sign from a moving car — that's what the phone
number is for. Don't shrink it below 4in to make room for more copy.

---

## 3. Print specification

Hand this section to the printer verbatim.

| Spec | Value |
| --- | --- |
| Trim size | 18" × 24", portrait |
| Document size | 18.25" × 24.25" (0.125" bleed on all four sides) |
| Safe area | 1.3" inside trim |
| Material | 4mm corrugated plastic (coroplast), **vertical flutes** |
| Sides | 4/4 (full colour both sides) |
| Colour | CMYK, full bleed |
| Finish | UV-cured outdoor inks. Ask for UV — uncoated ink fades badly by January. |
| Hardware | 10" × 30" galvanised **H-stakes**, one per sign |
| Fonts | Fraunces + Inter, embedded in the PDF. Nothing to supply. |

**Vertical flutes matter.** Flutes running top-to-bottom let the H-stake legs
slide in and hold. Horizontal flutes mean the sign flops over in the first wind.

**Quantity and cost.** Order 50 minimum — per-unit price drops sharply and you'll
place one at every job. At 50 units expect roughly $4–7 each double-sided,
$1.50–2 more for stakes. Signs.com, 48HourPrint, Vistaprint, and any local sign
shop all handle this file as-is.

**If the printer asks for outlined text or a flattened file:** open
`yard-sign.pdf` in Illustrator or Affinity and export with fonts converted to
outlines. The fonts are Fraunces and Inter, both SIL OFL, so embedding is
already licensed — most printers won't ask.

---

## 4. Placing them

- **Always get permission.** "Mind if we leave a sign in the yard through the
  weekend?" at the end of the install. Ask on the day, in person — nearly
  everyone says yes when their house has just been lit.
- **Set it at the sidewalk edge, angled to oncoming traffic**, not flat to the
  street. Twenty feet in from the curb means nobody reads it.
- **Check your township's sign ordinance.** Many Montgomery County townships
  limit contractor signs to 6 sq ft (this is 3), restrict placement in the public
  right-of-way, and cap how long a sign may stay. A sign in the right-of-way gets
  removed and can carry a fine.
- **HOAs override all of it.** Ask the homeowner whether their HOA allows
  contractor signage before you plant one.
- **Pull them at takedown.** Leaving a faded sign out in February is worse than
  no sign. The January visit is the natural moment to collect them.

---

## 5. Rebuilding after an edit

```bash
pip install segno playwright pillow
python3 tools/make_qr.py --url "https://YOURDOMAIN.com/quote.html?..."   # only when the URL changes
python3 tools/build_signs.py                                             # PDF + both proofs
```

`build_signs.py` re-inlines the current QR into the master, then renders. Edit
copy, colour, and sizing directly in `assets/print/yard-sign.html` — it's plain
HTML and CSS in real inches, so `font-size: 1.78in` means 1.78 inches on the
printed sign.

If you change the typography, rerun `python3 tools/embed_fonts.py` (needs
network) so the new weights are embedded. Never replace the embedded fonts with a
`<link>` to Google Fonts: if the machine rendering the PDF is offline or behind a
proxy, the link fails *silently* and you get Georgia on fifty signs.

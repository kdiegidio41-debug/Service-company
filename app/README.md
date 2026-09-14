# The Facility

A live operations floor for your two businesses. Instead of a dashboard of
cards, you look in on a room: little operators standing at desks, couriers
walking finished work from one desk to the next, two production lines running
side by side.

Open `app/index.html` in a browser. No build step, no install, no server.

```
Etsy Wing            Ops Core          Content Wing
Niche Scout    ─┐    Command Desk      Trend Scout    ─┐
Design Studio   │    Analytics         Script Room     │
Mockup Bench    │    Treasury          Edit Bay        │
Listing Desk    │                      Caption Desk    │
Pricing Desk    │                      Repurpose Bench │
Review Desk     │                      Cover Art       │
                │                                      │
                └──────► Publishing Floor ◄────────────┘
                   Etsy Storefront · Approval Inbox
                   Publishing Dock · Asset Vault
```

## How it works

Every desk is one AI agent. A desk **takes** an item, works on it for a while,
and **makes** the next item in the chain. Couriers carry the output to whichever
desk needs it next, so you can watch work physically move through the building.

The Etsy line runs `niche → design → mockup → listing → priced → live listing`.
The content line runs `trend → script → video → captioned → post → published`.

The Publishing Dock posts **3 times a day to each of TikTok, Instagram and
YouTube** — 9 total. Once it hits 9 it stops and holds the surplus in its input
tray for tomorrow, which is why you'll sometimes see work stacked up there.

Click any desk, operator or courier to see what it does and what it still needs.

## ⚠ This is a simulation

Nothing here touches a real API yet. No listing is created, no video is posted,
and **the revenue figure is a made-up projection, not money** — that's why the
header is labelled SIMULATION. It's the working skeleton: the production lines,
the hand-offs and the daily quotas are all real logic, but the desks are
pantomiming the work rather than doing it.

Every desk carries a `wire` list saying exactly what it needs to go live — you
can read it in the inspector panel. Broadly:

| To turn on | You need |
| --- | --- |
| Any writing desk | A Claude API key |
| Design Studio, Cover Art | An image generation API |
| Mockup Bench | Printify or Printful account |
| Etsy Storefront, Review Desk | Etsy shop OAuth |
| Publishing Dock | TikTok Content Posting API, Instagram Graph API, YouTube Data API |
| Analytics, Treasury | Read access to each platform's stats |

Two of these are the real gates, and they're worth knowing about before you
count on them: the **TikTok Content Posting API** requires an approved developer
app, and **Etsy's API** requires shop approval. Neither is instant. The other
pieces are ordinary API keys.

Going live also needs a backend — API keys cannot live in a web page, because
anyone who opens the page can read them. That's the next build, not this one.

## Files

```
app/
├── index.html              Page shell — HUD, canvas, inspector, activity log
└── assets/
    ├── css/app.css         All styling
    └── js/
        ├── config.js       ★ The blueprint: zones, desks, items, operators
        ├── world.js        The simulation — jobs, couriers, quotas, revenue
        ├── render.js       Canvas drawing (everything is drawn in code,
        │                   so there are no image files to lose)
        └── app.js          Wiring: inspector, HUD, clicks, main loop
```

**`config.js` is the file to edit.** Adding a desk is one entry in `STATIONS`:
give it a zone, an x/y, what it takes, what it makes, and which desk to hand it
to. The floor plan, the routing and the inspector all pick it up automatically.

## Controls

`❚❚ / 1× / 2× / 4×` — pause or speed up the day. One facility day is 150
seconds at 1×.

# Hollow Creek Farm

An isometric farm where AI agents run your two businesses. Each agent lives in
its own building with its name over the roof. Farm hands walk finished work
from one building to the next, and the lamp outside a building lights up while
that agent is working.

Open `app/index.html` in a browser. No build step, no install, no server.

```
CRAFT YARD (Etsy)      FARMHOUSE HILL     STUDIO MEADOW (video)
Otis   Niche Scout ─┐  Wade   Farmhouse   Roscoe Trend Mill    ─┐
Gus    Design Barn  │  Delia  Stats Silo  Junie  Script House   │
Hattie Mockup Shed  │  Fern   Grain Store Cyrus  Edit Barn      │
Alma   Listing House│                     Nell   Caption Shed   │
Silas  Pricing Shed │                     Beau   Repurpose Shed │
Millie Review Coop  │                     Opal   Cover Coop     │
                    │                                           │
                    └────────► MARKET ROAD ◄────────────────────┘
                  Marlow Etsy Stall · Etta Approval Gate
                  Boone Posting Barn · Hollis Asset Barn
```

## How it works

Every building houses one AI agent. A building **takes** an item, works on it for
a while, and **makes** the next item in the chain. Farm hands carry the output to
whichever building needs it next, so you watch work physically cross the farm.

The Etsy line runs `niche → design → mockup → listing → priced → live listing`.
The content line runs `trend → script → video → captioned → post → published`.

The Posting Barn posts **3 times a day to each of TikTok, Instagram and
YouTube** — 9 total. Once it hits 9 it stops and holds the surplus in its input
crate for tomorrow, which is why you'll sometimes see crates stacked up there.

Click any building or farm hand to see what it does and what it still needs.
The strip under the top bar shows who is on which job right now.

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
| Any writing agent | A Claude API key |
| Design Barn, Cover Coop | An image generation API |
| Mockup Shed | Printify or Printful account |
| Etsy Stall, Review Coop | Etsy shop OAuth |
| Posting Barn | TikTok Content Posting API, Instagram Graph API, YouTube Data API |
| Stats Silo, Grain Store | Read access to each platform's stats |

Two of these are the real gates, and they're worth knowing about before you
count on them: the **TikTok Content Posting API** requires an approved developer
app, and **Etsy's API** requires shop approval. Neither is instant. The other
pieces are ordinary API keys.

Going live also needs a backend — API keys cannot live in a web page, because
anyone who opens the page can read them. That's the next build, not this one.

## Files

```
app/
├── index.html              Page shell — HUD, crew strip, canvas, inspector, log
└── assets/
    ├── css/app.css         All styling
    └── js/
        ├── config.js       ★ The blueprint: paddocks, buildings, agents, items
        ├── world.js        The simulation — jobs, carters, quotas, revenue
        ├── render.js       Isometric drawing (everything is drawn in code,
        │                   so there are no image files to lose)
        └── app.js          Wiring: inspector, HUD, crew strip, main loop
```

**`config.js` is the file to edit.** Adding an agent is one entry in `STATIONS`:
give it a paddock, a grid square, a building type, a name, what it takes, what
it makes, and which building to hand it to. The layout, the dirt paths, the
routing and the inspector all pick it up automatically.

Positions are grid tiles, not pixels — `render.js` projects them to isometric.

## Controls

`❚❚ / 1× / 2× / 4×` — pause or speed up the day. One farm day is 150 seconds
at 1×.

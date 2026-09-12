# J.A.R.V.I.S. — voice operations console

A wake-word voice assistant and heads-up display for running an app and a content
operation. Say **"Hey Jarvis"**, ask how the app is doing, and it reads your numbers back
to you.

It is a **personal app**, not a website. Install it and it opens in its own window with no
browser chrome, works offline, and keeps your data on your machine.

---

## Start here

**Run it with a working microphone:**

| Your machine | Do this |
| --- | --- |
| macOS | Double-click **`start.command`** |
| Windows | Double-click **`start.bat`** |
| Linux | `./start.sh` |

That serves the folder on `localhost` and opens it. Then use your browser's **Install**
button (the ⊞ icon in Chrome's address bar, or ⋮ → *Cast, save and share* → *Install page
as app*) and Jarvis becomes a real app in your dock or Start menu.

### Why not just double-click `index.html`?

**Because the microphone will not work.** Speech recognition requires a *secure context* —
`https://` or `http://localhost`. A double-clicked page is `file://`, which browsers refuse
to give a mic. Everything else works there; the wake word does not. The launcher scripts
above exist purely to solve this.

Jarvis detects which of these is biting and tells you on screen rather than failing quietly.

---

## Your data is yours, and it starts empty

**There is no demo data. Every figure starts at zero and only moves when you log
something.** Nothing is estimated, generated, or filled in on your behalf. If the console
reads zero, that is the truth about your week.

It all lives in `localStorage` — on your machine, in one browser. It is never sent
anywhere. That also means: **back it up before you clear site data or switch machines.**
Open the data panel (**D**) → *Copy backup*.

### Two ways to put data in

**Say it** — fastest, day to day:

```
log 250 revenue
log 40 downloads
log 12k views on TikTok
set MRR to 890
set followers to 1200
published the AI teardown on YouTube with 8000 views
flag renew the domain
handled the signup bug
resolved renew the domain
```

**Type it** — press **D** for the data panel. Set your standing figures (MRR, active users,
followers, conversion, churn), and use *Log a day* with a date picker to backfill history.

Everything on the HUD is derived from those entries: seven-day totals, week-over-week
change, the sparklines, per-platform splits. A week with no prior week to compare reads
**new**, not "+100%".

---

## What you can say

Say `Hey Jarvis` then the command, or press **space** to skip the wake word. **Every
command also works typed**, so Jarvis is fully usable with no microphone.

**Reading it back** — *Brief me* · *How's the app doing* · *What's the revenue* ·
*How are downloads* · *How did content do* · *How's TikTok doing* · *What was the top post*

**Your open items** — *What needs me* · *What did you handle* · *Flag …* · *Handled …* ·
*Resolved …*

**Content ops** — *Queue a post about …* · *Schedule a TikTok about … tomorrow* ·
*What's in the queue* · *Mark … as posted* · *Give me hooks about …* · *Write a script about …*

**Memory** — *Remember …* · *Remind me to …* · *What are my ideas*

**Keys** — `space` talk · `/` command line · `B` briefing · `D` your data · `M` mic ·
`esc` stop · `?` help

---

## The voice

Jarvis picks the best voice your system has, preferring the neural ones — Microsoft's
"Natural" voices and Google's UK English Male are a different class from the old robotic
formant voices. You can override the choice and tune pace and pitch in the data panel
under **Voice**, and it remembers what you pick.

Long replies are split on sentence boundaries before being spoken. That works around a
Chrome bug where anything past roughly fifteen seconds gets silently cut off, and the small
gap between sentences is the beat a person actually leaves — so it fixes the truncation and
improves the delivery at once.

Install more voices from your OS settings if the built-in ones sound thin: macOS *System
Settings → Accessibility → Spoken Content → System Voice → Manage Voices*; Windows
*Settings → Time & Language → Speech*.

---

## Browser support

| | Wake word | Typed commands | Spoken replies | Installable |
| --- | --- | --- | --- | --- |
| Chrome, Edge, Brave, Arc | ✅ | ✅ | ✅ | ✅ |
| Safari | ❌ | ✅ | ✅ | ✅ (Add to Home Screen) |
| Firefox | ❌ | ✅ | ✅ | ❌ |

`SpeechRecognition` is Chromium-only. Elsewhere the HUD says so and the command line takes
over.

Two things worth knowing. **Chrome's speech recognition is a cloud service** — while the mic
is on, audio goes to Google. Nothing else here leaves your machine. And **Chrome ends
recognition every ~60 seconds**; `voice.js` restarts it with a backoff, which is what makes
"always listening" stay on. The wake pattern also accepts *jarvice, jervis, javis* —
recognition rarely nails "Jarvis", and that's the difference between working and saying the
word nine times.

---

## Connecting real sources (later)

Right now you log by hand. When you want it automatic, point Jarvis at an endpoint that
returns the same shape it already builds internally:

```js
JARVIS.data.configure({ endpoint: 'https://api.yoursite.com/jarvis/metrics' });
```

The status chip flips from `local` to `live feed` when that is answering.

The page is static and cannot hold secrets, so put a small proxy in front — a Cloudflare
Worker, a Vercel function, an n8n webhook. It holds the keys, fans out to Stripe or
RevenueCat, App Store Connect, the TikTok API, and returns one merged payload.
**Never put an API key in this page.**

---

## Adding your own commands

A skill is an id, a matcher, and a function:

```js
JARVIS.skills.add({
  id: 'standup',
  match: /\b(standup|what should i do today)\b/i,
  run: function () {
    return {
      say: 'You have ' + JARVIS.store.queueOpen().length + ' posts queued and ' +
           JARVIS.data.get().needsYou.length + ' items needing you.',
      panel: 'queue'
    };
  }
}, true);              // true = ahead of the built-ins
```

First match wins, so specific skills sit above general ones — that's why the skills that
*log* revenue sit above the one that *reads* revenue back.

---

## Files

```
jarvis/
├── index.html              The HUD
├── jarvis-standalone.html  Everything inlined in one file (no mic — see above)
├── manifest.webmanifest    Makes it installable
├── sw.js                   Offline cache
├── start.command/.sh/.bat  Serve on localhost so the mic works
└── assets/
    ├── css/jarvis.css
    ├── img/                reactor.svg, icon-192/512/maskable.png
    └── js/
        ├── util.js         Formatting and number parsing
        ├── store.js        Your data. localStorage. ← start here
        ├── data.js         Derives the metrics from the store
        ├── voice.js        Wake word, recognition lifecycle, speech
        ├── skills.js       The command registry ← and here
        ├── core.js         Reactor canvas, mic meter, panel rendering
        └── app.js          Boot, wiring, settings, captions
```

`jarvis-standalone.html` is a **build** of the files under `assets/` — edit the sources and
regenerate it, don't edit it directly.

Accessibility: keyboard-operable throughout, visible focus rings, `aria-live` on the caption
and status regions, `prefers-reduced-motion` respected, no horizontal scroll to 320px.

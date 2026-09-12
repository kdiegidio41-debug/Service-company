# J.A.R.V.I.S. — voice operations console

A wake-word voice assistant and heads-up display for running an app and a content
operation. Say **"Hey Jarvis"**, ask how the app is doing, and it pulls up the numbers
and reads them back to you.

Open `jarvis/index.html` and it runs. No build step, no dependencies, no framework,
no API key, no server.

```bash
python3 -m http.server 8000
# → http://localhost:8000/jarvis/
```

Or skip all of that: **`jarvis-standalone.html`** is the entire app — HTML, CSS and all
seven scripts — inlined into one 100 KB file. Save it anywhere and double-click it. No
server, no folder structure, nothing to install. It's a build of the same source, so
edit the files under `assets/` and regenerate it rather than editing it directly.

---

## ⚠ What's real and what isn't

This matters more than anything else in this README, so it's first.

| Part | Status |
| --- | --- |
| Wake word, speech recognition, spoken replies | **Real.** Browser Web Speech API. |
| The HUD, reactor, panels, state machine | **Real.** |
| Content queue, ideas, reminders | **Real.** Saved to `localStorage`, survives refresh. |
| Hook and script generation | **Real, but template-based.** Offline, no model. |
| **Revenue, downloads, views, "handled" items** | **DEMO DATA.** Invented numbers. |

The metrics are fabricated so the HUD has something to show out of the box. The
status chip in the top bar reads **`demo data`** until you connect a real feed, and it
flips to **`live`** when you do. **Don't screenshot the demo numbers and present them as
your business.** Wire it up first — that's the next section.

---

## Wiring up real data

Everything Jarvis knows comes from one object. Point it at your own endpoint:

```js
// in the console, or at the bottom of assets/js/data.js
JARVIS.data.configure({
  endpoint: 'https://api.yoursite.com/jarvis/metrics',
  refreshMs: 5 * 60 * 1000
});
```

Your endpoint returns JSON in the shape that `buildDemo()` produces in
`assets/js/data.js`. The short version:

```jsonc
{
  "revenue": { "mrr": 23900, "last7": 5516, "delta7": 26.7, "series": [/* 14 numbers */], "arpu": 3.0 },
  "growth":  { "downloads7": 1837, "delta7": -7.6, "series": [/* 14 */],
               "activeUsers": 20400, "trialConversion": 7.0, "churn": 4.4 },
  "content": { "views7": 251900, "delta7": 98.7, "series": [/* 14 */],
               "posts7": 15, "followers": 46000,
               "platforms": [{ "name": "TikTok", "views": 146000, "tone": "" }],
               "top": { "hook": "...", "platform": "TikTok", "views": 78000, "saves": 1900 } },
  "handled":  [{ "kind": "ok",   "text": "Resolved 13 tickets", "when": "today" }],
  "needsYou": [{ "kind": "warn", "text": "App Store rejection",  "when": "waiting 1d" }]
}
```

`tone` picks a bar colour (`""`, `gold`, `violet`, `jade`). `kind` picks a feed icon
(`ok`, `warn`, `bad`).

**Where the real numbers come from.** The page is static and can't hold secrets, so put
a small proxy between it and the APIs that need keys — a Cloudflare Worker, a Vercel
function, an n8n or Make webhook. It fans out, merges, and returns the shape above:

| Feed | Source |
| --- | --- |
| Revenue, MRR, churn | RevenueCat, Stripe, or App Store Connect / Play Console |
| Downloads, active users | App Store Connect, Play Console, or your analytics |
| Content views, followers | TikTok Display API, Instagram Graph API, YouTube Data API |
| Handled / needs-you | Your support desk, CI, error tracker — anything with a webhook |

Never put an API key in this page. The proxy holds the keys; the page holds nothing.

---

## What you can say

Say `Hey Jarvis` then the command, or press **space** to skip the wake word entirely.
Everything also works typed — the command bar at the bottom takes the same phrasing, so
the whole thing is usable with no microphone at all.

**Briefing**
- *Brief me* — revenue, growth, content, what it handled, what needs you, in one pass
- *How's the app doing* · *What's the revenue* · *How are downloads*
- *How did content do* · *How's TikTok doing* · *What was the top post*

**Autonomy**
- *What did you handle* · *What needs me* · *Refresh the numbers*

**Content ops**
- *Queue a post about …* · *Schedule a TikTok about … tomorrow*
- *What's in the queue* · *Mark … as posted*
- *Give me hooks about …* · *Write a script about …*

**Memory**
- *Remember …* · *Remind me to …* · *What are my ideas*

**Keys** — `space` talk · `/` command line · `B` briefing · `M` mic · `esc` stop · `?` help

---

## Browser support

| | Wake word | Typed commands | Spoken replies |
| --- | --- | --- | --- |
| Chrome, Edge, Brave, Arc | ✅ | ✅ | ✅ |
| Safari | ❌ | ✅ | ✅ |
| Firefox | ❌ | ✅ | ✅ |

`SpeechRecognition` is Chromium-only. Everywhere else the HUD detects it, says so in the
mic chip, and falls back to the command line — nothing breaks, Jarvis just can't hear you.

Two things worth knowing:

- **Chrome's speech recognition is a cloud service.** Audio goes to Google while the mic
  is on. Nothing else on this page leaves your machine, but that part does.
- **Chrome kills recognition every ~60 seconds.** `voice.js` restarts it automatically
  with a backoff, which is what makes "always listening" actually stay on.

Recognition mishears "Jarvis" constantly, so the wake pattern also accepts *jarvice,
jervis, javis, charvis* and a few others. That's the difference between a demo that works
and one where you say the word nine times.

---

## Adding your own commands

A skill is three things: an id, a regex, and a function.

```js
JARVIS.skills.add({
  id: 'standup',
  match: /\b(standup|stand up|what should i do today)\b/i,
  run: function (m, line) {
    var q = JARVIS.store.queueOpen();
    return {
      say: 'You have ' + q.length + ' posts queued and ' +
           JARVIS.data.get().needsYou.length + ' things waiting on you.',
      panel: 'queue',        // flashes that panel
      toast: 'Standup'       // little confirmation
    };
  }
}, true);                    // true = put it first, ahead of the built-ins
```

Order matters — the first match wins. `JARVIS.skills.list` is the live array, in
priority order. The specific ones go above the general ones, which is why
*"queue a TikTok about X"* has to sit above the skill that matches `/tiktok/`.

**Want real generation instead of templates?** The hook and script skills call
`hooksFor()` in `assets/js/skills.js`. Swap that for a `fetch` to your own proxy in
front of a model API and return the text. Keep the key on the proxy, not in the page.

---

## Files

```
jarvis/
├── index.html              The HUD
├── jarvis-standalone.html  The whole thing in one file — save it, double-click it
└── assets/
    ├── css/jarvis.css      Tokens, panels, reactor, boot, help, responsive
    └── js/
        ├── util.js         Formatting — commas, compact, spoken numbers
        ├── data.js         Metrics. The demo feed + the live adapter ← start here
        ├── store.js        localStorage: queue, ideas, reminders, log
        ├── voice.js        Wake word, recognition lifecycle, speech synthesis
        ├── skills.js       The command registry ← and here
        ├── core.js         Reactor canvas, mic meter, panel rendering
        └── app.js          Boot, wiring, captions
```

Accessibility: keyboard-operable throughout, visible focus rings, `aria-live` on the
caption and status regions, `prefers-reduced-motion` respected (the reactor stops
spinning, the boot log dumps instantly, captions stop typing out), no horizontal scroll
down to 320px.

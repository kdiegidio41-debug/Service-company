/* =========================================================================
   JARVIS — data layer
   -------------------------------------------------------------------------
   Everything Jarvis knows about your business lives here.

   ⚠ THE NUMBERS BELOW ARE DEMO DATA. They are invented so the HUD has
   something to display out of the box. Nothing here is fetched from a real
   account until you wire it up — see `configure()` at the bottom and
   jarvis/README.md §"Wiring up real data".

   The shape is the contract. A real feed only has to return this shape.
   ========================================================================= */
window.JARVIS = window.JARVIS || {};

JARVIS.data = (function () {
  'use strict';

  /* --- 1. Product identity ---------------------------------------------- */
  /* Change these to your own product. Jarvis speaks the name out loud. */
  var PRODUCT = {
    name: 'the app',            // "How's the app doing?" → spoken back
    currency: '$',
    owner: ''                   // e.g. 'Noe' — used in greetings, blank is fine
  };

  /* --- 2. Demo feed ------------------------------------------------------ */
  /* Seeded pseudo-random so the same day gives the same numbers — the HUD
     doesn't reshuffle every refresh, which would look broken. */
  function seeded(seed) {
    var s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function dayIndex() {
    return Math.floor(Date.now() / 86400000);
  }

  /* A 14-day series that trends gently upward with believable noise. */
  function series(base, growth, noise, rnd, n) {
    var out = [], v = base;
    for (var i = 0; i < n; i++) {
      v = v * (1 + growth) * (1 + (rnd() - 0.5) * noise);
      out.push(Math.max(0, Math.round(v)));
    }
    return out;
  }

  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }

  function buildDemo() {
    var rnd = seeded(dayIndex() * 7919);

    var downloads = series(300, 0.012, 0.30, rnd, 14);
    var revenue   = series(560, 0.014, 0.26, rnd, 14);
    var views     = series(11000, 0.02, 0.55, rnd, 14);

    var last7 = function (a) { return a.slice(-7); };
    var prev7 = function (a) { return a.slice(-14, -7); };
    var delta = function (a) {
      var p = sum(prev7(a));
      if (!p) return 0;
      return ((sum(last7(a)) - p) / p) * 100;
    };

    var mrr = Math.round(sum(last7(revenue)) * 4.34 / 100) * 100;

    return {
      generatedAt: new Date().toISOString(),
      demo: true,

      revenue: {
        mrr: mrr,
        last7: sum(last7(revenue)),
        delta7: delta(revenue),
        series: revenue,
        arpu: +(sum(last7(revenue)) / Math.max(1, sum(last7(downloads)))).toFixed(2)
      },

      growth: {
        downloads7: sum(last7(downloads)),
        delta7: delta(downloads),
        series: downloads,
        activeUsers: 18400 + Math.round(rnd() * 2600),
        trialConversion: +(6.5 + rnd() * 3.2).toFixed(1),
        churn: +(3.1 + rnd() * 1.6).toFixed(1)
      },

      content: {
        views7: sum(last7(views)),
        delta7: delta(views),
        series: views,
        posts7: 11 + Math.floor(rnd() * 7),
        followers: 42800 + Math.round(rnd() * 5000),
        platforms: [
          { name: 'TikTok',    views: Math.round(sum(last7(views)) * 0.58), tone: '' },
          { name: 'Instagram', views: Math.round(sum(last7(views)) * 0.24), tone: 'gold' },
          { name: 'YouTube',   views: Math.round(sum(last7(views)) * 0.13), tone: 'violet' },
          { name: 'X',         views: Math.round(sum(last7(views)) * 0.05), tone: 'jade' }
        ],
        top: {
          hook: 'I let an AI run my app for 7 days',
          platform: 'TikTok',
          views: Math.round(sum(last7(views)) * 0.31),
          saves: 1840 + Math.round(rnd() * 900)
        }
      },

      /* Things Jarvis says it handled on its own. In demo mode these are
         illustrative. Wire real ones in via configure({ endpoint }). */
      handled: [
        { kind: 'ok',   text: 'Resolved 13 support tickets — 11 were the same iOS 18 sign-in bug.', when: 'today' },
        { kind: 'ok',   text: 'Replied to 38 comments across TikTok and Instagram.', when: 'today' },
        { kind: 'ok',   text: 'Scheduled tomorrow\'s post from the approved hook list.', when: '2h ago' },
        { kind: 'warn', text: 'Paused the Meta ad set — CPA crossed $14, your ceiling is $12.', when: '5h ago' },
        { kind: 'ok',   text: 'Refunded 2 duplicate charges and emailed both customers.', when: 'yesterday' }
      ],

      /* Things Jarvis wants a human decision on. */
      needsYou: [
        { kind: 'warn', text: 'App Store review 2.1 rejection — needs a screenshot swap before resubmit.', when: 'waiting 1d' },
        { kind: 'bad',  text: 'Stripe dispute on a $79 annual plan. Evidence due Friday.', when: 'due 3d' }
      ]
    };
  }

  /* --- 3. Content queue (real, persisted locally) ------------------------ */
  /* Unlike the metrics, this is genuinely yours — it saves to localStorage
     and survives refreshes. Jarvis adds to it when you tell it to. */
  var SEED_QUEUE = [
    { when: 'Today 6pm',  text: 'POV: the AI ships while you sleep', tag: 'TikTok' },
    { when: 'Tue 8am',    text: 'Teardown: what $4k MRR actually costs to run', tag: 'YouTube' },
    { when: 'Wed 7pm',    text: '3 prompts that replaced my whole support inbox', tag: 'Instagram' }
  ];

  /* --- 4. Live adapter --------------------------------------------------- */
  /* Point this at anything that returns the shape built by buildDemo():
     your own /api/metrics, a Cloudflare Worker that fans out to RevenueCat +
     App Store Connect + the TikTok API, an n8n webhook, a Google Sheet as
     JSON. Jarvis does not care, it just needs the shape. */
  var CONFIG = {
    endpoint: null,       // e.g. 'https://api.yoursite.com/jarvis/metrics'
    refreshMs: 5 * 60 * 1000
  };

  var current = buildDemo();
  var listeners = [];

  function emit() {
    listeners.forEach(function (fn) { fn(current); });
  }

  function refresh() {
    if (!CONFIG.endpoint) {
      current = buildDemo();
      emit();
      return Promise.resolve(current);
    }
    return fetch(CONFIG.endpoint, { headers: { accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (json) {
        json.demo = false;
        current = json;
        emit();
        return current;
      })
      .catch(function (err) {
        /* Never blank the HUD on a network blip — keep the last good data
           and let the caller decide whether to announce the failure. */
        if (window.console) console.warn('[jarvis] metrics fetch failed:', err.message);
        throw err;
      });
  }

  return {
    product: PRODUCT,
    seedQueue: SEED_QUEUE,
    get: function () { return current; },
    isDemo: function () { return !!current.demo; },
    onUpdate: function (fn) { listeners.push(fn); },
    refresh: refresh,
    configure: function (opts) {
      for (var k in opts) if (Object.prototype.hasOwnProperty.call(opts, k)) CONFIG[k] = opts[k];
      if (CONFIG.endpoint) refresh().catch(function () {});
    },
    /* exposed for tests / console poking */
    _buildDemo: buildDemo
  };
})();

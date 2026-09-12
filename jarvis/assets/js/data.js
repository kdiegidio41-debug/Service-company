/* =========================================================================
   JARVIS — metrics
   -------------------------------------------------------------------------
   Every number on the HUD is derived from JARVIS.store — your own logged
   entries. Nothing is generated, estimated or filled in. An empty store
   reads zero, and zero is the truth until you log something.

   Later, when you connect real sources (Stripe, App Store Connect, the
   TikTok API), point `configure({ endpoint })` at a proxy that returns the
   same shape and it takes over. See jarvis/README.md.
   ========================================================================= */
window.JARVIS = window.JARVIS || {};

JARVIS.data = (function () {
  'use strict';

  var S = JARVIS.store;

  var CONFIG = {
    endpoint: null,
    refreshMs: 5 * 60 * 1000
  };

  var listeners = [];
  var current = null;
  var live = null;          // last payload from a real endpoint, if any

  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }

  /* Percentage change, guarding the zero case: going 0 → something is not
     "infinity percent", it's just new. */
  function delta(now, before) {
    /* null means "no prior week to compare against" — reporting +100% for
       the first week of data would be inventing a comparison. */
    if (!before) return now > 0 ? null : 0;
    return ((now - before) / before) * 100;
  }

  /* A 14-day window, oldest first, so the sparklines have a real axis. */
  function window14() {
    var days = [];
    for (var i = 13; i >= 0; i--) {
      var key = S.dayKey(i);
      var e = S.get().entries[key];
      days.push({
        key: key,
        revenue: e ? e.revenue : 0,
        downloads: e ? e.downloads : 0,
        views: e ? sum(Object.keys(e.views).map(function (p) { return e.views[p]; })) : 0,
        byPlatform: e ? e.views : {}
      });
    }
    return days;
  }

  function build() {
    var st = S.get();
    var p = st.profile;
    var days = window14();

    var last7 = days.slice(7);
    var prev7 = days.slice(0, 7);
    var pull = function (arr, f) { return sum(arr.map(function (d) { return d[f]; })); };

    var rev7 = pull(last7, 'revenue');
    var revPrev = pull(prev7, 'revenue');
    var dl7 = pull(last7, 'downloads');
    var dlPrev = pull(prev7, 'downloads');
    var views7 = pull(last7, 'views');
    var viewsPrev = pull(prev7, 'views');

    /* Per-platform totals across the last 7 days only. */
    var tones = { TikTok: '', Instagram: 'gold', YouTube: 'violet', X: 'jade' };
    var platforms = S.PLATFORMS.map(function (name) {
      var v = sum(last7.map(function (d) { return d.byPlatform[name] || 0; }));
      return { name: name, views: v, tone: tones[name] || '' };
    });

    var weekAgo = Date.now() - 7 * 86400000;
    var recentPosts = st.posts.filter(function (x) { return x.at >= weekAgo; });
    var top = st.posts.slice().sort(function (a, b) { return b.views - a.views; })[0] || null;

    return {
      generatedAt: new Date().toISOString(),
      demo: false,
      empty: rev7 === 0 && dl7 === 0 && views7 === 0 && !st.posts.length,

      revenue: {
        mrr: p.mrr,
        last7: rev7,
        delta7: delta(rev7, revPrev),
        series: days.map(function (d) { return d.revenue; }),
        arpu: dl7 ? Math.round((rev7 / dl7) * 100) / 100 : 0
      },

      growth: {
        downloads7: dl7,
        delta7: delta(dl7, dlPrev),
        series: days.map(function (d) { return d.downloads; }),
        activeUsers: p.activeUsers,
        trialConversion: p.trialConversion,
        churn: p.churn
      },

      content: {
        views7: views7,
        delta7: delta(views7, viewsPrev),
        series: days.map(function (d) { return d.views; }),
        posts7: recentPosts.length,
        followers: p.followers,
        platforms: platforms,
        top: top
      },

      handled: st.handled.map(function (h) {
        return { kind: h.kind, text: h.text, when: h.at };
      }),
      needsYou: st.needsYou.map(function (n) {
        return { kind: n.kind, text: n.text, when: n.due || n.at };
      })
    };
  }

  function recompute() {
    current = live || build();
    listeners.forEach(function (fn) { fn(current); });
    return current;
  }

  /* Recompute whenever anything is logged, so the HUD is never stale. */
  S.onChange(function () { if (!live) recompute(); });
  current = build();

  function refresh() {
    if (!CONFIG.endpoint) { live = null; return Promise.resolve(recompute()); }
    return fetch(CONFIG.endpoint, { headers: { accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (json) {
        json.demo = false;
        live = json;
        return recompute();
      })
      .catch(function (err) {
        if (window.console) console.warn('[jarvis] metrics fetch failed:', err.message);
        throw err;                       // keep the last good view on screen
      });
  }

  return {
    get product() { return S.profile(); },
    get: function () { return current; },
    isLive: function () { return !!live; },
    isEmpty: function () { return !!current.empty; },
    onUpdate: function (fn) { listeners.push(fn); },
    refresh: refresh,
    recompute: recompute,
    configure: function (opts) {
      for (var k in opts) {
        if (Object.prototype.hasOwnProperty.call(opts, k)) CONFIG[k] = opts[k];
      }
      if (CONFIG.endpoint) refresh().catch(function () {});
    }
  };
})();

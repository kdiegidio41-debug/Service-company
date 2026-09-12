/* =========================================================================
   JARVIS — thinking agents, client side
   -------------------------------------------------------------------------
   Posts a task and your current figures to the proxy's /agent endpoint. The
   proxy holds the Anthropic key and does the call.

   These cost money per run, so nothing here fires on a timer or on boot.
   Every call is one you asked for out loud or with a button.
   ========================================================================= */
window.JARVIS = window.JARVIS || {};

JARVIS.brain = (function () {
  'use strict';

  function endpoint() {
    var cfg = JARVIS.data.config();
    if (!cfg.endpoint) return null;
    /* /metrics and /agent sit side by side on the proxy. */
    return cfg.endpoint.replace(/\/metrics\/?$/, '') .replace(/\/$/, '') + '/agent';
  }

  function available() { return !!endpoint(); }

  /* Only the figures — no notes, no queue text, nothing personal that the
     task doesn't need. Keeps the payload small and the surface narrow. */
  function snapshot() {
    var d = JARVIS.data.get();
    var p = JARVIS.store.profile();
    return {
      product: p.name,
      currency: p.currency,
      revenue: {
        last7: d.revenue.last7,
        changePercent: d.revenue.delta7,
        mrr: d.revenue.mrr,
        perDownload: d.revenue.arpu
      },
      growth: {
        downloads7: d.growth.downloads7,
        changePercent: d.growth.delta7,
        activeUsers: d.growth.activeUsers,
        trialConversionPercent: d.growth.trialConversion,
        churnPercent: d.growth.churn
      },
      content: {
        views7: d.content.views7,
        changePercent: d.content.delta7,
        postsThisWeek: d.content.posts7,
        followers: d.content.followers,
        byPlatform: d.content.platforms.map(function (x) {
          return { platform: x.name, views: x.views };
        }),
        topPost: d.content.top ? {
          hook: d.content.top.hook,
          platform: d.content.top.platform,
          views: d.content.top.views
        } : null
      },
      openItems: d.needsYou.map(function (n) { return n.text; }),
      note: 'A zero means nothing was logged, not that the real figure is zero.'
    };
  }

  function ask(task, topic) {
    var url = endpoint();
    if (!url) {
      return Promise.reject(new Error('No proxy connected. Open the data panel and connect one.'));
    }
    var headers = { 'Content-Type': 'application/json' };
    var cfg = JARVIS.data.config();
    if (cfg.token) headers.Authorization = 'Bearer ' + cfg.token;

    return fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ task: task, context: snapshot(), topic: topic || '' })
    }).then(function (r) {
      return r.json().then(function (body) {
        if (!r.ok || body.error) throw new Error(body.error || ('HTTP ' + r.status));
        return body;
      });
    });
  }

  return { ask: ask, available: available, snapshot: snapshot };
})();

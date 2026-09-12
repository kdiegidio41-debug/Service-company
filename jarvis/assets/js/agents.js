/* =========================================================================
   JARVIS — agents
   -------------------------------------------------------------------------
   Two kinds, and the difference matters:

   WATCHERS run here, in your browser, over your own logged data. No key, no
   network, no cost. They don't guess — every finding names the numbers it
   came from, and clears itself when it stops being true.

   THINKERS call Claude through the proxy in server/. They reason about your
   numbers and write things. They need an API key, which lives on the proxy,
   and they cost money per run. Nothing calls one unless you ask.

   A watcher must never state something it cannot derive from the store. If
   there is no data, the honest finding is "nothing logged", not a guess.
   ========================================================================= */
window.JARVIS = window.JARVIS || {};

JARVIS.agents = (function () {
  'use strict';

  var U = JARVIS.util;
  var S = JARVIS.store;
  var DAY = 86400000;

  var LIST = [];

  function register(def) { LIST.push(def); }

  /* --- shared helpers ---------------------------------------------------- */

  /* How many days since anything at all was logged. null = never. */
  function daysSinceEntry() {
    var keys = Object.keys(S.get().entries);
    if (!keys.length) return null;
    var newest = null;
    keys.forEach(function (k) {
      var e = S.get().entries[k];
      var any = e.revenue || e.downloads ||
                Object.keys(e.views).some(function (p) { return e.views[p]; });
      if (!any) return;
      var t = new Date(k + 'T12:00:00').getTime();
      if (newest === null || t > newest) newest = t;
    });
    if (newest === null) return null;
    return Math.floor((Date.now() - newest) / DAY);
  }

  function money(n) { return U.money(n, S.profile().currency || '$'); }

  /* =====================================================================
     Watchers
   * ===================================================================== */

  register({
    id: 'cadence',
    name: 'Logging cadence',
    desc: 'Tells you when the numbers have gone stale. Untracked weeks are how this stops being useful.',
    run: function () {
      var d = daysSinceEntry();
      if (d === null) return [];          // nothing ever logged — the empty state already says so
      if (d < 3) return [];
      return [{
        key: 'stale',
        kind: d >= 7 ? 'bad' : 'warn',
        text: 'Nothing logged for ' + d + ' days. Every figure on the console is ' +
              d + ' days old.'
      }];
    }
  });

  register({
    id: 'revenue-drop',
    name: 'Revenue watch',
    desc: 'Flags a week-over-week fall of more than 25%, and only when there is a prior week to compare.',
    run: function () {
      var r = JARVIS.data.get().revenue;
      if (r.delta7 === null || r.delta7 === undefined) return [];   // no prior week
      if (r.delta7 >= -25) return [];
      return [{
        key: 'drop',
        kind: r.delta7 <= -50 ? 'bad' : 'warn',
        text: 'Revenue is down ' + Math.abs(r.delta7).toFixed(0) + '% week over week — ' +
              money(r.last7) + ' across the last seven days.'
      }];
    }
  });

  register({
    id: 'dry-spell',
    name: 'Dry spell',
    desc: 'Counts consecutive zero-revenue days, but only for someone who has taken money before.',
    run: function () {
      var st = S.get();
      var everPaid = Object.keys(st.entries).some(function (k) { return st.entries[k].revenue > 0; });
      if (!everPaid) return [];

      var run = 0;
      for (var i = 0; i < 14; i++) {
        var e = st.entries[S.dayKey(i)];
        if (e && e.revenue > 0) break;
        run++;
      }
      if (run < 4) return [];
      return [{
        key: 'dry',
        kind: run >= 7 ? 'bad' : 'warn',
        text: run + ' days without a sale.'
      }];
    }
  });

  register({
    id: 'queue-depth',
    name: 'Queue depth',
    desc: 'Watches the posting queue for an empty shelf.',
    run: function () {
      var open = S.queueOpen().length;
      if (open >= 2) return [];
      return [{
        key: 'thin',
        kind: open === 0 ? 'warn' : 'ok',
        text: open === 0
          ? 'The posting queue is empty.'
          : 'Only one post left in the queue.'
      }];
    }
  });

  register({
    id: 'posting-gap',
    name: 'Posting gap',
    desc: 'How long since you recorded publishing anything.',
    run: function () {
      var posts = S.posts();
      if (!posts.length) return [];
      var days = Math.floor((Date.now() - posts[0].at) / DAY);
      if (days < 5) return [];
      return [{
        key: 'gap',
        kind: days >= 10 ? 'bad' : 'warn',
        text: 'No post recorded in ' + days + ' days. Last was "' + posts[0].hook + '".'
      }];
    }
  });

  register({
    id: 'stale-items',
    name: 'Stale items',
    desc: 'Surfaces your own flags once they have been sitting for a week.',
    run: function () {
      /* Only items you raised — an agent chasing its own findings would be
         a loop, not a feature. */
      var mine = S.needsYou().filter(function (n) { return !n.by; });
      return mine.filter(function (n) {
        return (Date.now() - n.at) / DAY >= 7;
      }).map(function (n) {
        var days = Math.floor((Date.now() - n.at) / DAY);
        return {
          key: 'stale:' + n.id,
          kind: 'warn',
          text: 'Open ' + days + ' days: ' + n.text
        };
      });
    }
  });

  register({
    id: 'pace',
    name: 'Monthly pace',
    desc: 'Projects the month from the last seven days. Needs a monthly goal to say anything.',
    run: function () {
      var goal = S.profile().goalMonthly;
      if (!goal) return [];
      var r = JARVIS.data.get().revenue;
      if (!r.last7) return [];

      var projected = (r.last7 / 7) * 30;
      var ratio = projected / goal;
      if (ratio >= 0.9) return [];
      return [{
        key: 'behind',
        kind: ratio < 0.6 ? 'bad' : 'warn',
        text: 'At the last seven days\' pace you land near ' + money(projected) +
              ' this month, against a ' + money(goal) + ' goal.'
      }];
    }
  });

  /* =====================================================================
     Runtime
   * ===================================================================== */

  function list() {
    return LIST.map(function (a) {
      return { id: a.id, name: a.name, desc: a.desc, enabled: S.agentEnabled(a.id) };
    });
  }

  function runAll() {
    var report = { ran: 0, found: 0, added: 0, cleared: 0, errors: [] };

    LIST.forEach(function (a) {
      if (!S.agentEnabled(a.id)) {
        /* A disabled agent keeps no findings. */
        S.syncAgentFindings(a.id, []);
        return;
      }
      var findings;
      try {
        findings = a.run() || [];
      } catch (e) {
        report.errors.push(a.name + ': ' + e.message);
        return;
      }
      var res = S.syncAgentFindings(a.id, findings);
      report.ran++;
      report.found += res.total;
      report.added += res.added;
      report.cleared += res.cleared;
    });

    S.agentsRunAt(Date.now());
    JARVIS.data.recompute();
    return report;
  }

  /* Spoken summary of a run — says what changed, not just that it ran. */
  function describe(report) {
    if (report.errors.length) {
      return 'Agents ran with ' + report.errors.length + ' error' +
             (report.errors.length === 1 ? '' : 's') + '. ' + report.errors[0];
    }
    if (!report.found && !report.cleared) {
      return 'All ' + report.ran + ' watchers ran. Nothing needs your attention.';
    }
    var parts = [];
    if (report.added) parts.push(report.added + ' new ' + (report.added === 1 ? 'finding' : 'findings'));
    if (report.cleared) parts.push(report.cleared + ' cleared');
    var carried = report.found - report.added;
    if (carried > 0) parts.push(carried + ' still open');
    return 'Agents ran. ' + parts.join(', ') + '.';
  }

  return {
    register: register,
    list: list,
    runAll: runAll,
    describe: describe,
    lastRun: function () { return S.agentsRunAt(); }
  };
})();

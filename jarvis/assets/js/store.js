/* =========================================================================
   JARVIS — store
   -------------------------------------------------------------------------
   This is your data. All of it. It lives in this browser (localStorage),
   it starts empty, and nothing in here is invented — every number got
   there because you put it there.

   Shape:
     profile    { name, currency, owner, mrr, followers, activeUsers,
                  trialConversion, churn }
     entries    { 'YYYY-MM-DD': { revenue, downloads, views: {platform: n} } }
     posts      [ { id, hook, platform, views, saves, at } ]
     handled    [ { id, text, kind, at } ]      things dealt with
     needsYou   [ { id, text, kind, at, due } ] things waiting on you
     queue      [ { id, when, text, tag, done } ]
     ideas / reminders / log
   ========================================================================= */
window.JARVIS = window.JARVIS || {};

JARVIS.store = (function () {
  'use strict';

  var KEY = 'jarvis.v2';
  var OLD_KEY = 'jarvis.v1';

  var PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'X'];

  function blank() {
    return {
      v: 2,
      profile: {
        name: 'the app',
        currency: '$',
        owner: '',
        mrr: 0,
        followers: 0,
        activeUsers: 0,
        trialConversion: 0,
        churn: 0
      },
      entries: {},
      posts: [],
      handled: [],
      needsYou: [],
      queue: [],
      ideas: [],
      reminders: [],
      log: [],
      voiceName: null
    };
  }

  var state;
  var listeners = [];

  function emit() { listeners.forEach(function (fn) { fn(state); }); }

  function id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' +
           ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
           ('0' + d.getDate()).slice(-2);
  }

  function dayKey(offset) {
    var d = new Date();
    d.setDate(d.getDate() - (offset || 0));
    return d.getFullYear() + '-' +
           ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
           ('0' + d.getDate()).slice(-2);
  }

  function load() {
    var base = blank();
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        for (var k in base) {
          if (!Object.prototype.hasOwnProperty.call(parsed, k)) parsed[k] = base[k];
        }
        /* Profile gains fields over time; backfill without clobbering. */
        for (var pk in base.profile) {
          if (parsed.profile[pk] === undefined) parsed.profile[pk] = base.profile[pk];
        }
        return parsed;
      }
      /* Carry over the lists from the old demo build — those were real work.
         The old build had no metrics worth migrating. */
      var old = localStorage.getItem(OLD_KEY);
      if (old) {
        var o = JSON.parse(old);
        base.queue = (o.queue || []).filter(function (q) { return !q.sample; });
        base.ideas = o.ideas || [];
        base.reminders = o.reminders || [];
      }
    } catch (e) { /* private mode, corrupt json — start clean */ }
    return base;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      if (window.console) console.warn('[jarvis] could not save:', e.message);
    }
    emit();
  }

  state = load();

  /* --- entries ---------------------------------------------------------- */
  function entry(dateKey) {
    var k = dateKey || today();
    if (!state.entries[k]) state.entries[k] = { revenue: 0, downloads: 0, views: {} };
    return state.entries[k];
  }

  return {
    PLATFORMS: PLATFORMS,
    get: function () { return state; },
    onChange: function (fn) { listeners.push(fn); },
    today: today,
    dayKey: dayKey,

    /* --- profile -------------------------------------------------------- */
    setProfile: function (patch) {
      for (var k in patch) {
        if (Object.prototype.hasOwnProperty.call(patch, k)) state.profile[k] = patch[k];
      }
      save();
      return state.profile;
    },
    profile: function () { return state.profile; },

    /* --- logging numbers ------------------------------------------------ */
    addRevenue: function (amount, dateKey) {
      var e = entry(dateKey);
      e.revenue = Math.round((e.revenue + amount) * 100) / 100;
      save();
      return e.revenue;
    },
    addDownloads: function (n, dateKey) {
      var e = entry(dateKey);
      e.downloads += n;
      save();
      return e.downloads;
    },
    addViews: function (n, platform, dateKey) {
      var e = entry(dateKey);
      var p = platform || 'TikTok';
      e.views[p] = (e.views[p] || 0) + n;
      save();
      return e.views[p];
    },
    setEntry: function (dateKey, patch) {
      var e = entry(dateKey);
      if (patch.revenue !== undefined) e.revenue = patch.revenue;
      if (patch.downloads !== undefined) e.downloads = patch.downloads;
      if (patch.views) {
        for (var p in patch.views) e.views[p] = patch.views[p];
      }
      save();
      return e;
    },
    entry: function (dateKey) { return state.entries[dateKey || today()] || null; },

    /* --- posts ---------------------------------------------------------- */
    postAdd: function (hook, platform, views, saves) {
      var p = {
        id: id(), hook: hook, platform: platform || 'TikTok',
        views: views || 0, saves: saves || 0, at: Date.now()
      };
      state.posts.unshift(p);
      save();
      return p;
    },
    posts: function () { return state.posts; },

    /* --- handled / needs you -------------------------------------------- */
    handledAdd: function (text, kind) {
      var h = { id: id(), text: text, kind: kind || 'ok', at: Date.now() };
      state.handled.unshift(h);
      if (state.handled.length > 40) state.handled.length = 40;
      save();
      return h;
    },
    handled: function () { return state.handled; },

    needsAdd: function (text, kind, due) {
      var n = { id: id(), text: text, kind: kind || 'warn', at: Date.now(), due: due || '' };
      state.needsYou.unshift(n);
      save();
      return n;
    },
    needsResolve: function (match) {
      var hit = state.needsYou.filter(function (n) {
        return !match || n.text.toLowerCase().indexOf(match.toLowerCase()) > -1;
      })[0];
      if (!hit) return null;
      state.needsYou = state.needsYou.filter(function (n) { return n.id !== hit.id; });
      state.handled.unshift({ id: id(), text: hit.text, kind: 'ok', at: Date.now() });
      save();
      return hit;
    },
    needsYou: function () { return state.needsYou; },

    /* --- content queue -------------------------------------------------- */
    queueAdd: function (text, when, tag) {
      var item = { id: id(), when: when || 'Unscheduled', text: text, tag: tag || 'Draft', done: false };
      state.queue.push(item);
      save();
      return item;
    },
    queueDone: function (match) {
      var hit = state.queue.filter(function (q) {
        return !q.done && (!match || q.text.toLowerCase().indexOf(match.toLowerCase()) > -1);
      })[0];
      if (!hit) return null;
      hit.done = true;
      save();
      return hit;
    },
    queueOpen: function () {
      return state.queue.filter(function (q) { return !q.done; });
    },

    /* --- notes ---------------------------------------------------------- */
    ideaAdd: function (text) {
      var item = { id: id(), text: text, at: Date.now() };
      state.ideas.unshift(item);
      save();
      return item;
    },
    ideas: function () { return state.ideas; },

    remindAdd: function (text, fireAt) {
      var item = { id: id(), text: text, at: Date.now(), fireAt: fireAt || null };
      state.reminders.unshift(item);
      save();
      return item;
    },
    reminders: function () { return state.reminders; },

    logAdd: function (text, kind) {
      state.log.unshift({ id: id(), text: text, at: Date.now(), kind: kind || 'ok' });
      if (state.log.length > 60) state.log.length = 60;
      save();
    },
    log: function () { return state.log; },

    setVoice: function (name) { state.voiceName = name; save(); },

    /* --- your data, portable -------------------------------------------- */
    exportJSON: function () { return JSON.stringify(state, null, 2); },
    importJSON: function (text) {
      var parsed = JSON.parse(text);           // throws on bad input — caller catches
      if (!parsed || typeof parsed !== 'object') throw new Error('Not a Jarvis backup.');
      var base = blank();
      for (var k in base) {
        if (!Object.prototype.hasOwnProperty.call(parsed, k)) parsed[k] = base[k];
      }
      state = parsed;
      save();
      return state;
    },
    wipe: function () { state = blank(); save(); }
  };
})();

/* =========================================================================
   JARVIS — local store
   -------------------------------------------------------------------------
   The parts of Jarvis that are genuinely yours and genuinely persist:
   the content queue, your idea list, reminders, and the log of what you
   asked it to do. All localStorage, all offline, no account.
   ========================================================================= */
window.JARVIS = window.JARVIS || {};

JARVIS.store = (function () {
  'use strict';

  var KEY = 'jarvis.v1';

  var blank = {
    queue:     [],   // { id, when, text, tag, done }
    ideas:     [],   // { id, text, at }
    reminders: [],   // { id, text, at, fireAt }
    log:       [],   // { id, text, at, kind }
    seeded:    false
  };

  var state;

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(blank));
      var parsed = JSON.parse(raw);
      /* Merge forward so an older saved state doesn't break a newer build. */
      for (var k in blank) {
        if (!Object.prototype.hasOwnProperty.call(parsed, k)) parsed[k] = blank[k];
      }
      return parsed;
    } catch (e) {
      return JSON.parse(JSON.stringify(blank));
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* Private mode / quota. Jarvis keeps working for this session only. */
      if (window.console) console.warn('[jarvis] could not save:', e.message);
    }
    emit();
  }

  var listeners = [];
  function emit() { listeners.forEach(function (fn) { fn(state); }); }

  function id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  state = load();

  /* First run: drop the sample queue in so the panel isn't empty, and mark
     it so we never re-seed over the user's own items. */
  function seed(items) {
    if (state.seeded) return;
    state.seeded = true;
    items.forEach(function (it) {
      state.queue.push({ id: id(), when: it.when, text: it.text, tag: it.tag, done: false, sample: true });
    });
    save();
  }

  return {
    get: function () { return state; },
    onChange: function (fn) { listeners.push(fn); },
    seed: seed,

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
    queueClear: function () {
      state.queue = [];
      save();
    },

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
    remindClear: function (id2) {
      state.reminders = state.reminders.filter(function (r) { return r.id !== id2; });
      save();
    },

    logAdd: function (text, kind) {
      state.log.unshift({ id: id(), text: text, at: Date.now(), kind: kind || 'ok' });
      if (state.log.length > 60) state.log.length = 60;
      save();
    },
    log: function () { return state.log; },

    wipe: function () {
      state = JSON.parse(JSON.stringify(blank));
      save();
    }
  };
})();

/* =========================================================================
   JARVIS — voice
   -------------------------------------------------------------------------
   ears   — SpeechRecognition, always-on, listening for the wake word
   mouth  — SpeechSynthesis, tuned for a measured, professional delivery

   THE MIC RULE, because it trips everyone up once:
   speech recognition needs a SECURE CONTEXT. That means https:// or
   http://localhost. It does NOT work from a file:// page, and it does not
   work inside an embedded frame that wasn't granted microphone permission.
   `diagnose()` below reports exactly which of those is biting, so the HUD
   can tell you the fix instead of shrugging.
   ========================================================================= */
window.JARVIS = window.JARVIS || {};

JARVIS.voice = (function () {
  'use strict';

  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var synth = window.speechSynthesis;

  var WAKE = /\b(hey |ok |okay |yo )?(jarvis|jarvice|jarviz|jervis|charvis|javis|service)\b/i;

  var state = {
    supported: !!SR,
    listening: false,
    awake: false,
    speaking: false,
    muted: false,
    denied: false
  };

  var rec = null;
  var handlers = {};
  var wakeTimer = null;
  var restartDelay = 400;
  var wantListening = false;

  function on(name, fn) { handlers[name] = fn; }
  function fire(name, a, b) { if (handlers[name]) handlers[name](a, b); }

  /* --- Why isn't the mic working? --------------------------------------- */
  function diagnose() {
    if (!SR) {
      return {
        ok: false, code: 'unsupported',
        short: 'voice n/a',
        message: 'This browser has no speech recognition. Chrome, Edge, Brave or Arc.',
        fix: 'Open Jarvis in Chrome or Edge.'
      };
    }
    if (!window.isSecureContext) {
      var isFile = location.protocol === 'file:';
      return {
        ok: false, code: isFile ? 'file' : 'insecure',
        short: 'needs https',
        message: isFile
          ? 'Opened as a file:// page. Speech recognition refuses to run there.'
          : 'This page is not a secure context, so the mic is blocked.',
        fix: 'Serve it over http://localhost or https, then install it as an app.'
      };
    }
    if (window.self !== window.top) {
      return {
        ok: false, code: 'iframe',
        short: 'mic blocked',
        message: 'Jarvis is running inside an embedded frame that was not granted the microphone.',
        fix: 'Open Jarvis in its own tab, or install it, to use the wake word.'
      };
    }
    if (state.denied) {
      return {
        ok: false, code: 'denied',
        short: 'mic blocked',
        message: 'The microphone permission was denied for this site.',
        fix: 'Click the padlock in the address bar, allow the microphone, then reload.'
      };
    }
    return { ok: true, code: 'ok', short: 'ready', message: '', fix: '' };
  }

  /* --- Ears -------------------------------------------------------------- */
  function build() {
    if (!SR) return null;
    var r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-US';
    r.maxAlternatives = 1;

    r.onstart = function () {
      state.listening = true;
      restartDelay = 400;
      fire('state', state);
    };

    r.onresult = function (e) {
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var res = e.results[i];
        var text = (res[0] && res[0].transcript || '').trim();
        if (!text) continue;

        if (!res.isFinal) {
          fire('interim', text, state.awake);
          if (!state.awake && WAKE.test(text)) wake(text);
          continue;
        }

        fire('final', text, state.awake);

        if (state.awake) {
          var cmd = strip(text);
          if (cmd) { sleep(); fire('command', cmd); }
          continue;
        }

        if (WAKE.test(text)) {
          wake(text);
          var tail = strip(text);
          if (tail) { sleep(); fire('command', tail); }
        }
      }
    };

    r.onerror = function (e) {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        state.denied = true;
        wantListening = false;
        fire('error', diagnose());
      } else if (e.error === 'no-speech' || e.error === 'aborted') {
        /* Normal on a quiet room. Ignore. */
      } else if (e.error === 'network') {
        fire('error', {
          ok: false, code: 'network', short: 'offline',
          message: 'Speech recognition could not reach its service.',
          fix: 'Recognition needs a connection, even though the rest of Jarvis does not.'
        });
      }
      fire('state', state);
    };

    r.onend = function () {
      state.listening = false;
      fire('state', state);
      /* Chrome ends recognition every ~60s and after each pause. Restart it
         while the user still wants it on, backing off if it keeps dying. */
      if (wantListening && !state.speaking) {
        setTimeout(function () {
          if (wantListening && !state.speaking) start();
        }, restartDelay);
        restartDelay = Math.min(restartDelay * 1.6, 6000);
      }
    };

    return r;
  }

  function strip(text) {
    var out = text.replace(WAKE, ' ');
    out = out.replace(/^[\s,.!?-]+/, '');
    out = out.replace(/^(please|can you|could you|would you|i want you to|i need you to)\s+/i, '');
    return out.trim();
  }

  function wake(heard) {
    state.awake = true;
    fire('state', state);
    fire('wake', heard);
    clearTimeout(wakeTimer);
    wakeTimer = setTimeout(function () {
      if (state.awake) { sleep(); fire('timeout'); }
    }, 9000);
  }

  function sleep() {
    clearTimeout(wakeTimer);
    state.awake = false;
    fire('state', state);
  }

  function start() {
    if (!SR || state.listening) return;
    if (!rec) rec = build();
    try {
      rec.start();
      wantListening = true;
    } catch (e) { /* already running */ }
  }

  function stop() {
    wantListening = false;
    sleep();
    if (rec) { try { rec.abort(); } catch (e) {} }
    state.listening = false;
    fire('state', state);
  }

  /* --- Mouth ------------------------------------------------------------- */
  var voice = null;
  var preferred = null;          // an explicit choice, remembered

  /* Ranked by how close each gets to a composed, briefing-room delivery.
     The Microsoft "Natural" and Google neural voices are a different class
     from the old formant voices — worth reaching for first. */
  var RANK = [
    /natural.*\b(ryan|thomas|george|christopher|guy|brian)\b/i,
    /\b(ryan|thomas|george|christopher|guy|brian)\b.*natural/i,
    /natural/i,
    /google uk english male/i,
    /^daniel/i, /\barthur\b/i, /\boliver\b/i,
    /microsoft (ryan|george|guy)/i,
    /google us english/i,
    /\balex\b/i
  ];

  function score(v) {
    for (var i = 0; i < RANK.length; i++) if (RANK[i].test(v.name)) return i;
    return RANK.length + (/^en-GB/i.test(v.lang) ? 0 : 1);
  }

  function pickVoice() {
    if (!synth) return;
    var all = synth.getVoices().filter(function (v) { return /^en/i.test(v.lang); });
    if (!all.length) return;

    if (preferred) {
      var exact = all.filter(function (v) { return v.name === preferred; })[0];
      if (exact) { voice = exact; return; }
    }
    voice = all.slice().sort(function (a, b) { return score(a) - score(b); })[0];
  }

  if (synth) {
    pickVoice();
    synth.addEventListener('voiceschanged', pickVoice);
  }

  /* Chrome silently truncates a long utterance at roughly fifteen seconds.
     Splitting on sentence boundaries dodges that, and the small gap between
     chunks is exactly the beat a person leaves between sentences — so it
     fixes the cutoff and improves the delivery at the same time. */
  function chunk(text) {
    var parts = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
    var out = [], buf = '';
    parts.forEach(function (s) {
      if ((buf + s).length > 170 && buf) { out.push(buf.trim()); buf = s; }
      else buf += s;
    });
    if (buf.trim()) out.push(buf.trim());
    return out;
  }

  var TUNE = { rate: 0.97, pitch: 0.9 };

  function say(text, opts) {
    opts = opts || {};
    fire('say', text);

    if (!synth || state.muted) {
      var ms = Math.min(12000, 400 + text.length * 46);
      state.speaking = true; fire('state', state);
      setTimeout(function () {
        state.speaking = false; fire('state', state); fire('said', text);
        if (opts.then) opts.then();
      }, ms);
      return;
    }

    var wasListening = wantListening;
    if (wasListening) stop();              // never let it answer its own voice

    synth.cancel();

    var parts = chunk(text);
    var i = 0;
    var finished = false;

    function done() {
      if (finished) return;
      finished = true;
      state.speaking = false;
      fire('state', state);
      fire('said', text);
      if (wasListening) setTimeout(start, 320);
      if (opts.then) opts.then();
    }

    function next() {
      if (i >= parts.length) { done(); return; }
      var u = new SpeechSynthesisUtterance(parts[i++]);
      if (voice) { u.voice = voice; u.lang = voice.lang; }
      u.rate = opts.rate || TUNE.rate;
      u.pitch = opts.pitch || TUNE.pitch;
      u.volume = 1;
      u.onstart = function () {
        if (!state.speaking) { state.speaking = true; fire('state', state); }
      };
      u.onend = next;
      u.onerror = function () { done(); };
      synth.speak(u);
    }

    state.speaking = true;
    fire('state', state);
    next();
  }

  function shutUp() {
    if (synth) synth.cancel();
    state.speaking = false;
    fire('state', state);
  }

  return {
    state: state,
    on: on,
    start: start,
    stop: stop,
    sleep: sleep,
    forceWake: function () { wake(''); },
    say: say,
    shutUp: shutUp,
    diagnose: diagnose,
    setMuted: function (m) { state.muted = m; if (m) shutUp(); fire('state', state); },
    tune: function (t) {
      if (t.rate !== undefined) TUNE.rate = t.rate;
      if (t.pitch !== undefined) TUNE.pitch = t.pitch;
    },
    getTune: function () { return { rate: TUNE.rate, pitch: TUNE.pitch }; },
    voices: function () {
      if (!synth) return [];
      return synth.getVoices()
        .filter(function (v) { return /^en/i.test(v.lang); })
        .sort(function (a, b) { return score(a) - score(b); });
    },
    setVoice: function (name) { preferred = name; pickVoice(); },
    voiceName: function () { return voice ? voice.name : 'system default'; },
    supported: !!SR
  };
})();

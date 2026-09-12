/* =========================================================================
   JARVIS — voice
   -------------------------------------------------------------------------
   Two halves:
     ears   — SpeechRecognition, always-on, listening for the wake word
     mouth  — SpeechSynthesis, the reply

   Browser reality check: always-on recognition is Chromium-only
   (Chrome, Edge, Brave, Arc). Firefox and Safari have no SpeechRecognition,
   so the HUD falls back to the typed command line — everything still works,
   Jarvis just can't hear you. Speaking works everywhere.
   ========================================================================= */
window.JARVIS = window.JARVIS || {};

JARVIS.voice = (function () {
  'use strict';

  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var synth = window.speechSynthesis;

  /* Wake phrases. Recognition mishears "Jarvis" constantly, so accept the
     near misses too — this is the difference between a demo that works and
     one that makes you say the word nine times. */
  var WAKE = /\b(hey |ok |okay |yo )?(jarvis|jarvice|jarviz|jervis|charvis|javis|service)\b/i;

  var state = {
    supported: !!SR,
    listening: false,     // recognition is running
    awake: false,         // wake word heard, capturing a command
    speaking: false,
    muted: false,
    denied: false
  };

  var rec = null;
  var handlers = {};
  var wakeTimer = null;
  var restartDelay = 400;
  var wantListening = false;   // user intent, survives auto-restarts

  function on(name, fn) { handlers[name] = fn; }
  function fire(name, a, b) { if (handlers[name]) handlers[name](a, b); }

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
      /* Walk only the results we haven't consumed. */
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var res = e.results[i];
        var text = (res[0] && res[0].transcript || '').trim();
        if (!text) continue;

        if (!res.isFinal) {
          fire('interim', text, state.awake);
          /* Let the wake word trip on an interim result so the HUD lights up
             the instant you say it, not a second later. */
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
          /* "Hey Jarvis, how's the app doing" — wake word and command in one
             breath. If there's anything after the wake word, run it now. */
          var tail = strip(text);
          if (tail) { sleep(); fire('command', tail); }
        }
      }
    };

    r.onerror = function (e) {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        state.denied = true;
        wantListening = false;
        fire('error', 'mic-denied');
      } else if (e.error === 'no-speech' || e.error === 'aborted') {
        /* Normal. Chrome fires these constantly on a quiet room. */
      } else if (e.error === 'network') {
        fire('error', 'network');
      }
      fire('state', state);
    };

    r.onend = function () {
      state.listening = false;
      fire('state', state);
      /* Chrome kills recognition every ~60s and after every pause. If the
         user still wants it on, bring it back — with a backoff so a hard
         failure can't spin the CPU. */
      if (wantListening && !state.speaking) {
        setTimeout(function () {
          if (wantListening && !state.speaking) start();
        }, restartDelay);
        restartDelay = Math.min(restartDelay * 1.6, 6000);
      }
    };

    return r;
  }

  /* Remove the wake phrase and any leading filler from a heard line. */
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
    /* If nothing follows the wake word, stand back down rather than sitting
       awake forever eating whatever it hears next. */
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
    } catch (e) {
      /* InvalidStateError = already running. Harmless. */
    }
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

  /* Pick the most Jarvis-sounding voice available. British male first —
     that's the whole bit — then any male, then whatever en- voice exists. */
  var WANT = [
    /daniel/i, /google uk english male/i, /arthur/i, /oliver/i,
    /microsoft (ryan|george|guy)/i, /alex/i, /google us english/i
  ];

  function pickVoice() {
    if (!synth) return;
    var all = synth.getVoices().filter(function (v) { return /^en/i.test(v.lang); });
    if (!all.length) return;
    for (var i = 0; i < WANT.length; i++) {
      var hit = all.filter(function (v) { return WANT[i].test(v.name); })[0];
      if (hit) { voice = hit; return; }
    }
    voice = all[0];
  }

  if (synth) {
    pickVoice();
    /* Chrome populates voices asynchronously. */
    synth.addEventListener('voiceschanged', pickVoice);
  }

  function say(text, opts) {
    opts = opts || {};
    fire('say', text);
    if (!synth || state.muted) {
      /* Still drive the caption timing so the HUD reads the same muted. */
      var ms = Math.min(9000, 400 + text.length * 46);
      state.speaking = true; fire('state', state);
      setTimeout(function () {
        state.speaking = false; fire('state', state); fire('said', text);
        if (opts.then) opts.then();
      }, ms);
      return;
    }

    /* Never let the mic hear Jarvis and answer itself. */
    var wasListening = wantListening;
    if (wasListening) stop();

    synth.cancel();
    var u = new SpeechSynthesisUtterance(text);
    if (voice) { u.voice = voice; u.lang = voice.lang; }
    u.rate = opts.rate || 1.04;
    u.pitch = opts.pitch || 0.92;
    u.volume = 1;

    u.onstart = function () { state.speaking = true; fire('state', state); };
    u.onend = function () {
      state.speaking = false;
      fire('state', state);
      fire('said', text);
      if (wasListening) setTimeout(start, 320);
      if (opts.then) opts.then();
    };
    u.onerror = function () {
      state.speaking = false;
      fire('state', state);
      if (wasListening) setTimeout(start, 320);
      if (opts.then) opts.then();
    };

    synth.speak(u);
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
    setMuted: function (m) { state.muted = m; if (m) shutUp(); fire('state', state); },
    voiceName: function () { return voice ? voice.name : 'system default'; },
    supported: !!SR
  };
})();

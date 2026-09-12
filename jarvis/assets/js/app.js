/* =========================================================================
   JARVIS — app
   -------------------------------------------------------------------------
   Boot sequence, event wiring, captions. The glue.
   ========================================================================= */
(function () {
  'use strict';

  var U = JARVIS.util;
  var core = JARVIS.core;
  var voice = JARVIS.voice;

  function el(id) { return document.getElementById(id); }

  /* ===================================================================== *
     1. Boot
   * ===================================================================== */
  var BOOT_LINES = [
    '<i>booting</i> J.A.R.V.I.S. <i>v1.0.0</i>',
    'loading speech interface ............ <s>ok</s>',
    'loading skill registry .............. <s>' + JARVIS.skills.list.length + ' skills</s>',
    'mounting reactor .................... <s>ok</s>',
    'connecting metrics feed ............. <b>DEMO DATA</b>',
    'restoring local queue and ideas ..... <s>ok</s>',
    'calibrating audio ................... <s>ok</s>',
    '<b>all systems nominal.</b>'
  ];

  function runBoot(done) {
    var log = el('bootLog');
    var fill = el('bootFill');
    var start = el('bootStart');
    var i = 0;

    /* Respect reduced motion — dump the log and offer the button. */
    if (core.reduce) {
      log.innerHTML = BOOT_LINES.map(function (l) { return '<div>' + l + '</div>'; }).join('');
      fill.style.width = '100%';
      start.hidden = false;
      start.focus();
      return;
    }

    (function next() {
      if (i >= BOOT_LINES.length) {
        fill.style.width = '100%';
        setTimeout(function () { start.hidden = false; start.focus(); }, 260);
        return;
      }
      var div = document.createElement('div');
      div.innerHTML = BOOT_LINES[i];
      log.appendChild(div);
      i++;
      fill.style.width = (i / BOOT_LINES.length * 100) + '%';
      setTimeout(next, 150 + Math.random() * 180);
    })();
  }

  /* ===================================================================== *
     2. Captions
   * ===================================================================== */
  var saidNode, heardNode, typeTimer = null;

  function showHeard(text, awake) {
    if (!text) { heardNode.innerHTML = ''; return; }
    heardNode.innerHTML = (awake ? '<b>▸</b> ' : '') + core.esc(text);
  }

  function typeOut(text, done) {
    clearTimeout(typeTimer);
    if (!text) { saidNode.innerHTML = ''; if (done) done(); return; }
    if (core.reduce) { saidNode.textContent = text; if (done) done(); return; }
    var i = 0;
    /* Pace the type-out to roughly track the speaking rate so the words
       land with the voice instead of racing ahead of it. */
    var perChar = Math.max(16, Math.min(42, 2600 / text.length));
    (function step() {
      i += 2;
      saidNode.innerHTML = core.esc(text.slice(0, i)) +
        (i < text.length ? '<span class="cursor"></span>' : '');
      if (i < text.length) typeTimer = setTimeout(step, perChar);
      else if (done) done();
    })();
  }

  /* ===================================================================== *
     3. Toast
   * ===================================================================== */
  var toastTimer = null;
  function toast(msg, kind) {
    var t = el('toast');
    t.textContent = msg;
    t.className = 'toast is-on' + (kind ? ' is-' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.className = 'toast' + (kind ? ' is-' + kind : '');
    }, 2600);
  }

  /* ===================================================================== *
     4. Reactor state
   * ===================================================================== */
  function setState(mode, label, hint) {
    core.reactor.setMode(mode);
    el('reactor').className = 'reactor is-' + mode;
    el('reactorState').textContent = label;
    if (hint !== undefined) el('reactorHint').innerHTML = hint;
  }

  function idleHint() {
    if (!voice.supported) return 'type a command below<br>voice needs chrome or edge';
    if (voice.state.denied) return 'mic blocked — type below<br>or allow the mic and reload';
    if (!voice.state.listening) return 'mic off — press <b>M</b> or type below';
    return 'say <b>“hey jarvis”</b><br>or press <b>space</b>';
  }

  function refreshIdle() {
    if (voice.state.speaking || voice.state.awake) return;
    setState('idle', 'standing by', idleHint());
  }

  /* ===================================================================== *
     5. Running a command
   * ===================================================================== */
  var busy = false;

  function execute(line) {
    if (!line) return;
    showHeard(line, true);
    JARVIS.store.logAdd('“' + line + '”', 'ok');

    setState('thinking', 'processing', '');
    busy = true;

    /* A beat of "thinking" — it reads as deliberate, and it gives the
       speech synthesis voices time to be ready on a cold start. */
    setTimeout(function () {
      var out;
      try {
        out = JARVIS.skills.run(line);
      } catch (err) {
        if (window.console) console.error('[jarvis] skill error:', err);
        out = { say: 'That command threw an error. Check the console.', unknown: true };
      }
      if (!out) { busy = false; refreshIdle(); return; }

      if (out.action === 'refresh') {
        JARVIS.data.refresh().then(function () {
          toast('Metrics refreshed');
        }).catch(function () {
          toast('Metrics feed unreachable', 'bad');
        });
      }
      if (out.action === 'help') openHelp();
      if (out.panel) core.highlight(out.panel);
      if (out.toast) toast(out.toast);
      if (out.beats) showBeats(out.beats);

      if (!out.say) {
        /* "stop" and friends: kill the in-flight type-out too, or the last
           answer keeps writing itself after being told to shut up. */
        clearTimeout(typeTimer);
        saidNode.innerHTML = '';
        busy = false; refreshIdle(); return;
      }

      setState('speaking', 'speaking', '');

      /* With no mic meter running, fake a little motion in the reactor so
         it still looks like it's talking. */
      var fakeLevel = null;
      if (!core.meter.active()) {
        fakeLevel = setInterval(function () {
          core.reactor.setLevel(0.25 + Math.random() * 0.5);
        }, 110);
      }

      var pending = 2;
      var settle = function () {
        if (--pending > 0) return;
        if (fakeLevel) { clearInterval(fakeLevel); core.reactor.setLevel(0); }
        busy = false;
        refreshIdle();
      };

      typeOut(out.say, settle);
      voice.say(out.say, { then: settle });
    }, 380);
  }

  function showBeats(beats) {
    var node = el('beatList');
    node.innerHTML = beats.map(function (b) {
      return '<li class="q"><span class="q__when">' + core.esc(b[0].split('  ')[0]) + '</span>' +
        '<span class="q__text"><b>' + core.esc(b[0].split('  ')[1] || '') + '</b><br>' +
        core.esc(b[1]) + '</span></li>';
    }).join('');
    el('pBeats').hidden = false;
    core.highlight('ideas');
  }

  /* ===================================================================== *
     6. Help overlay
   * ===================================================================== */
  function openHelp() { el('help').classList.add('is-open'); el('helpClose').focus(); }
  function closeHelp() { el('help').classList.remove('is-open'); }

  /* ===================================================================== *
     7. Wiring
   * ===================================================================== */
  function wire() {
    saidNode = el('capSaid');
    heardNode = el('capHeard');

    core.reactor.mount(el('reactorCanvas'));

    /* --- data --- */
    JARVIS.store.seed(JARVIS.data.seedQueue);
    JARVIS.data.onUpdate(core.renderMetrics);
    JARVIS.store.onChange(core.renderStore);
    core.renderMetrics(JARVIS.data.get());
    core.renderStore(JARVIS.store.get());

    /* --- clock --- */
    (function tick() {
      var d = new Date();
      el('clock').textContent = U.clockTime(d);
      el('date').textContent = d.toLocaleDateString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric'
      });
      setTimeout(tick, 10000);
    })();

    /* --- voice events --- */
    voice.on('wake', function () {
      if (busy) return;
      setState('listening', 'listening', 'go ahead');
      showHeard('', true);
    });

    voice.on('interim', function (text, awake) {
      if (awake && !busy) showHeard(text, true);
    });

    voice.on('command', function (line) { execute(line); });

    voice.on('timeout', function () {
      if (!busy) { showHeard('', false); refreshIdle(); }
    });

    voice.on('state', function (s) {
      var mic = el('mic');
      mic.classList.toggle('is-live', s.listening && !s.speaking);
      mic.setAttribute('aria-pressed', String(s.listening));
      var chip = el('micChip');
      if (!voice.supported) {
        chip.className = 'chip is-off';
        el('micLabel').textContent = 'voice n/a';
      } else if (s.denied) {
        chip.className = 'chip is-warn';
        el('micLabel').textContent = 'mic blocked';
      } else if (s.listening) {
        chip.className = 'chip is-live';
        el('micLabel').textContent = s.awake ? 'listening' : 'wake word';
      } else {
        chip.className = 'chip is-off';
        el('micLabel').textContent = 'mic off';
      }
    });

    voice.on('error', function (kind) {
      if (kind === 'mic-denied') {
        toast('Mic blocked — type commands instead', 'warn');
        refreshIdle();
      } else if (kind === 'network') {
        toast('Speech service unreachable', 'bad');
      }
    });

    /* --- dock --- */
    el('dockForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = el('dockInput').value.trim();
      if (!v) return;
      el('dockInput').value = '';
      execute(v);
    });

    el('mic').addEventListener('click', function () {
      if (!voice.supported) { el('dockInput').focus(); return; }
      if (voice.state.listening) { voice.stop(); toast('Mic off'); }
      else { voice.start(); core.meter.start(); toast('Listening for “hey jarvis”'); }
      refreshIdle();
    });

    el('btnMute').addEventListener('click', function () {
      var next = !voice.state.muted;
      voice.setMuted(next);
      this.classList.toggle('is-off', next);
      this.textContent = next ? 'muted' : 'voice';
      toast(next ? 'Voice muted' : 'Voice on');
    });

    el('btnHelp').addEventListener('click', openHelp);
    el('helpClose').addEventListener('click', closeHelp);
    el('help').addEventListener('click', function (e) {
      if (e.target === this) closeHelp();
    });

    el('btnBrief').addEventListener('click', function () { execute('give me the briefing'); });

    /* --- keyboard --- */
    document.addEventListener('keydown', function (e) {
      var typing = /input|textarea/i.test(e.target.tagName);

      if (e.key === 'Escape') {
        if (el('help').classList.contains('is-open')) { closeHelp(); return; }
        voice.shutUp(); voice.sleep(); busy = false; refreshIdle();
        return;
      }
      if (typing) return;

      if (e.key === '/') { e.preventDefault(); el('dockInput').focus(); }
      else if (e.key === '?') { e.preventDefault(); openHelp(); }
      else if (e.key === ' ') {
        /* Push-to-talk: skip the wake word entirely. */
        e.preventDefault();
        if (!voice.supported) { el('dockInput').focus(); return; }
        if (!voice.state.listening) { voice.start(); core.meter.start(); }
        voice.forceWake();
        setState('listening', 'listening', 'go ahead');
      }
      else if (e.key === 'm' || e.key === 'M') { el('mic').click(); }
      else if (e.key === 'b' || e.key === 'B') { execute('give me the briefing'); }
    });

    /* --- periodic metric refresh --- */
    setInterval(function () {
      JARVIS.data.refresh().catch(function () {});
    }, 5 * 60 * 1000);
  }

  /* ===================================================================== *
     8. Go
   * ===================================================================== */
  function begin() {
    document.body.classList.add('is-booted');
    el('boot').classList.add('is-done');

    /* Everything below needs the user gesture we just got from the button:
       mic permission and speech synthesis both require it. */
    if (voice.supported) {
      voice.start();
      core.meter.start();
    }
    refreshIdle();

    setTimeout(function () {
      execute(voice.supported ? 'hello' : 'hello');
    }, 700);
  }

  document.addEventListener('DOMContentLoaded', function () {
    wire();
    refreshIdle();
    runBoot();
    el('bootStart').addEventListener('click', begin);
  });
})();

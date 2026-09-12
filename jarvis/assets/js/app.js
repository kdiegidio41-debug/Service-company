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
    'opening local ledger ............... <s>ok</s>',
    'restoring queue, ideas and notes .... <s>ok</s>',
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
    var d = voice.diagnose();
    if (!d.ok) return core.esc(d.short) + ' — type below<br>press <b>?</b> for why';
    if (!voice.state.listening) return 'mic off — press <b>M</b> or type below';
    return 'say <b>\u201Chey jarvis\u201D</b><br>or press <b>space</b>';
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
          toast(JARVIS.data.isLive() ? 'Live feed refreshed' : 'Recalculated');
        }).catch(function (e) {
          toast('Feed unreachable: ' + e.message, 'bad');
        });
      }
      if (out.action === 'help') openHelp();
      if (out.action === 'settings') openSettings();
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
     6. Overlays
   * ===================================================================== */
  function openHelp() { el('help').classList.add('is-open'); el('helpClose').focus(); }
  function closeHelp() { el('help').classList.remove('is-open'); }

  function openSettings() {
    fillSettings();
    el('settings').classList.add('is-open');
    el('setName').focus();
  }
  function closeSettings() { el('settings').classList.remove('is-open'); }

  /* Load the store into the form every time it opens, so it always shows
     what is actually saved rather than a stale snapshot. */
  function fillSettings() {
    var st = JARVIS.store.get();
    var p = st.profile;
    el('setName').value = p.name === 'the app' ? '' : p.name;
    el('setOwner').value = p.owner || '';
    el('setCurrency').value = p.currency || '$';
    el('setMrr').value = p.mrr || '';
    el('setActive').value = p.activeUsers || '';
    el('setFollowers').value = p.followers || '';
    el('setConv').value = p.trialConversion || '';
    el('setChurn').value = p.churn || '';

    if (!el('setDate').value) el('setDate').value = JARVIS.store.today();
    loadDay();

    fillVoices();
    var t = JARVIS.voice.getTune();
    el('setRate').value = t.rate;   el('setRateVal').textContent = t.rate.toFixed(2);
    el('setPitch').value = t.pitch; el('setPitchVal').textContent = t.pitch.toFixed(2);

    var feed = JARVIS.store.feed();
    el('setEndpoint').value = feed.endpoint || '';
    el('setToken').value = feed.token || '';
    renderFeedStatus();

    el('setJson').value = JARVIS.store.exportJSON();
  }

  /* Show which sources actually answered — "connected" on its own tells you
     nothing when four of five adapters are unconfigured. */
  function renderFeedStatus(err) {
    var tag = el('feedTag');
    var box = el('feedStatus');
    var srcs = JARVIS.data.sources();

    if (err) {
      tag.textContent = 'error';
      tag.className = 'set__tag is-bad';
      box.innerHTML = '<span class="bad">' + core.esc(err) + '</span>';
      return;
    }
    if (!JARVIS.data.isLive()) {
      tag.textContent = 'not connected';
      tag.className = 'set__tag';
      box.innerHTML = '';
      return;
    }

    tag.textContent = 'connected';
    tag.className = 'set__tag is-on';
    if (!srcs) { box.innerHTML = ''; return; }
    box.innerHTML = '<ul>' + Object.keys(srcs).map(function (k) {
      var v = String(srcs[k]);
      var cls = v === 'ok' ? 'ok' : v.indexOf('error') === 0 ? 'bad' : 'off';
      return '<li><b>' + core.esc(k) + '</b><span class="' + cls + '">' +
             core.esc(v) + '</span></li>';
    }).join('') + '</ul>';
  }

  function connectFeed(announce) {
    var endpoint = el('setEndpoint').value.trim();
    var token = el('setToken').value.trim();
    if (!endpoint) { renderFeedStatus('Enter the endpoint URL first.'); return; }

    JARVIS.store.setFeed(endpoint, token);
    JARVIS.data.configure({ endpoint: endpoint, token: token });

    return JARVIS.data.refresh().then(function () {
      renderFeedStatus();
      if (announce) toast('Live feed connected');
    }).catch(function (e) {
      renderFeedStatus(e.message);
      if (announce) toast('Could not reach the feed', 'bad');
    });
  }

  /* Show whatever is already recorded for the chosen date. */
  function loadDay() {
    var e = JARVIS.store.entry(el('setDate').value) || { revenue: 0, downloads: 0, views: {} };
    el('setRev').value = e.revenue || '';
    el('setDl').value = e.downloads || '';
    JARVIS.store.PLATFORMS.forEach(function (name) {
      var node = el('setV' + name);
      if (node) node.value = (e.views && e.views[name]) || '';
    });
  }

  function num(id2) {
    var v = parseFloat(el(id2).value);
    return isNaN(v) ? 0 : v;
  }

  function saveProfile() {
    JARVIS.store.setProfile({
      name: el('setName').value.trim() || 'the app',
      owner: el('setOwner').value.trim(),
      currency: el('setCurrency').value.trim() || '$',
      mrr: num('setMrr'),
      activeUsers: Math.round(num('setActive')),
      followers: Math.round(num('setFollowers')),
      trialConversion: num('setConv'),
      churn: num('setChurn')
    });
  }

  function fillVoices() {
    var sel = el('setVoice');
    var list = JARVIS.voice.voices();
    if (!list.length) {
      sel.innerHTML = '<option>system default</option>';
      return;
    }
    var currentName = JARVIS.voice.voiceName();
    sel.innerHTML = list.map(function (v) {
      return '<option value="' + core.esc(v.name) + '"' +
             (v.name === currentName ? ' selected' : '') + '>' +
             core.esc(v.name) + '</option>';
    }).join('');
  }

  /* ===================================================================== *
     6b. Microphone status
   * ===================================================================== */
  var micNoteDismissed = false;

  function showMicNote() {
    var d = JARVIS.voice.diagnose();
    var note = el('micNote');
    if (d.ok || micNoteDismissed) { note.classList.remove('is-on'); return; }
    el('micNoteTitle').textContent = d.code === 'unsupported' ? 'Voice unavailable' : 'Microphone off';
    el('micNoteText').innerHTML = core.esc(d.message) + ' <b>' + core.esc(d.fix) + '</b>';
    note.classList.add('is-on');
  }

  /* ===================================================================== *
     7. Wiring
   * ===================================================================== */
  function wire() {
    saidNode = el('capSaid');
    heardNode = el('capHeard');

    core.reactor.mount(el('reactorCanvas'));

    /* --- data --- */
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

    /* --- reconnect a saved feed --- */
    var savedFeed = JARVIS.store.feed();
    if (savedFeed.endpoint) {
      JARVIS.data.configure({ endpoint: savedFeed.endpoint, token: savedFeed.token });
    }

    /* --- voice: restore the saved choice --- */
    var savedVoice = JARVIS.store.get().voiceName;
    if (savedVoice) voice.setVoice(savedVoice);

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
      var diag = voice.diagnose();
      if (!diag.ok && !s.listening) {
        chip.className = 'chip ' + (diag.code === 'unsupported' ? 'is-off' : 'is-warn');
        el('micLabel').textContent = diag.short;
      } else if (s.listening) {
        chip.className = 'chip is-live';
        el('micLabel').textContent = s.awake ? 'listening' : 'wake word';
      } else {
        chip.className = 'chip is-off';
        el('micLabel').textContent = 'mic off';
      }
    });

    voice.on('error', function (d) {
      micNoteDismissed = false;
      showMicNote();
      toast(d.short || 'Microphone problem', d.code === 'network' ? 'bad' : 'warn');
      refreshIdle();
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

    /* --- settings --- */
    el('btnData').addEventListener('click', openSettings);
    el('setClose').addEventListener('click', function () { saveProfile(); closeSettings(); });
    el('settings').addEventListener('click', function (e) {
      if (e.target === this) { saveProfile(); closeSettings(); }
    });

    ['setName', 'setOwner', 'setCurrency', 'setMrr', 'setActive',
     'setFollowers', 'setConv', 'setChurn'].forEach(function (id2) {
      el(id2).addEventListener('change', saveProfile);
    });

    el('setDate').addEventListener('change', loadDay);

    el('setSaveDay').addEventListener('click', function () {
      var views = {};
      JARVIS.store.PLATFORMS.forEach(function (name) {
        var node = el('setV' + name);
        if (node) views[name] = Math.round(num('setV' + name));
      });
      JARVIS.store.setEntry(el('setDate').value, {
        revenue: num('setRev'),
        downloads: Math.round(num('setDl')),
        views: views
      });
      el('setJson').value = JARVIS.store.exportJSON();
      toast('Saved ' + el('setDate').value);
    });

    el('setVoice').addEventListener('change', function () {
      JARVIS.voice.setVoice(this.value);
      JARVIS.store.setVoice(this.value);
    });
    el('setRate').addEventListener('input', function () {
      JARVIS.voice.tune({ rate: parseFloat(this.value) });
      el('setRateVal').textContent = parseFloat(this.value).toFixed(2);
    });
    el('setPitch').addEventListener('input', function () {
      JARVIS.voice.tune({ pitch: parseFloat(this.value) });
      el('setPitchVal').textContent = parseFloat(this.value).toFixed(2);
    });
    el('setTestVoice').addEventListener('click', function () {
      JARVIS.voice.say('Revenue over the last seven days is up eleven percent. ' +
                       'Two items need your attention.');
    });

    el('setConnect').addEventListener('click', function () { connectFeed(true); });
    el('setDisconnect').addEventListener('click', function () {
      JARVIS.store.setFeed('', '');
      JARVIS.data.disconnect();
      el('setEndpoint').value = '';
      el('setToken').value = '';
      renderFeedStatus();
      toast('Disconnected — back to local data');
    });

    el('setCopy').addEventListener('click', function () {
      var box = el('setJson');
      box.value = JARVIS.store.exportJSON();
      box.select();
      /* The sandbox blocks clipboard writes in some contexts, so select the
         text as well — worst case the user hits copy themselves. */
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(box.value)
          .then(function () { toast('Backup copied'); })
          .catch(function () { toast('Selected — press copy', 'warn'); });
      } else {
        toast('Selected — press copy', 'warn');
      }
    });

    el('setImport').addEventListener('click', function () {
      try {
        JARVIS.store.importJSON(el('setJson').value);
        JARVIS.data.recompute();
        fillSettings();
        toast('Data restored');
      } catch (err) {
        toast('That is not valid backup JSON', 'bad');
      }
    });

    el('setWipe').addEventListener('click', function () {
      if (!window.confirm('Erase every number, note and queued post? This cannot be undone.')) return;
      JARVIS.store.wipe();
      JARVIS.data.recompute();
      fillSettings();
      toast('Everything erased', 'warn');
    });

    el('micNoteX').addEventListener('click', function () {
      micNoteDismissed = true;
      el('micNote').classList.remove('is-on');
    });

    el('btnBrief').addEventListener('click', function () { execute('give me the briefing'); });

    /* --- keyboard --- */
    document.addEventListener('keydown', function (e) {
      var typing = /input|textarea/i.test(e.target.tagName);

      if (e.key === 'Escape') {
        if (el('settings').classList.contains('is-open')) { saveProfile(); closeSettings(); return; }
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
      else if (e.key === 'd' || e.key === 'D') { openSettings(); }
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
    if (voice.diagnose().ok) {
      voice.start();
      core.meter.start();
    }
    showMicNote();
    refreshIdle();

    setTimeout(function () {
      execute(voice.supported ? 'hello' : 'hello');
    }, 700);
  }

  /* Service worker: what makes this installable and offline-capable.
     It needs a secure context, so it simply doesn't register on file://. */
  function registerWorker() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
    navigator.serviceWorker.register('sw.js').catch(function (err) {
      if (window.console) console.warn('[jarvis] worker not registered:', err.message);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    registerWorker();
    wire();
    refreshIdle();
    /* Bring the panels up behind the boot overlay rather than after it, so
       the console is populated the moment anyone lands on the page. */
    setTimeout(function () { document.body.classList.add('is-booted'); }, 60);
    runBoot();
    el('bootStart').addEventListener('click', begin);
  });
})();

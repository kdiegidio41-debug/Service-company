/* =========================================================================
   JARVIS — core
   -------------------------------------------------------------------------
   The reactor (canvas) and the panels (DOM). Nothing in here knows about
   speech; it only reacts to a state string and a data object.
   ========================================================================= */
window.JARVIS = window.JARVIS || {};

JARVIS.core = (function () {
  'use strict';

  var U = JARVIS.util;
  var reduce = window.matchMedia &&
               window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ===================================================================== *
     1. The reactor
   * ===================================================================== */
  var Reactor = (function () {
    var cv, ctx, dpr = 1, w = 0, h = 0, raf = null;
    var t = 0;
    var mode = 'idle';        // idle | listening | thinking | speaking
    var level = 0;            // 0..1 mic / speech amplitude
    var levelTarget = 0;

    var PALETTE = {
      idle:      { core: '94, 214, 255', ring: '94, 214, 255', speed: 0.22, alpha: 0.55 },
      listening: { core: '201, 242, 255', ring: '94, 214, 255', speed: 0.75, alpha: 1.00 },
      thinking:  { core: '255, 231, 194', ring: '255, 196, 107', speed: 1.70, alpha: 0.95 },
      speaking:  { core: '255, 255, 255', ring: '94, 214, 255', speed: 1.05, alpha: 1.00 }
    };

    function size() {
      if (!cv) return;
      var r = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function ring(cx, cy, r, from, to, width, color, alpha) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, from, to);
      ctx.strokeStyle = 'rgba(' + color + ',' + alpha + ')';
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    function draw() {
      var p = PALETTE[mode] || PALETTE.idle;
      t += reduce ? 0 : 0.016 * p.speed;

      /* Ease the amplitude so the core breathes instead of strobing. */
      level += (levelTarget - level) * 0.18;

      ctx.clearRect(0, 0, w, h);

      var cx = w / 2, cy = h / 2;
      var R = Math.min(w, h) / 2;
      var pulse = reduce ? 0 : Math.sin(t * 1.7) * 0.5 + 0.5;

      /* --- outer tick ring ------------------------------------------- */
      var ticks = 72;
      for (var i = 0; i < ticks; i++) {
        var a = (i / ticks) * Math.PI * 2 + t * 0.10;
        var major = i % 6 === 0;
        var len = major ? R * 0.055 : R * 0.028;
        var r0 = R * 0.965;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * (r0 - len), cy + Math.sin(a) * (r0 - len));
        ctx.strokeStyle = 'rgba(' + p.ring + ',' + (major ? 0.55 : 0.22) * p.alpha + ')';
        ctx.lineWidth = major ? 1.6 : 1;
        ctx.stroke();
      }

      /* --- outer arc segments, clockwise ------------------------------ */
      var segs = [[0, 1.15], [1.6, 2.5], [3.0, 4.4], [4.9, 5.7]];
      for (var s = 0; s < segs.length; s++) {
        ring(cx, cy, R * 0.885, segs[s][0] + t * 0.42, segs[s][1] + t * 0.42,
             2.2, p.ring, 0.62 * p.alpha);
      }

      /* --- mid ring, counter-clockwise -------------------------------- */
      var segs2 = [[0.3, 2.0], [2.6, 3.4], [4.1, 5.9]];
      for (var s2 = 0; s2 < segs2.length; s2++) {
        ring(cx, cy, R * 0.735, segs2[s2][0] - t * 0.66, segs2[s2][1] - t * 0.66,
             3.4, p.ring, 0.48 * p.alpha);
      }

      /* --- dashed data ring ------------------------------------------- */
      ctx.save();
      ctx.setLineDash([3, 9]);
      ring(cx, cy, R * 0.645, 0, Math.PI * 2, 1.4, p.ring, 0.4 * p.alpha);
      ctx.restore();

      /* --- amplitude ring: the thing that makes it feel alive --------- */
      var bars = 96;
      var base = R * 0.50;
      for (var b = 0; b < bars; b++) {
        var ba = (b / bars) * Math.PI * 2 - Math.PI / 2;
        /* Deterministic per-bar wobble so it looks like a spectrum, not noise */
        var wob = Math.sin(b * 0.7 + t * 3.1) * 0.5 + Math.sin(b * 2.3 - t * 1.9) * 0.5;
        var amp = (0.25 + level * 1.5) * (0.5 + wob * 0.5);
        var len2 = Math.max(1.5, R * 0.085 * amp);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ba) * base, cy + Math.sin(ba) * base);
        ctx.lineTo(cx + Math.cos(ba) * (base + len2), cy + Math.sin(ba) * (base + len2));
        ctx.strokeStyle = 'rgba(' + p.core + ',' + (0.16 + level * 0.6) * p.alpha + ')';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }

      /* --- inner ring + core glow ------------------------------------- */
      ring(cx, cy, R * 0.46, 0, Math.PI * 2, 1.2, p.ring, 0.55 * p.alpha);

      var coreR = R * (0.30 + level * 0.07 + pulse * 0.018);
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      g.addColorStop(0, 'rgba(' + p.core + ',' + (0.82 * p.alpha) + ')');
      g.addColorStop(0.28, 'rgba(' + p.core + ',' + (0.26 * p.alpha) + ')');
      g.addColorStop(1, 'rgba(' + p.core + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();

      /* Three coil pads around the core — the arc-reactor tell. A rotating
         triangle here reads as a play button over the glow, so: arcs. */
      for (var c = 0; c < 3; c++) {
        var ca = (c / 3) * Math.PI * 2 - Math.PI / 2 - t * 0.30;
        ring(cx, cy, R * 0.375, ca - 0.42, ca + 0.42, R * 0.055, p.core, 0.30 * p.alpha);
      }

      raf = requestAnimationFrame(draw);
    }

    return {
      mount: function (canvas) {
        cv = canvas;
        ctx = cv.getContext('2d');
        size();
        window.addEventListener('resize', size);
        if (raf) cancelAnimationFrame(raf);
        draw();
      },
      setMode: function (m) { mode = m; },
      setLevel: function (l) { levelTarget = Math.max(0, Math.min(1, l)); }
    };
  })();

  /* ===================================================================== *
     2. Mic amplitude (optional — drives the reactor from your actual voice)
   * ===================================================================== */
  var Meter = (function () {
    var analyser = null, buf = null, raf = null, stream = null;

    function loop() {
      analyser.getByteTimeDomainData(buf);
      var peak = 0;
      for (var i = 0; i < buf.length; i++) {
        var v = Math.abs(buf[i] - 128) / 128;
        if (v > peak) peak = v;
      }
      Reactor.setLevel(Math.min(1, peak * 2.6));
      raf = requestAnimationFrame(loop);
    }

    return {
      start: function () {
        if (analyser || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          return Promise.resolve(false);
        }
        return navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
          stream = s;
          var AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return false;
          var ac = new AC();
          var src = ac.createMediaStreamSource(s);
          analyser = ac.createAnalyser();
          analyser.fftSize = 1024;
          buf = new Uint8Array(analyser.fftSize);
          src.connect(analyser);
          loop();
          return true;
        }).catch(function () { return false; });
      },
      stop: function () {
        if (raf) cancelAnimationFrame(raf);
        if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
        analyser = null; stream = null; raf = null;
      },
      active: function () { return !!analyser; }
    };
  })();

  /* ===================================================================== *
     3. Panels
   * ===================================================================== */
  function el(id) { return document.getElementById(id); }

  function sparkline(node, data, w, h) {
    if (!node || !data || data.length < 2) return;
    w = w || 100; h = h || 34;
    var min = Math.min.apply(null, data);
    var max = Math.max.apply(null, data);
    var span = (max - min) || 1;
    var step = w / (data.length - 1);

    var pts = data.map(function (v, i) {
      return [i * step, h - ((v - min) / span) * (h - 4) - 2];
    });
    var d = pts.map(function (p, i) {
      return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
    }).join(' ');
    var area = d + ' L ' + w + ' ' + h + ' L 0 ' + h + ' Z';
    var last = pts[pts.length - 1];

    node.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    node.setAttribute('preserveAspectRatio', 'none');
    node.innerHTML =
      '<defs><linearGradient id="sparkfade" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#5ED6FF" stop-opacity=".42"/>' +
      '<stop offset="100%" stop-color="#5ED6FF" stop-opacity="0"/>' +
      '</linearGradient></defs>' +
      '<path class="spark__area" d="' + area + '"/>' +
      '<path class="spark__line" d="' + d + '"/>' +
      '<circle class="spark__dot" cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="2.6"/>';
  }

  /* Count a number up on change — the HUD tell that data just landed. */
  function countTo(node, value, render) {
    if (!node) return;
    var from = parseFloat(node.getAttribute('data-v') || '0');
    var to = value;
    node.setAttribute('data-v', String(to));
    if (reduce || from === to) { node.textContent = render(to); return; }
    var start = performance.now(), dur = 800;
    (function step(now) {
      var k = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - k, 3);
      node.textContent = render(from + (to - from) * eased);
      if (k < 1) requestAnimationFrame(step);
    })(start);
  }

  function delta(node, v) {
    if (!node) return;
    if (v === null || v === undefined) {
      node.textContent = 'new';
      node.className = 'stat__delta flat';
      return;
    }
    node.textContent = U.pct(v);
    node.className = 'stat__delta ' + U.dir(v);
  }

  function feed(node, items, emptyText) {
    if (!node) return;
    if (!items || !items.length) {
      node.innerHTML = '<li class="feed__empty">' + (emptyText || 'Nothing here.') + '</li>';
      return;
    }
    node.innerHTML = items.map(function (it) {
      var mark = it.kind === 'bad' ? '!' : it.kind === 'warn' ? '?' : '✓';
      var when = typeof it.when === 'number' ? U.ago(it.when) : (it.when || '');
      return '<li class="feed__item">' +
        '<span class="feed__icon ' + (it.kind || 'ok') + '" aria-hidden="true">' + mark + '</span>' +
        '<span class="feed__body">' +
          '<span class="feed__text">' + esc(it.text) + '</span>' +
          '<span class="feed__meta">' + esc(when) + '</span>' +
        '</span></li>';
    }).join('');
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderMetrics(d) {
    var cur = JARVIS.data.product.currency || '$';
    document.body.classList.toggle('is-empty', !!d.empty);

    countTo(el('mMrr'), d.revenue.mrr, function (v) { return U.money(v, cur); });
    countTo(el('mRev7'), d.revenue.last7, function (v) { return U.money(v, cur); });
    delta(el('mRevDelta'), d.revenue.delta7);
    sparkline(el('sparkRev'), d.revenue.series);

    countTo(el('mDl'), d.growth.downloads7, function (v) { return U.commas(v); });
    delta(el('mDlDelta'), d.growth.delta7);
    countTo(el('mActive'), d.growth.activeUsers, function (v) { return U.compact(v); });
    el('mConv').textContent = d.growth.trialConversion + '%';
    el('mChurn').textContent = d.growth.churn + '%';
    sparkline(el('sparkDl'), d.growth.series);

    countTo(el('mViews'), d.content.views7, function (v) { return U.compact(v); });
    delta(el('mViewsDelta'), d.content.delta7);
    el('mPosts').textContent = d.content.posts7;
    el('mFollowers').textContent = U.compact(d.content.followers);

    var maxV = Math.max.apply(null, d.content.platforms.map(function (p) { return p.views; })) || 1;
    var tones = { gold: 'plat__fill--gold', violet: 'plat__fill--violet', jade: 'plat__fill--jade' };
    el('platforms').innerHTML = d.content.platforms.map(function (p) {
      return '<li class="plat">' +
        '<span class="plat__top"><span class="plat__name">' + esc(p.name) + '</span>' +
        '<span class="plat__val">' + U.compact(p.views) + '</span></span>' +
        '<span class="plat__track"><span class="plat__fill ' + (tones[p.tone] || '') +
        '" style="width:' + ((p.views / maxV) * 100).toFixed(1) + '%"></span></span></li>';
    }).join('');

    if (d.content.top) {
      el('topHook').textContent = '\u201C' + d.content.top.hook + '\u201D';
      var bits = [d.content.top.platform];
      if (d.content.top.views) bits.push(U.compact(d.content.top.views) + ' views');
      if (d.content.top.saves) bits.push(U.compact(d.content.top.saves) + ' saves');
      el('topMeta').textContent = bits.join(' \u00B7 ');
    } else {
      el('topHook').innerHTML = '<span class="feed__empty">No posts recorded yet.</span>';
      el('topMeta').textContent = 'say \u201Cpublished \u2026 on tiktok\u201D';
    }

    feed(el('handledFeed'), d.handled, 'Nothing logged yet.');
    feed(el('needsFeed'), d.needsYou, 'Nothing is waiting on you.');

    var mode = JARVIS.data.isLive() ? 'live feed' : 'local';
    el('dataMode').textContent = mode;
    el('dataChip').className = 'chip ' + (JARVIS.data.isLive() ? 'is-live' : 'is-off');
  }

  function renderStore(s) {
    var open = s.queue.filter(function (q) { return !q.done; });
    var qNode = el('queueList');
    if (!open.length) {
      qNode.innerHTML = '<li class="feed__empty">Queue is empty. Say “queue a post about…”.</li>';
    } else {
      qNode.innerHTML = open.slice(0, 6).map(function (q) {
        return '<li class="q">' +
          '<span class="q__when">' + esc(q.when) + '</span>' +
          '<span class="q__text">' + esc(q.text) +
          '<br><span class="q__tag">' + esc(q.tag) + '</span></span></li>';
      }).join('');
    }
    el('queueCount').textContent = open.length + (open.length === 1 ? ' post' : ' posts');

    var ideas = s.ideas.concat(s.reminders.map(function (r) {
      return { id: r.id, text: '⏰ ' + r.text, at: r.at };
    })).sort(function (a, b) { return b.at - a.at; });

    var iNode = el('ideaList');
    if (!ideas.length) {
      iNode.innerHTML = '<li class="feed__empty">Say “remember…” and it lands here.</li>';
    } else {
      iNode.innerHTML = ideas.slice(0, 7).map(function (i) {
        return '<li class="feed__item">' +
          '<span class="feed__icon" aria-hidden="true">•</span>' +
          '<span class="feed__body"><span class="feed__text">' + esc(i.text) + '</span>' +
          '<span class="feed__meta">' + U.ago(i.at) + '</span></span></li>';
      }).join('');
    }
    el('ideaCount').textContent = ideas.length;
  }

  /* Flash a panel when Jarvis is talking about it. */
  function highlight(name) {
    var map = {
      revenue: ['pRevenue'], growth: ['pGrowth'], content: ['pContent', 'pTop'],
      handled: ['pHandled'], needs: ['pNeeds'], queue: ['pQueue'], ideas: ['pIdeas'],
      all: ['pRevenue', 'pGrowth', 'pContent', 'pHandled', 'pNeeds']
    };
    var ids = map[name];
    if (!ids) return;
    ids.forEach(function (id) {
      var n = el(id);
      if (!n) return;
      n.classList.add('is-hot');
      setTimeout(function () { n.classList.remove('is-hot'); }, 3200);
    });
    var first = el(ids[0]);
    if (first && first.scrollIntoView) {
      first.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
    }
  }

  return {
    reactor: Reactor,
    meter: Meter,
    renderMetrics: renderMetrics,
    renderStore: renderStore,
    highlight: highlight,
    esc: esc,
    reduce: reduce
  };
})();

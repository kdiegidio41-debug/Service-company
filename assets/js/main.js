/* =========================================================================
   EverGlow — site behaviour
   Shared by every page. No dependencies.
   ========================================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CONFIG = window.EVERGLOW || { endpoint: '', fallbackEmail: 'everglowchristmaslighting25@gmail.com' };

  /* --- Sticky header ---------------------------------------------------- */
  var header = document.getElementById('header');
  if (header && !header.classList.contains('is-stuck')) {
    var onScroll = function () { header.classList.toggle('is-stuck', window.scrollY > 24); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* --- Mobile nav ------------------------------------------------------- */
  var toggle = document.getElementById('navtoggle');
  var nav = document.getElementById('nav');
  if (toggle && nav) {
    var setNav = function (open) {
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', function () { setNav(!document.body.classList.contains('nav-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setNav(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setNav(false); });
  }

  /* --- Scroll reveal ---------------------------------------------------- */
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    if ('IntersectionObserver' in window && !reduceMotion) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      reveals.forEach(function (el) { io.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add('is-in'); });
    }
  }

  /* --- FAQ: one answer open at a time ----------------------------------- */
  var faqItems = document.querySelectorAll('.faq__item');
  faqItems.forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      faqItems.forEach(function (other) { if (other !== item) other.open = false; });
    });
  });

  /* --- Footer year ------------------------------------------------------ */
  document.querySelectorAll('#year, .js-year').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* --- Before / after slider -------------------------------------------- */
  var ba = document.getElementById('ba');
  var range = document.getElementById('ba-range');
  if (ba && range) {
    var touched = false;
    var setPos = function (v) {
      v = Math.max(0, Math.min(100, v));
      ba.style.setProperty('--pos', v + '%');
      range.value = String(v);
      range.setAttribute('aria-valuetext', Math.round(100 - v) + '% after');
    };
    var fromPointer = function (e) {
      var r = ba.getBoundingClientRect();
      setPos(((e.clientX - r.left) / r.width) * 100);
    };
    var dragging = false;
    ba.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();                          // no native image drag or text selection
      dragging = true; touched = true;
      try { ba.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
      fromPointer(e);
    });
    ba.addEventListener('pointermove', function (e) { if (dragging) fromPointer(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) {
      ba.addEventListener(t, function () { dragging = false; });
    });
    range.addEventListener('input', function () { touched = true; setPos(Number(range.value)); });
    setPos(50);

    // one gentle sweep the first time it scrolls into view, so people know it moves
    if (!reduceMotion && 'IntersectionObserver' in window) {
      var sweep = function () {
        var keys = [50, 20, 80, 50], seg = 750, start = null;
        var ease = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
        var step = function (ts) {
          if (touched) return;
          if (start === null) start = ts;
          var t = (ts - start) / seg, i = Math.min(Math.floor(t), keys.length - 2);
          if (t >= keys.length - 1) { setPos(50); return; }
          setPos(keys[i] + (keys[i + 1] - keys[i]) * ease(t - i));
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };
      var bio = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { bio.disconnect(); setTimeout(sweep, 450); }
      }, { threshold: 0.55 });
      bio.observe(ba);
    }
  }

  /* --- Hero snowfall ---------------------------------------------------- */
  var canvas = document.getElementById('snow');
  if (canvas && canvas.getContext && !reduceMotion) {
    var ctx = canvas.getContext('2d');
    var flakes = [], W = 0, H = 0, running = false, last = 0;
    var resize = function () {
      // mobile browsers fire resize when the URL bar slides; only rebuild on a real width change
      if (canvas.clientWidth === W && flakes.length) { H = canvas.clientHeight; return; }
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.min(90, Math.round(W / 18));
      flakes = [];
      for (var i = 0; i < n; i++) {
        var depth = Math.random();
        flakes.push({ x: Math.random() * W, y: Math.random() * H, r: 0.6 + depth * 1.9, vy: 12 + depth * 34, drift: 6 + depth * 14, ph: Math.random() * 6.28, a: 0.25 + depth * 0.5 });
      }
    };
    var frame = function (ts) {
      if (!running) return;
      var dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i];
        f.y += f.vy * dt; f.ph += dt * 0.8;
        var x = f.x + Math.sin(f.ph) * f.drift;
        if (f.y > H + 4) { f.y = -4; f.x = Math.random() * W; }
        ctx.beginPath(); ctx.arc(x, f.y, f.r, 0, 6.2832);
        ctx.fillStyle = 'rgba(255,255,255,' + f.a + ')'; ctx.fill();
      }
      requestAnimationFrame(frame);
    };
    var play = function (on) {
      if (on && !running) { running = true; last = 0; requestAnimationFrame(frame); }
      if (!on) running = false;
    };
    // start after the page has loaded, so the animation never competes with the first paint
    var startSnow = function () {
      resize();
      window.addEventListener('resize', resize);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (e) { play(e[0].isIntersecting && !document.hidden); }).observe(canvas);
      } else { play(true); }
      document.addEventListener('visibilitychange', function () { play(!document.hidden && canvas.getBoundingClientRect().bottom > 0); });
    };
    if (document.readyState === 'complete') setTimeout(startSnow, 300);
    else window.addEventListener('load', function () { setTimeout(startSnow, 300); });
  }

  /* --- Mobile action bar ------------------------------------------------ */
  var bar = document.getElementById('mobilebar');
  var hero = document.querySelector('.hero');
  var quote = document.getElementById('quote');
  if (bar && hero && 'IntersectionObserver' in window) {
    var heroVisible = true, quoteVisible = false;
    var update = function () { bar.classList.toggle('is-visible', !heroVisible && !quoteVisible); };
    new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; update(); }, { threshold: 0.35 }).observe(hero);
    if (quote) new IntersectionObserver(function (e) { quoteVisible = e[0].isIntersecting; update(); }, { threshold: 0.12 }).observe(quote);
  }

  /* --- "Check availability" → point at the install-window field --------- */
  document.querySelectorAll('[data-focus]').forEach(function (link) {
    link.addEventListener('click', function () {
      var field = document.getElementById('lf-' + link.getAttribute('data-focus'));
      if (!field) return;
      var box = field.closest('.field');
      setTimeout(function () {
        if (box) { box.classList.remove('is-highlight'); void box.offsetWidth; box.classList.add('is-highlight'); }
        if (window.matchMedia('(pointer: fine)').matches) {
          try { field.focus({ preventScroll: true }); } catch (e) { /* older browsers */ }
        }
      }, reduceMotion ? 0 : 700);
    });
  });

  /* --- Homepage lead form ----------------------------------------------- */
  var form = document.getElementById('leadform');
  if (form) {
    var lead = document.getElementById('lead');
    var submitBtn = document.getElementById('lf-submit');
    var submitHTML = submitBtn.innerHTML;
    var fallback = document.getElementById('lf-fallback');
    var done = document.getElementById('lf-done');

    var markError = function (el, on) {
      var box = el.closest('.field');
      if (box) box.classList.toggle('has-error', on);
    };
    var validate = function () {
      var firstBad = null;
      form.querySelectorAll('[required]').forEach(function (el) {
        var ok;
        if (el.type === 'checkbox') ok = el.checked;
        else {
          var v = el.value.trim(); ok = v !== '';
          if (ok && el.type === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
          if (ok && el.type === 'tel') ok = v.replace(/\D/g, '').length >= 10;
        }
        markError(el, !ok);
        if (!ok && !firstBad) firstBad = el;
      });
      if (firstBad) {
        firstBad.closest('.field').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        try { firstBad.focus({ preventScroll: true }); } catch (e) { /* older browsers */ }
      }
      return !firstBad;
    };
    form.addEventListener('input', function (e) {
      var box = e.target.closest('.field');
      if (box && box.classList.contains('has-error')) box.classList.remove('has-error');
    });

    var collect = function () {
      var data = {};
      new FormData(form).forEach(function (v, k) {
        if (data[k] === undefined) data[k] = v;
        else if (Array.isArray(data[k])) data[k].push(v);
        else data[k] = [data[k], v];
      });
      if (Array.isArray(data.services)) data.services = data.services.join(', ');
      data.form = 'homepage';
      // shown as the email subject by Formspree (and most form services)
      data._subject = 'New quote request: ' + String(data.name || '').trim() + (data.address ? ', ' + String(data.address).trim() : '');
      data.submittedAt = new Date().toISOString();
      data.page = window.location.href;
      data.referrer = document.referrer || 'direct';
      return data;
    };
    var mailtoFor = function (data) {
      var body = Object.keys(data)
        .filter(function (k) { return k !== 'company_website' && data[k]; })
        .map(function (k) { return k + ': ' + data[k]; }).join('\n');
      return 'mailto:' + CONFIG.fallbackEmail + '?subject=' + encodeURIComponent('Quote request: ' + (data.address || 'new lead')) + '&body=' + encodeURIComponent(body);
    };
    var succeed = function (data, demo, quiet) {
      var first = String(data.name || '').trim().split(/\s+/)[0];
      if (first) document.getElementById('lf-done-name').textContent = first;
      lead.classList.add('is-done');
      done.classList.add('is-visible');
      document.getElementById('lf-demo').classList.toggle('is-visible', !!demo);
      try { done.focus({ preventScroll: true }); } catch (e) { /* older browsers */ }
      lead.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      if (!demo && !quiet) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'generate_lead', form: 'homepage' });
      }
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      fallback.classList.remove('is-visible');
      if (!validate()) return;
      var data = collect();
      if (data.company_website) { succeed(data, false, true); return; }   // honeypot: drop silently
      delete data.company_website;                                        // keep the empty trap out of the lead email

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      if (!CONFIG.endpoint) {
        console.warn('[EverGlow] DEMO MODE: no endpoint set in assets/js/config.js. Payload:', data);
        setTimeout(function () { succeed(data, true); }, 500);
        return;
      }
      fetch(CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        succeed(data, false);
      }).catch(function (err) {
        console.error('[EverGlow] Quote submission failed:', err);
        submitBtn.disabled = false;
        submitBtn.innerHTML = submitHTML;
        document.getElementById('lf-mailto').href = mailtoFor(data);
        fallback.classList.add('is-visible');
      });
    });
  }
})();

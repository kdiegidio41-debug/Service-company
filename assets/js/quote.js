/* =========================================================================
   EverGlow — multi-step quote request form
   ========================================================================= */
(function () {
  'use strict';

  /* The endpoint and fallback email live in assets/js/config.js,
     shared with the homepage form. With no endpoint set the form runs in
     DEMO MODE: it validates and shows the success screen, but sends nothing. */
  var CONFIG = window.EVERGLOW || { endpoint: '', fallbackEmail: 'hello@everglowlighting.com' };

  var form = document.getElementById('qform');
  if (!form) return;

  var steps      = Array.prototype.slice.call(form.querySelectorAll('.qstep'));
  var fill       = document.getElementById('qfill');
  var crumbs     = Array.prototype.slice.call(document.querySelectorAll('.qprogress__step'));
  var btnNext    = document.getElementById('qnext');
  var btnBack    = document.getElementById('qback');
  var note       = document.getElementById('qnote');
  var nav        = document.getElementById('qnav');
  var done       = document.getElementById('qdone');
  var fallback   = document.getElementById('qfallback');
  var estEl      = document.getElementById('qest');
  var estNote    = document.getElementById('qestnote');
  var sumEl      = document.getElementById('qsum');
  var card       = document.getElementById('quote-form');
  var total      = steps.length;
  var current    = 1;

  /* --- Step navigation -------------------------------------------------- */
  function showStep(n) {
    current = n;
    steps.forEach(function (s) {
      s.classList.toggle('is-active', Number(s.dataset.step) === n);
    });
    crumbs.forEach(function (c) {
      var i = Number(c.dataset.step);
      c.classList.toggle('is-active', i === n);
      c.classList.toggle('is-done', i < n);
    });
    fill.style.width = (n / total) * 100 + '%';
    btnBack.hidden = n === 1;
    btnNext.innerHTML = n === total ? 'Send my request &rarr;' : 'Continue &rarr;';
    note.textContent = n === total
      ? 'We reply within 24 hours'
      : 'Step ' + n + ' of ' + total + ' · about 90 seconds';

    if (n > 1) {
      var y = card.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
    var focusable = steps[n - 1].querySelector('input, select, textarea');
    if (focusable && window.matchMedia('(min-width: 900px)').matches) {
      try { focusable.focus({ preventScroll: true }); } catch (e) { /* older browsers */ }
    }
  }

  /* --- Validation ------------------------------------------------------- */
  function markError(el, on) {
    var box = el.closest('.qfield') || el.closest('fieldset');
    if (box) box.classList.toggle('has-error', on);
    return box;
  }

  function validateStep(n) {
    var step = steps[n - 1];
    var firstBad = null;

    // required single fields
    step.querySelectorAll('input[required], select[required], textarea[required]').forEach(function (el) {
      if (el.type === 'radio' || el.type === 'checkbox') return;
      var ok = el.value.trim() !== '';
      if (ok && el.type === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim());
      if (ok && el.type === 'tel') ok = (el.value.replace(/\D/g, '').length >= 10);
      markError(el, !ok);
      if (!ok && !firstBad) firstBad = el;
    });

    // required radio groups
    var radioNames = {};
    step.querySelectorAll('input[type="radio"][required]').forEach(function (el) { radioNames[el.name] = true; });
    Object.keys(radioNames).forEach(function (name) {
      var group = step.querySelectorAll('input[name="' + name + '"]');
      var ok = Array.prototype.some.call(group, function (r) { return r.checked; });
      markError(group[0], !ok);
      if (!ok && !firstBad) firstBad = group[0];
    });

    // required checkbox: consent
    step.querySelectorAll('input[type="checkbox"][required]').forEach(function (el) {
      markError(el, !el.checked);
      if (!el.checked && !firstBad) firstBad = el;
    });

    // step 2 special case: at least one scope box
    if (n === 2) {
      var scopes = step.querySelectorAll('input[name="scope"]');
      var anyScope = Array.prototype.some.call(scopes, function (c) { return c.checked; });
      markError(scopes[0], !anyScope);
      if (!anyScope && !firstBad) firstBad = scopes[0];
    }

    if (firstBad) {
      var box = firstBad.closest('.qfield') || firstBad.closest('fieldset');
      if (box) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      try { firstBad.focus({ preventScroll: true }); } catch (e) { /* older browsers */ }
      return false;
    }
    return true;
  }

  // clear an error as soon as the field is fixed
  form.addEventListener('input', function (e) {
    var box = e.target.closest('.qfield') || e.target.closest('fieldset');
    if (box && box.classList.contains('has-error')) box.classList.remove('has-error');
    updateEstimate();
  });
  form.addEventListener('change', updateEstimate);

  btnNext.addEventListener('click', function () {
    if (!validateStep(current)) return;
    if (current < total) { showStep(current + 1); return; }
    submit();
  });
  btnBack.addEventListener('click', function () {
    if (current > 1) showStep(current - 1);
  });

  // Enter advances instead of submitting the whole form early
  form.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      btnNext.click();
    }
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  /* --- Live estimate ---------------------------------------------------- */
  var STORY_MULT = { '1 story': 1, '2 stories': 1.35, '3+ stories': 1.75 };

  function val(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked, select[name="' + name + '"]');
    return el ? el.value : '';
  }
  function round50(n) { return Math.round(n / 50) * 50; }

  function updateEstimate() {
    var isCommercial = val('propertyType') === 'Commercial property';
    var checked = Array.prototype.slice.call(form.querySelectorAll('input[name="scope"]:checked'));
    var rows = [];

    var propType = val('propertyType');
    if (propType) rows.push(['Property', propType]);
    var stories = val('stories');
    if (stories) rows.push(['Height', stories]);
    if (checked.length) {
      rows.push(['Lighting', checked.map(function (c) {
        return c.parentNode.querySelector('.qopt__label').textContent;
      }).join(', ')]);
    }
    var color = val('color');
    if (color && checked.length) rows.push(['Color', color]);
    var timing = val('timing');
    if (timing) rows.push(['Install', timing]);

    // summary rows
    sumEl.innerHTML = rows.length
      ? rows.map(function (r) {
          return '<li><span>' + r[0] + '</span><span>' + r[1] + '</span></li>';
        }).join('')
      : '<li class="qsummary__empty">Nothing selected yet.</li>';

    // commercial is always custom-quoted
    if (isCommercial) {
      estEl.classList.remove('qest--empty');
      estEl.textContent = 'Custom quote';
      estNote.textContent = 'Commercial properties are priced per site. We usually have a number back within one business day.';
      return;
    }

    if (!checked.length || !stories) {
      estEl.classList.add('qest--empty');
      estEl.textContent = 'Answer a few questions…';
      estNote.textContent = 'This is a rough range based on similar homes — not a binding quote.';
      return;
    }

    var base = checked.reduce(function (sum, c) { return sum + Number(c.dataset.price || 0); }, 0);
    if (base === 0) base = 1200; // "not sure yet" only — assume a typical Signature

    var est = base * (STORY_MULT[stories] || 1);
    var low = Math.max(850, round50(est * 0.85));
    var high = Math.max(low + 300, round50(est * 1.2));

    estEl.classList.remove('qest--empty');
    estEl.textContent = '$' + low.toLocaleString() + '–$' + high.toLocaleString();
    estNote.textContent = 'Rough range for a home like yours, everything included — install, all-season service, and takedown. Your real quote comes from actual roofline measurements.';
  }

  /* --- Preselect from ?package= ----------------------------------------- */
  (function preselect() {
    var pkg = new URLSearchParams(window.location.search).get('package');
    if (!pkg) return;
    var map = {
      roofline:  ['Roofline'],
      signature: ['Roofline', 'Trees', 'Walkway markers'],
      estate:    ['Roofline', 'Trees', 'Shrubs & landscape', 'Wreaths & garland', 'Walkway markers']
    };
    var want = map[pkg.toLowerCase()];
    if (!want) return;
    form.querySelectorAll('input[name="scope"]').forEach(function (c) {
      if (want.indexOf(c.value) > -1) c.checked = true;
    });
    if (pkg.toLowerCase() === 'estate') {
      var three = form.querySelector('input[name="stories"][value="2 stories"]');
      if (three) three.checked = true;
    }
    updateEstimate();
  })();

  /* --- Submission ------------------------------------------------------- */
  function collect() {
    var data = {};
    new FormData(form).forEach(function (v, k) {
      if (data[k] === undefined) data[k] = v;
      else if (Array.isArray(data[k])) data[k].push(v);
      else data[k] = [data[k], v];
    });
    if (Array.isArray(data.scope)) data.scope = data.scope.join(', ');
    data.estimateShown = estEl.textContent;
    data.submittedAt = new Date().toISOString();
    data.source = document.referrer || 'direct';
    return data;
  }

  function mailtoFor(data) {
    var body = Object.keys(data)
      .filter(function (k) { return k !== 'company_website' && data[k]; })
      .map(function (k) { return k + ': ' + data[k]; })
      .join('\n');
    return 'mailto:' + CONFIG.fallbackEmail +
      '?subject=' + encodeURIComponent('Quote request — ' + (data.address || 'new lead')) +
      '&body=' + encodeURIComponent(body);
  }

  function succeed(data, demo) {
    var name = document.getElementById('qname');
    var addr = document.getElementById('qaddr');
    if (name && data.firstName) name.textContent = data.firstName;
    if (addr && data.address) addr.textContent = data.address;

    document.getElementById('qprogress').style.display = 'none';
    form.style.display = 'none';
    nav.style.display = 'none';
    done.classList.add('is-active');
    done.focus && done.focus();
    window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });

    if (demo) {
      var d = document.createElement('p');
      d.className = 'qfallback is-visible';
      d.style.maxWidth = '460px';
      d.style.margin = '1.5rem auto 0';
      d.innerHTML = '<strong>Demo mode.</strong> Nothing was actually sent — no form endpoint is configured yet. ' +
                    'Set <code>endpoint</code> in <code>assets/js/config.js</code> to start receiving real leads.';
      done.querySelector('.qdone__next').after(d);
    }
  }

  function submit() {
    var data = collect();
    if (data.company_website) return;           // honeypot tripped — silently drop

    btnNext.disabled = true;
    btnNext.textContent = 'Sending…';

    if (!CONFIG.endpoint) {
      console.warn('[EverGlow] DEMO MODE: no endpoint set in assets/js/config.js. Payload:', data);
      setTimeout(function () { succeed(data, true); }, 550);
      return;
    }

    fetch(CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        succeed(data, false);
      })
      .catch(function (err) {
        console.error('[EverGlow] Quote submission failed:', err);
        btnNext.disabled = false;
        btnNext.innerHTML = 'Try again &rarr;';
        fallback.classList.add('is-visible');
        var link = document.getElementById('qmailto');
        if (link) link.href = mailtoFor(data);
        fallback.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
  }

  /* --- Init ------------------------------------------------------------- */
  showStep(1);
  updateEstimate();
})();

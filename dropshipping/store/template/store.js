/* =========================================================================
   One-product store behavior: photo gallery, option and bundle selection,
   the delivery estimate, the sticky buy bar, ad pixels, and the hand-off to
   checkout. Settings arrive in window.STORE, written by build.mjs from
   product.json.
   ========================================================================= */
(function () {
  'use strict';
  var S = window.STORE;
  if (!S) return;
  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  var money = function (n) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: S.currency,
      minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2
    }).format(n);
  };

  /* --- Ad pixels: loaded only when an ID is set in product.json ---------- */
  var T = S.tracking || {};
  if (T.metaPixelId) {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', T.metaPixelId);
    window.fbq('track', 'PageView');
  }
  if (T.tiktokPixelId) {
    !function (w, d, t) {
      w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || [];
      ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
      ttq.setAndDefer = function (o, m) { o[m] = function () { o.push([m].concat(Array.prototype.slice.call(arguments, 0))); }; };
      for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.load = function (id) {
        var u = 'https://analytics.tiktok.com/i18n/pixel/events.js';
        ttq._i = ttq._i || {}; ttq._i[id] = []; ttq._i[id]._u = u; ttq._t = ttq._t || {}; ttq._t[id] = +new Date();
        var s = d.createElement('script'); s.async = !0; s.src = u + '?sdkid=' + id + '&lib=' + t;
        var x = d.getElementsByTagName('script')[0]; x.parentNode.insertBefore(s, x);
      };
      ttq.load(T.tiktokPixelId); ttq.page();
    }(window, document, 'ttq');
  }
  if (T.ga4Id) {
    var g = document.createElement('script');
    g.async = true; g.src = 'https://www.googletagmanager.com/gtag/js?id=' + T.ga4Id;
    document.head.appendChild(g);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', T.ga4Id);
  }
  function track(meta, tiktok, ga, value, qty) {
    var item = { content_ids: [S.sku], content_name: S.name, content_type: 'product', value: value, currency: S.currency };
    try {
      if (window.fbq) window.fbq('track', meta, item);
      if (window.ttq) window.ttq.track(tiktok, { contents: [{ content_id: S.sku, content_name: S.name, quantity: qty || 1 }], content_type: 'product', value: value, currency: S.currency });
      if (window.gtag) window.gtag('event', ga, { currency: S.currency, value: value, items: [{ item_id: S.sku, item_name: S.name, quantity: qty || 1 }] });
    } catch (e) { /* tracking must never block a sale */ }
  }
  track('ViewContent', 'ViewContent', 'view_item', S.bundles[0].price, 1);

  /* --- Gallery ----------------------------------------------------------- */
  var slides = $$('.gallery__img');
  var thumbs = $$('.gallery__thumb');
  function showSlide(i) {
    slides.forEach(function (el, n) { el.classList.toggle('is-on', n === i); });
    thumbs.forEach(function (el, n) {
      el.classList.toggle('is-on', n === i);
      if (n === i) el.setAttribute('aria-current', 'true'); else el.removeAttribute('aria-current');
    });
  }
  thumbs.forEach(function (el) {
    el.addEventListener('click', function () { showSlide(Number(el.dataset.index)); });
  });

  /* --- Options and bundles ---------------------------------------------- */
  var form = $('[data-buy-form]');
  var stickyDetail = $('[data-sticky-detail]');
  var groups = S.options || [];
  /* The variant name ("Medium / Walnut") is what checkout.variantIds and
     checkout.links are keyed by. An option's priceDelta is added per unit. */
  function selection() {
    var names = [];
    var delta = 0;
    groups.forEach(function (g, gi) {
      var el = $('input[name="option-' + gi + '"]:checked', form);
      var name = el ? el.value : g.values[0].name;
      names.push(name);
      g.values.forEach(function (v) { if (v.name === name) delta += v.delta; });
    });
    var bun = $('input[name="bundle"]:checked', form);
    var qty = bun ? Number(bun.value) : S.bundles[0].qty;
    var bundle = S.bundles.filter(function (b) { return b.qty === qty; })[0] || S.bundles[0];
    return {
      names: names,
      variant: names.length ? names.join(' / ') : 'default',
      bundle: bundle,
      unit: S.bundles[0].price + delta,
      price: Math.round((bundle.price + delta * qty) * 100) / 100
    };
  }
  function describe(sel) {
    return sel.names.concat(S.bundles.length > 1 ? [sel.bundle.label] : []).join(' · ') || sel.bundle.label;
  }
  function refresh() {
    var sel = selection();
    $$('[data-buy-price]').forEach(function (el) { el.textContent = money(sel.price); });
    $$('[data-price]').forEach(function (el) { el.textContent = money(sel.unit); });
    sel.names.forEach(function (n, gi) {
      var el = $('[data-option-name="' + gi + '"]');
      if (el) el.textContent = n;
    });
    if (stickyDetail) stickyDetail.textContent = describe(sel);
  }
  $$('input[name^="option-"]', form).forEach(function (el) {
    el.addEventListener('change', function () {
      if (el.dataset.gallery !== undefined) showSlide(Number(el.dataset.gallery));
      refresh();
    });
  });
  $$('input[name="bundle"]', form).forEach(function (el) { el.addEventListener('change', refresh); });
  refresh();

  /* --- Checkout hand-off -------------------------------------------------
     shopify: a cart link that drops the buyer straight into Shopify checkout.
     links:   one pre-made payment link per option and bundle (Stripe, etc.).
     demo:    shows a notice instead of charging anyone.
     Ad click IDs and UTM tags are passed along so orders can be traced to ads. */
  function passThrough(url) {
    var keep = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'ttclid', 'gclid'];
    var here = new URLSearchParams(window.location.search);
    var out = new URL(url);
    keep.forEach(function (k) { if (here.get(k) && !out.searchParams.has(k)) out.searchParams.set(k, here.get(k)); });
    return out.toString();
  }
  function checkoutUrl(sel) {
    var c = S.checkout || {};
    if (c.mode === 'shopify') {
      var id = (c.variantIds || {})[sel.variant];
      if (!id || !c.shopifyDomain) return null;
      var url = 'https://' + c.shopifyDomain + '/cart/' + id + ':' + sel.bundle.qty;
      var code = (c.discountCodes || {})[String(sel.bundle.qty)];
      return passThrough(url + (code ? '?discount=' + encodeURIComponent(code) : ''));
    }
    if (c.mode === 'links') {
      var link = (c.links || {})[sel.variant + '|' + sel.bundle.qty];
      return link ? passThrough(link) : null;
    }
    return null;
  }
  var notice = $('[data-demo-notice]');
  function buy() {
    var sel = selection();
    track('AddToCart', 'AddToCart', 'add_to_cart', sel.price, sel.bundle.qty);
    var url = checkoutUrl(sel);
    if (!url) {
      $('[data-demo-summary]').textContent = describe(sel) + ', ' + money(sel.price);
      if (notice.showModal) notice.showModal(); else notice.setAttribute('open', '');
      return;
    }
    track('InitiateCheckout', 'InitiateCheckout', 'begin_checkout', sel.price, sel.bundle.qty);
    $$('[data-buy-label]').forEach(function (el) { el.textContent = 'Opening checkout…'; });
    /* A short pause lets the pixel events send before the page unloads. */
    window.setTimeout(function () { window.location.href = url; }, 250);
  }
  form.addEventListener('submit', function (e) { e.preventDefault(); buy(); });
  var stickyBtn = $('[data-sticky-buy]');
  if (stickyBtn) stickyBtn.addEventListener('click', buy);
  /* Coming back from checkout with the browser's Back button restores the label. */
  window.addEventListener('pageshow', function () {
    $$('[data-buy-label]').forEach(function (el) { el.textContent = S.cta; });
  });

  /* --- Delivery estimate: today + packing days + transit days ------------ */
  var eta = $('[data-eta]');
  if (eta) {
    var day = 86400000;
    var from = new Date(Date.now() + (S.shipping.processingDays[0] + S.shipping.transitDays[0]) * day);
    var to = new Date(Date.now() + (S.shipping.processingDays[1] + S.shipping.transitDays[1]) * day);
    var fmt = function (d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
    eta.textContent = fmt(from) + ' – ' + fmt(to);
  }

  /* --- Sticky buy bar: on phones, shown whenever the main button is off screen -- */
  var sticky = $('[data-sticky]');
  var mainBtn = $('[data-buy]');
  if (sticky && mainBtn && 'IntersectionObserver' in window) {
    sticky.hidden = false;
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      sticky.classList.toggle('is-on', !e.isIntersecting);
    }).observe(mainBtn);
  }
})();

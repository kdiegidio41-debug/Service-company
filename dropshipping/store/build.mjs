#!/usr/bin/env node
/* =========================================================================
   One-product store generator.

     node build.mjs <slug>        builds products/<slug>/ into dist/<slug>/
     node build.mjs <slug> --strict   exits with an error if any blocker remains

   Reads products/<slug>/product.json and products/<slug>/img/, and writes a
   complete static store: the product page, five policy pages, a 404 page,
   robots.txt, sitemap.xml and cache headers. No dependencies.

   Every field in product.json is documented in README.md.
   ========================================================================= */
import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--'));
const strict = args.includes('--strict');

if (!slug) {
  console.error('Usage: node build.mjs <slug> [--strict]');
  process.exit(1);
}

const src = path.join(root, 'products', slug);
const out = path.join(root, 'dist', slug);
const configPath = path.join(src, 'product.json');
if (!existsSync(configPath)) {
  console.error(`No product found at ${path.relative(process.cwd(), configPath)}`);
  process.exit(1);
}
const cfg = JSON.parse(await readFile(configPath, 'utf8'));

/* --- Preflight report ---------------------------------------------------- */
const report = { blocker: [], warning: [], info: [] };
const flag = (level, msg) => report[level].push(msg);
const isPlaceholder = (v) => !v || /TODO|example\.com|your-store/i.test(String(v));

/* --- Small helpers ------------------------------------------------------- */
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
/* Copy may mark emphasis with *asterisks*; everything else is escaped. */
const rich = (s) => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');
const money = (n) => {
  const whole = Number.isInteger(n);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: cfg.product.currency || 'USD',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2
  }).format(n);
};
const paras = (list) => [].concat(list || []).map((p) => `<p>${rich(p)}</p>`).join('\n');

const brand = cfg.brand;
const biz = cfg.business;
const product = cfg.product;
const shipping = cfg.shipping;
const returns = cfg.returns;
const siteUrl = String(cfg.site.url || '').replace(/\/$/, '');
const single = product.bundles[0];

/* --- Images: real file if present, labeled placeholder if not ----------- */
const placeholders = new Map();
function imageSrc(image) {
  if (existsSync(path.join(src, 'img', image.file))) return `img/${image.file}`;
  const name = `${image.file.replace(/\.[^.]+$/, '')}.placeholder.svg`;
  if (!placeholders.has(name)) {
    placeholders.set(name, image);
    flag('blocker', `Photo missing: img/${image.file} (${image.w}x${image.h}). ${image.shot || image.alt}`);
  }
  return `img/${name}`;
}
function placeholderSvg(image) {
  const { w, h } = image;
  const label = (image.shot || image.alt || '').slice(0, 140);
  const words = label.split(' ');
  const lines = [];
  let line = '';
  const perLine = Math.max(18, Math.round(w / 26));
  for (const word of words) {
    if ((line + ' ' + word).trim().length > perLine) {
      lines.push(line.trim());
      line = word;
    } else line += ' ' + word;
  }
  if (line.trim()) lines.push(line.trim());
  const size = Math.round(w / 30);
  const startY = h / 2 + size * 1.2;
  const text = lines
    .slice(0, 5)
    .map((l, i) => `<text x="${w / 2}" y="${startY + i * size * 1.45}" font-size="${size}" fill="#8a8378" text-anchor="middle" font-family="system-ui,sans-serif">${esc(l)}</text>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#efeae2"/><stop offset="1" stop-color="#ddd6ca"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>
<g fill="none" stroke="#a39b8d" stroke-width="${Math.max(3, w / 300)}" stroke-linecap="round" stroke-linejoin="round" transform="translate(${w / 2 - size * 1.58} ${h / 2 - size * 5.2}) scale(${size / 12})">
<rect x="3" y="8" width="32" height="24" rx="4"/><circle cx="19" cy="20" r="6.5"/><path d="M12 8l2.5-4h9L26 8"/></g>
<text x="${w / 2}" y="${h / 2 - size * 0.2}" font-size="${size * 0.8}" fill="#a39b8d" text-anchor="middle" font-family="system-ui,sans-serif" letter-spacing="${size * 0.12}">PHOTO NEEDED</text>
${text}
</svg>`;
}
const img = (image, { eager = false, cls = '', sizes = '' } = {}) =>
  `<img src="${imageSrc(image)}" alt="${esc(image.alt)}" width="${image.w}" height="${image.h}"${cls ? ` class="${cls}"` : ''}${sizes ? ` sizes="${sizes}"` : ''} ${eager ? 'fetchpriority="high" decoding="sync"' : 'loading="lazy" decoding="async"'}>`;

/* --- Icons --------------------------------------------------------------- */
const icon = {
  check: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 10.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  cross: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 5.5l9 9m0-9l-9 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  truck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="7" cy="17" r="1.9" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="17" r="1.9" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7L4 11l4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 11h10a5 5 0 010 10h-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7.5 3v5.5c0 4.5-3 8-7.5 9.5-4.5-1.5-7.5-5-7.5-9.5V6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.5 12l2.5 2.5 4.5-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  star: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.8l2.5 5.2 5.7.8-4.1 4 1 5.7L10 14.8l-5.1 2.7 1-5.7-4.1-4 5.7-.8z" fill="currentColor"/></svg>'
};

/* --- Shared page chrome -------------------------------------------------- */
const c = brand.colors;
const themeCss = `:root{--bg:${c.bg};--surface:${c.surface};--ink:${c.ink};--muted:${c.muted};--accent:${c.accent};--accent-ink:${c.accentInk};--line:${c.line};--tint:${c.tint || c.surface}}`;

const head = ({ title, description, file, extra = '', index = true }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${index ? '' : '<meta name="robots" content="noindex">\n'}<link rel="canonical" href="${esc(siteUrl + '/' + (file === 'index.html' ? '' : file))}">
<meta name="theme-color" content="${esc(c.bg)}">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preload" href="assets/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/fraunces-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/store.css">
<style>${themeCss}</style>
${extra}</head>`;

const header = (home = '') => `<a class="skip" href="#main">Skip to content</a>
${cfg.page.announcement ? `<p class="announce">${rich(cfg.page.announcement)}</p>` : ''}
<header class="site-header">
  <div class="wrap site-header__in">
    <a class="wordmark" href="${home || './'}" aria-label="${esc(brand.name)} home">${esc(brand.wordmark || brand.name)}</a>
    <nav class="site-nav" aria-label="Page sections">
      ${(cfg.page.nav || []).map((n) => `<a href="${home}${esc(n.href)}">${esc(n.label)}</a>`).join('\n      ')}
    </nav>
    <a class="btn btn--small" href="${home}#buy">${esc(cfg.page.headerCta || 'Shop now')}</a>
  </div>
</header>`;

const footer = () => `<footer class="site-footer">
  <div class="wrap site-footer__in">
    <div class="site-footer__brand">
      <p class="wordmark">${esc(brand.wordmark || brand.name)}</p>
      <p>${rich(brand.blurb || '')}</p>
    </div>
    <nav aria-label="Store policies">
      <p class="site-footer__h">Help</p>
      <a href="shipping.html">Shipping</a>
      <a href="returns.html">Returns &amp; refunds</a>
      <a href="contact.html">Contact</a>
    </nav>
    <nav aria-label="Legal">
      <p class="site-footer__h">Legal</p>
      <a href="privacy.html">Privacy Policy</a>
      <a href="terms.html">Terms of Service</a>
    </nav>
    <div>
      <p class="site-footer__h">Questions?</p>
      <a href="mailto:${esc(biz.email)}">${esc(biz.email)}</a>
      <p class="site-footer__small">We reply within ${esc(biz.replyTime || 'one business day')}.</p>
    </div>
  </div>
  <div class="wrap site-footer__legal">
    <p>&copy; ${new Date().getFullYear()} ${esc(biz.legalName)}. All rights reserved.</p>
    <p>${icon.lock} Secure checkout. Card details never touch this site.</p>
  </div>
</footer>`;

/* --- Buy box ------------------------------------------------------------- */
/* product.options is one option group or a list of groups (for example Size and
   Finish). A value can carry priceDelta, added to the price of each unit. */
const optionGroups = (Array.isArray(product.options) ? product.options : product.options ? [product.options] : []).filter(
  (g) => g && g.values && g.values.length
);
const hasOptions = optionGroups.length > 0;
const defaultBundle = product.bundles.find((b) => b.default) || single;
const defaultDelta = optionGroups.reduce((s, g) => s + (g.values[0].priceDelta || 0), 0);
const startUnit = single.price + defaultDelta;
const startPrice = defaultBundle.price + defaultDelta * defaultBundle.qty;
const lowUnit = single.price + optionGroups.reduce((s, g) => s + Math.min(...g.values.map((v) => v.priceDelta || 0)), 0);
/* Variant names match Shopify's style: "Medium / Walnut". */
const variantNames = hasOptions
  ? optionGroups.reduce((acc, g) => acc.flatMap((a) => g.values.map((v) => (a ? `${a} / ${v.name}` : v.name))), [''])
  : ['default'];
const startDetail =
  [...optionGroups.map((g) => g.values[0].name), ...(product.bundles.length > 1 ? [defaultBundle.label] : [])].join(' · ') || single.label;

function buyBox() {
  const gallery = product.gallery;
  const thumbs =
    gallery.length > 1
      ? `<div class="gallery__thumbs" role="group" aria-label="Product photos">
        ${gallery
          .map(
            (g, i) =>
              `<button type="button" class="gallery__thumb${i === 0 ? ' is-on' : ''}" data-index="${i}" aria-label="Show photo ${i + 1}: ${esc(g.alt)}"${i === 0 ? ' aria-current="true"' : ''}><img src="${imageSrc(g)}" alt="" width="${g.w}" height="${g.h}" loading="lazy" decoding="async"></button>`
          )
          .join('\n        ')}
      </div>`
      : '';

  const optionHtml = optionGroups
    .map((g, gi) => {
      const pills = g.style === 'pills';
      const guide = g.guideHref ? `<a class="opt__guide" href="${esc(g.guideHref)}">${esc(g.guideLabel || 'Size guide')}</a>` : '';
      const values = g.values
        .map((v, i) => {
          const attrs = `type="radio" name="option-${gi}" value="${esc(v.name)}"${i === 0 ? ' checked' : ''}${Number.isInteger(v.galleryIndex) ? ` data-gallery="${v.galleryIndex}"` : ''}`;
          if (pills)
            return `<label class="pill"><input ${attrs}><span class="pill__text">${esc(v.name)}</span>${v.note ? `<span class="pill__note">${esc(v.note)}</span>` : ''}</label>`;
          return `<label class="swatch" title="${esc(v.name)}"><input ${attrs}><span class="swatch__dot" style="background:${esc(v.swatch)}"></span><span class="sr">${esc(v.name)}</span></label>`;
        })
        .join('\n          ');
      return `<fieldset class="opt">
        <legend>${esc(g.label)}: <span data-option-name="${gi}">${esc(g.values[0].name)}</span>${guide}</legend>
        <div class="opt__row${pills ? ' opt__row--pills' : ''}">
          ${values}
        </div>
      </fieldset>`;
    })
    .join('\n        ');

  const bundleHtml =
    product.bundles.length > 1
      ? `<fieldset class="bundles">
        <legend>${esc(product.bundleLabel || 'Choose your set')}</legend>
        ${product.bundles
          .map((b, i) => {
            const full = single.price * b.qty;
            const save = Math.round((full - b.price) * 100) / 100;
            if (save < 0) flag('blocker', `Bundle of ${b.qty} costs more than ${b.qty} singles.`);
            const on = b.default ?? i === 0;
            return `<label class="bundle">
          <input type="radio" name="bundle" value="${b.qty}"${on ? ' checked' : ''}>
          <span class="bundle__main"><span class="bundle__label">${esc(b.label)}</span>${b.note ? `<span class="bundle__note">${esc(b.note)}</span>` : ''}</span>
          <span class="bundle__price"><span class="bundle__now">${money(b.price)}</span>${save > 0 ? `<span class="bundle__save">Save ${money(save)}</span>` : ''}</span>
          ${b.badge ? `<span class="bundle__badge">${esc(b.badge)}</span>` : ''}
        </label>`;
          })
          .join('\n        ')}
      </fieldset>`
      : '';

  const reviews = cfg.reviews || [];
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const ratingHtml = reviews.length
    ? `<a class="rating" href="#reviews"><span class="stars" style="--rating:${avg.toFixed(2)}" role="img" aria-label="Rated ${avg.toFixed(1)} out of 5"></span> ${avg.toFixed(1)} (${reviews.length} review${reviews.length === 1 ? '' : 's'})</a>`
    : '';

  const compare = product.compareAt && product.compareAt > single.price ? `<s class="price__was">${money(product.compareAt)}</s>` : '';

  return `<section class="buy" id="buy" aria-labelledby="product-name">
  <div class="wrap buy__in">
    <div class="gallery">
      <div class="gallery__main">
        ${gallery.map((g, i) => img(g, { eager: i === 0, cls: `gallery__img${i === 0 ? ' is-on' : ''}`, sizes: '(min-width: 900px) 52vw, 100vw' })).join('\n        ')}
      </div>
      ${thumbs}
    </div>
    <div class="buy__info">
      ${product.eyebrow ? `<p class="eyebrow">${esc(product.eyebrow)}</p>` : ''}
      <h1 id="product-name">${rich(product.name)}</h1>
      ${ratingHtml}
      <p class="buy__tagline">${rich(product.tagline)}</p>
      <p class="price"><span class="price__now" data-price>${money(startUnit)}</span>${compare}<span class="price__ship">${shipping.price === 0 ? 'Free US shipping' : `+ ${money(shipping.price)} shipping`}</span></p>
      <ul class="ticks">
        ${product.bullets.map((b) => `<li>${icon.check}<span>${rich(b)}</span></li>`).join('\n        ')}
      </ul>
      <form class="buy__form" data-buy-form>
        ${optionHtml}
        ${bundleHtml}
        <button class="btn btn--buy" type="submit" data-buy><span data-buy-label>${esc(product.cta || 'Buy now')}</span><span class="btn__price" data-buy-price>${money(startPrice)}</span></button>
      </form>
      <p class="eta">${icon.truck}<span>Order today, arrives <strong data-eta>in ${shipping.processingDays[0] + shipping.transitDays[0]} to ${shipping.processingDays[1] + shipping.transitDays[1]} days</strong></span></p>
      <ul class="trust">
        <li>${icon.back}<span>${returns.days}-day returns</span></li>
        <li>${icon.truck}<span>Tracked delivery</span></li>
        <li>${icon.lock}<span>Secure checkout</span></li>
      </ul>
    </div>
  </div>
</section>`;
}

/* --- Story sections ------------------------------------------------------ */
const sectionHead = (s, id) =>
  `${s.eyebrow ? `<p class="eyebrow">${esc(s.eyebrow)}</p>` : ''}<h2${id ? ` id="${id}"` : ''}>${rich(s.headline)}</h2>${s.lede ? `<p class="lede">${rich(s.lede)}</p>` : ''}`;

const sections = {
  problem: (s) => `<section class="sec sec--tint" id="why">
  <div class="wrap narrow">
    ${sectionHead(s)}
    ${paras(s.body)}
  </div>
  ${
    s.points
      ? `<div class="wrap cards cards--${s.points.length}">
    ${s.points.map((p) => `<div class="card"><h3>${rich(p.title)}</h3><p>${rich(p.text)}</p></div>`).join('\n    ')}
  </div>`
      : ''
  }
</section>`,

  features: (s) => `<section class="sec" id="features">
  <div class="wrap narrow center">${sectionHead(s)}</div>
  <div class="wrap features">
    ${s.items
      .map(
        (f) => `<div class="feature">
      <div class="feature__media">${img(f.image, { sizes: '(min-width: 900px) 46vw, 100vw' })}</div>
      <div class="feature__text"><h3>${rich(f.title)}</h3>${paras(f.text)}</div>
    </div>`
      )
      .join('\n    ')}
  </div>
</section>`,

  steps: (s) => `<section class="sec sec--tint" id="how">
  <div class="wrap narrow center">${sectionHead(s)}</div>
  <ol class="wrap cards cards--${s.items.length} steps">
    ${s.items.map((it) => `<li class="card"><h3>${rich(it.title)}</h3><p>${rich(it.text)}</p></li>`).join('\n    ')}
  </ol>
</section>`,

  compare: (s) => `<section class="sec" id="compare">
  <div class="wrap narrow center">${sectionHead(s)}</div>
  <div class="wrap narrow">
    <table class="compare">
      <thead><tr><th scope="col"><span class="sr">Feature</span></th><th scope="col" class="compare__us">${esc(s.columns[0])}</th><th scope="col">${esc(s.columns[1])}</th></tr></thead>
      <tbody>
        ${s.rows
          .map(
            (r) =>
              `<tr><th scope="row">${rich(r[0])}</th><td class="compare__us"><span class="yes">${icon.check}</span>${rich(r[1])}</td><td><span class="no">${icon.cross}</span>${rich(r[2])}</td></tr>`
          )
          .join('\n        ')}
      </tbody>
    </table>
    ${s.note ? `<p class="fine">${rich(s.note)}</p>` : ''}
  </div>
</section>`,

  specs: (s) => `<section class="sec sec--tint" id="specs">
  <div class="wrap specs">
    <div>
      ${sectionHead(s)}
      <dl class="spec-list">
        ${s.specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${rich(v)}</dd></div>`).join('\n        ')}
      </dl>
    </div>
    <div class="box">
      <h3>${esc(s.boxTitle || "What's in the box")}</h3>
      <ul class="ticks">
        ${s.box.map((b) => `<li>${icon.check}<span>${rich(b)}</span></li>`).join('\n        ')}
      </ul>
      ${s.boxNote ? `<p class="fine">${rich(s.boxNote)}</p>` : ''}
    </div>
  </div>
</section>`,

  sizes: (s) => `<section class="sec" id="sizes">
  <div class="wrap narrow">
    <div class="center">${sectionHead(s)}</div>
    <div class="table-scroll">
      <table class="compare sizes">
        <thead><tr>${s.columns.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>
          ${s.rows.map((r) => `<tr><th scope="row">${rich(r[0])}</th>${r.slice(1).map((c) => `<td>${rich(c)}</td>`).join('')}</tr>`).join('\n          ')}
        </tbody>
      </table>
    </div>
    ${s.steps ? `<ol class="measure">${s.steps.map((t) => `<li>${rich(t)}</li>`).join('')}</ol>` : ''}
    ${s.note ? `<p class="fine">${rich(s.note)}</p>` : ''}
  </div>
</section>`,

  /* Renders only when real reviews are supplied in product.json. */
  reviews: (s) => {
    const reviews = cfg.reviews || [];
    if (!reviews.length) return '';
    return `<section class="sec" id="reviews">
  <div class="wrap narrow center">${sectionHead(s)}</div>
  <div class="wrap cards cards--3">
    ${reviews
      .map(
        (r) =>
          `<figure class="card review"><span class="stars" style="--rating:${r.rating}" role="img" aria-label="${r.rating} out of 5 stars"></span><blockquote>${esc(r.text)}</blockquote><figcaption>${esc(r.name)}${r.verified ? ' <span class="review__v">Verified buyer</span>' : ''}</figcaption></figure>`
      )
      .join('\n    ')}
  </div>
</section>`;
  },

  guarantee: (s) => `<section class="sec" id="guarantee">
  <div class="wrap narrow">
    <div class="guarantee">
      <span class="guarantee__icon">${icon.shield}</span>
      <div><h2>${rich(s.headline)}</h2>${paras(s.text)}<p><a href="returns.html">Read the full return policy</a></p></div>
    </div>
  </div>
</section>`,

  faq: (s) => `<section class="sec sec--tint" id="faq">
  <div class="wrap narrow">
    <div class="center">${sectionHead(s)}</div>
    <div class="faq">
      ${s.items.map((f) => `<details><summary>${rich(f.q)}</summary><div>${paras(f.a)}</div></details>`).join('\n      ')}
    </div>
  </div>
</section>`,

  cta: (s) => `<section class="sec cta">
  <div class="wrap narrow center">
    <h2>${rich(s.headline)}</h2>
    ${s.text ? `<p class="lede">${rich(s.text)}</p>` : ''}
    <a class="btn btn--buy btn--inline" href="#buy">${esc(s.button || product.cta || 'Buy now')}<span class="btn__price" data-buy-price>${money(startPrice)}</span></a>
    <p class="fine">${returns.days}-day returns &middot; ${shipping.price === 0 ? 'Free tracked US shipping' : 'Tracked US shipping'}</p>
  </div>
</section>`
};

/* --- Structured data ----------------------------------------------------- */
function jsonLd() {
  const reviews = cfg.reviews || [];
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name.replace(/\*/g, ''),
    description: cfg.site.description,
    sku: product.sku,
    brand: { '@type': 'Brand', name: brand.name },
    image: product.gallery.map((g) => `${siteUrl}/img/${g.file}`),
    offers: {
      '@type': 'Offer',
      url: siteUrl + '/',
      priceCurrency: product.currency || 'USD',
      price: lowUnit.toFixed(2),
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: { '@type': 'MonetaryAmount', value: shipping.price.toFixed(2), currency: product.currency || 'USD' },
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'US' },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: shipping.processingDays[0], maxValue: shipping.processingDays[1], unitCode: 'DAY' },
          transitTime: { '@type': 'QuantitativeValue', minValue: shipping.transitDays[0], maxValue: shipping.transitDays[1], unitCode: 'DAY' }
        }
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'US',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: returns.days,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: returns.returnShippingPaidBy === 'store' ? 'https://schema.org/FreeReturn' : 'https://schema.org/ReturnShippingFees'
      }
    }
  };
  /* Ratings appear in search results, so they are only emitted for real reviews. */
  if (reviews.length) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1),
      reviewCount: reviews.length
    };
  }
  const faq = cfg.page.sections.find((s) => s.type === 'faq');
  const blocks = [data];
  if (faq) {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.items.map((f) => ({
        '@type': 'Question',
        name: f.q.replace(/\*/g, ''),
        acceptedAnswer: { '@type': 'Answer', text: [].concat(f.a).join(' ').replace(/\*/g, '') }
      }))
    });
  }
  return blocks.map((b) => `<script type="application/ld+json">${JSON.stringify(b).replace(/</g, '\\u003c')}</script>`).join('\n');
}

/* --- Data the page script needs ------------------------------------------ */
const clientConfig = {
  name: product.name.replace(/\*/g, ''),
  sku: product.sku,
  currency: product.currency || 'USD',
  cta: product.cta || 'Buy now',
  bundles: product.bundles.map((b) => ({ qty: b.qty, price: b.price, label: b.label })),
  options: optionGroups.map((g) => ({ values: g.values.map((v) => ({ name: v.name, delta: v.priceDelta || 0 })) })),
  shipping: { processingDays: shipping.processingDays, transitDays: shipping.transitDays },
  checkout: cfg.checkout,
  tracking: cfg.tracking || {}
};

/* --- Product page -------------------------------------------------------- */
function productPage() {
  const body = cfg.page.sections
    .map((s) => {
      if (!sections[s.type]) {
        flag('warning', `Unknown section type "${s.type}" was skipped.`);
        return '';
      }
      return sections[s.type](s);
    })
    .join('\n\n');
  const ogImage = `${siteUrl}/img/${cfg.site.ogImage || product.gallery[0].file}`;
  const extra = `<meta property="og:type" content="product">
<meta property="og:site_name" content="${esc(brand.name)}">
<meta property="og:title" content="${esc(cfg.site.title)}">
<meta property="og:description" content="${esc(cfg.site.description)}">
<meta property="og:url" content="${esc(siteUrl)}/">
<meta property="og:image" content="${esc(ogImage)}">
<meta name="twitter:card" content="summary_large_image">
${jsonLd()}
`;
  return `${head({ title: cfg.site.title, description: cfg.site.description, file: 'index.html', extra })}
<body>
${header()}
<main id="main">
${buyBox()}

${body}
</main>
${footer()}

<div class="sticky-buy" data-sticky hidden>
  <div class="sticky-buy__text"><strong>${esc(product.shortName || product.name.replace(/\*/g, ''))}</strong><span data-sticky-detail>${esc(startDetail)}</span></div>
  <button class="btn btn--buy" type="button" data-sticky-buy><span data-buy-label>${esc(product.cta || 'Buy now')}</span><span class="btn__price" data-buy-price>${money(startPrice)}</span></button>
</div>

<dialog class="notice" data-demo-notice aria-labelledby="demo-title">
  <h2 id="demo-title">Checkout isn't connected yet</h2>
  <p>This store is in preview mode. You chose: <strong data-demo-summary></strong></p>
  <p>To take real orders, set <code>checkout</code> in <code>product.json</code>. The steps are in the store README.</p>
  <form method="dialog"><button class="btn btn--small">Close</button></form>
</dialog>

<script>window.STORE=${JSON.stringify(clientConfig).replace(/</g, '\\u003c')};</script>
<script src="assets/store.js" defer></script>
</body>
</html>
`;
}

/* --- Policy pages -------------------------------------------------------- */
const updated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
const minDays = shipping.processingDays[0] + shipping.transitDays[0];
const maxDays = shipping.processingDays[1] + shipping.transitDays[1];
const mail = `<a href="mailto:${esc(biz.email)}">${esc(biz.email)}</a>`;

const policyPage = (file, title, description, html) => `${head({ title: `${title} | ${brand.name}`, description, file })}
<body>
${header('./')}
<main id="main" class="policy">
  <div class="wrap narrow">
    <p class="eyebrow"><a href="./">&larr; Back to the shop</a></p>
    <h1>${esc(title)}</h1>
    <p class="fine">Last updated ${updated}</p>
    ${html}
  </div>
</main>
${footer()}
</body>
</html>
`;

const policies = {
  'shipping.html': [
    'Shipping',
    `Delivery times, costs and tracking for ${brand.name} orders.`,
    `<h2>Where we ship</h2>
    <p>We currently ship to ${esc(shipping.region)}.</p>
    <h2>How long it takes</h2>
    <p>Orders are packed within ${shipping.processingDays[0]} to ${shipping.processingDays[1]} business days. Delivery then takes ${shipping.transitDays[0]} to ${shipping.transitDays[1]} days, so most orders arrive ${minDays} to ${maxDays} days after you order.</p>
    <p>${esc(shipping.origin || '')}</p>
    <h2>What it costs</h2>
    <p>${shipping.price === 0 ? 'Shipping is free on every order.' : `Shipping is a flat ${money(shipping.price)} per order.`} There are no extra fees at delivery.</p>
    <h2>Tracking</h2>
    <p>You'll get an email with a tracking link as soon as your order ships. Tracking can take a day or two to show its first update.</p>
    <h2>If something goes wrong</h2>
    <p>If your order hasn't arrived ${maxDays + 7} days after you ordered, or tracking has stopped moving for more than 7 days, email ${mail}. We'll send a replacement or refund you in full, your choice.</p>
    <p>If we can't ship your order in the time stated above, we'll email you with a new date and the option to cancel for a full refund.</p>
    <h2>Wrong address</h2>
    <p>Email us within 12 hours of ordering and we'll fix it. After an order ships we can't redirect it.</p>`
  ],
  'returns.html': [
    'Returns & refunds',
    `The ${returns.days}-day return policy for ${brand.name} orders.`,
    `<h2>${returns.days}-day returns</h2>
    <p>If you're not happy with your order, you can return it within ${returns.days} days of delivery for a refund. Items need to be ${esc(returns.condition)}.</p>
    <h2>How to start a return</h2>
    <ol>
      <li>Email ${mail} with your order number and the reason.</li>
      <li>We'll reply within ${esc(biz.replyTime || 'one business day')} with the return address and instructions.</li>
      <li>Send the item back with tracking and keep the receipt.</li>
    </ol>
    <p>${returns.returnShippingPaidBy === 'store' ? 'Return shipping is free: we send you a prepaid label.' : 'You pay return shipping, unless the item arrived damaged, defective or wrong.'}</p>
    <h2>Refunds</h2>
    <p>Once your return arrives, we refund the original payment method within 5 business days. Your bank may take a few more days to show it.</p>
    <h2>Damaged, defective or wrong item</h2>
    <p>Email ${mail} within ${returns.defectDays || 30} days of delivery with a photo. We'll send a free replacement or refund you in full, and you won't pay to send anything back.</p>
    <h2>Cancelling an order</h2>
    <p>Email us within 12 hours of ordering and we'll cancel and refund it. After that the order may already be packed, and the return steps above apply.</p>`
  ],
  'contact.html': [
    'Contact',
    `How to reach ${brand.name}.`,
    `<p>The fastest way to reach us is email. We reply within ${esc(biz.replyTime || 'one business day')}.</p>
    <p><strong>Email:</strong> ${mail}</p>
    ${biz.phone ? `<p><strong>Phone:</strong> ${esc(biz.phone)}</p>` : ''}
    <p><strong>Mailing address:</strong> ${esc(biz.legalName)}, ${esc(biz.address)}</p>
    <p class="fine">Please don't send returns to this address without emailing first. Returns go to a different address, which we'll send you.</p>
    <h2>Have an order question?</h2>
    <p>Include your order number and the email you ordered with, and we can help much faster.</p>`
  ],
  'privacy.html': [
    'Privacy Policy',
    `How ${brand.name} collects, uses and shares your information.`,
    `<p>This policy explains what ${esc(biz.legalName)} ("we", "us") collects when you visit or buy from ${esc(siteUrl.replace(/^https?:\/\//, ''))}, and what we do with it.</p>
    <h2>What we collect</h2>
    <ul>
      <li><strong>Order details:</strong> your name, email, shipping and billing address, phone number if you give it, and what you bought.</li>
      <li><strong>Payment details:</strong> handled by our checkout and payment providers. We never see or store your full card number.</li>
      <li><strong>Site activity:</strong> pages viewed, buttons clicked, device and browser type, approximate location from your IP address, and how you reached us (for example, from an ad).</li>
      <li><strong>Messages:</strong> anything you send us by email.</li>
    </ul>
    <h2>How we use it</h2>
    <ul>
      <li>To process, ship and support your order.</li>
      <li>To send order confirmations and shipping updates.</li>
      <li>To send marketing emails, only if you opted in. Every one has an unsubscribe link.</li>
      <li>To measure how the site and our ads perform, and to prevent fraud.</li>
    </ul>
    <h2>Who we share it with</h2>
    <ul>
      <li><strong>Our checkout and payment providers</strong>, to take payment.</li>
      <li><strong>Our fulfillment partner and shipping carriers</strong>, who receive your name, address and order contents so they can deliver it.</li>
      <li><strong>Advertising and analytics services</strong> such as Meta, TikTok and Google, which may use cookies or similar technology on this site to measure ad performance and show you ads. Under some state laws this can count as "sharing" or "selling" personal information. You can opt out by emailing ${mail}, by using your browser's Global Privacy Control signal, or through the ad settings of those services.</li>
      <li><strong>Authorities</strong>, when the law requires it.</li>
    </ul>
    <p>We don't sell your information for money.</p>
    <h2>Cookies</h2>
    <p>This site uses cookies and similar technology to keep checkout working and to measure visits and ads. You can block cookies in your browser settings; the store will still work.</p>
    <h2>Your choices</h2>
    <p>You can ask us to show you, correct or delete the personal information we hold about you by emailing ${mail}. We'll respond within 30 days, and we won't treat you differently for asking. We keep order records as long as tax and accounting rules require.</p>
    <h2>Children</h2>
    <p>This store is not directed to children under 13, and we don't knowingly collect their information.</p>
    <h2>Changes</h2>
    <p>If we change this policy we'll post the new version here with a new date.</p>
    <h2>Contact</h2>
    <p>${esc(biz.legalName)}, ${esc(biz.address)}. Email: ${mail}</p>`
  ],
  'terms.html': [
    'Terms of Service',
    `The terms that apply when you use or buy from ${brand.name}.`,
    `<p>These terms apply when you use this site or place an order with ${esc(biz.legalName)} ("we", "us"). By ordering, you agree to them.</p>
    <h2>Orders</h2>
    <p>Placing an order is an offer to buy. We accept it when we send your shipping confirmation. We may cancel and fully refund an order if an item is unavailable, if there is an obvious pricing error, or if we suspect fraud.</p>
    <h2>Prices and payment</h2>
    <p>Prices are in US dollars. Sales tax, where it applies, is shown at checkout before you pay.</p>
    <h2>Shipping and returns</h2>
    <p>Our <a href="shipping.html">Shipping</a> and <a href="returns.html">Returns &amp; refunds</a> pages are part of these terms.</p>
    <h2>Product information</h2>
    <p>We work to describe and photograph products accurately. Colors can look slightly different from screen to screen. If what arrives doesn't match its description, you can return it under our return policy at our cost.</p>
    <h2>Using the product</h2>
    <p>Follow the instructions included with the product. We aren't responsible for damage caused by misuse or by using the product in a way it wasn't designed for.</p>
    <h2>Our liability</h2>
    <p>To the extent the law allows, our total liability for any claim about an order is limited to the amount you paid for it. Nothing in these terms limits rights you have under consumer protection law that can't be waived.</p>
    <h2>Site content</h2>
    <p>The text, images and design on this site belong to us or are used with permission. Please don't copy them for commercial use without asking.</p>
    <h2>Governing law</h2>
    <p>These terms are governed by the laws of ${esc(biz.governingLaw || 'the state where we are registered')}.</p>
    <h2>Accessibility</h2>
    <p>We want everyone to be able to use this store. If something on the site doesn't work for you, email ${mail} and we'll help you place your order.</p>
    <h2>Contact</h2>
    <p>${esc(biz.legalName)}, ${esc(biz.address)}. Email: ${mail}</p>`
  ]
};

const notFound = `${head({ title: `Page not found | ${brand.name}`, description: 'That page does not exist.', file: '404.html', index: false })}
<body>
${header('./')}
<main id="main" class="policy">
  <div class="wrap narrow center">
    <h1>That page doesn't exist</h1>
    <p class="lede">The link may be old or mistyped.</p>
    <p><a class="btn btn--inline" href="./">Back to the shop</a></p>
  </div>
</main>
${footer()}
</body>
</html>
`;

/* --- Checks that don't depend on rendering ------------------------------- */
const co = cfg.checkout;
if (co.mode === 'demo') flag('blocker', 'Checkout is in demo mode: the buy button shows a preview notice and takes no orders.');
if (co.mode === 'shopify') {
  if (isPlaceholder(co.shopifyDomain)) flag('blocker', 'checkout.shopifyDomain is not set.');
  for (const n of variantNames) if (!co.variantIds || !co.variantIds[n]) flag('blocker', `checkout.variantIds is missing an entry for "${n}".`);
}
if (co.mode === 'links') {
  for (const n of variantNames)
    for (const b of product.bundles) if (!co.links || !co.links[`${n}|${b.qty}`]) flag('blocker', `checkout.links is missing "${n}|${b.qty}".`);
}
for (const [k, v] of Object.entries({ 'business.legalName': biz.legalName, 'business.email': biz.email, 'business.address': biz.address, 'site.url': cfg.site.url }))
  if (isPlaceholder(v)) flag('blocker', `${k} is still a placeholder. The policy pages print it.`);
/* Anything still marked TODO (a spec, a size, a claim to confirm with the supplier)
   blocks launch. Business details and the site address have their own checks above. */
const todos = [];
(function scan(value, where) {
  if (typeof value === 'string') {
    if (/\bTODO\b/.test(value)) todos.push(where);
  } else if (Array.isArray(value)) value.forEach((v, i) => scan(v, `${where}[${i}]`));
  else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value)) if (!['business', 'checkout'].includes(k) || where) scan(v, where ? `${where}.${k}` : k);
})(cfg, '');
const todoList = todos.filter((p) => p !== 'site.url' && !p.startsWith('verify'));
/* verify: claims written into the copy that must be checked against the exact
   supplier product before launch. Delete each line once it's confirmed. */
if (Array.isArray(cfg.verify) && cfg.verify.length)
  flag('blocker', `Confirm against the supplier's listing or your sample, then delete from "verify" (${cfg.verify.length}):\n      * ${cfg.verify.join('\n      * ')}`);
if (todoList.length)
  flag('blocker', `${todoList.length} field${todoList.length === 1 ? '' : 's'} still say TODO (fill them from the supplier's spec sheet): ${todoList.join(', ')}`);
const t = cfg.tracking || {};
if (!t.metaPixelId && !t.tiktokPixelId) flag('warning', 'No ad pixel ID is set. Ads can run, but the platform cannot learn who buys.');
if (!t.ga4Id) flag('info', 'No Google Analytics ID is set (optional).');
if (!(cfg.reviews || []).length) flag('info', 'No reviews supplied, so the reviews section and star rating are hidden. Add real ones as they come in.');
if (product.compareAt) flag('warning', `A crossed-out price of ${money(product.compareAt)} is shown. Only keep it if the product really sold at that price recently.`);
if (maxDays > 14) flag('warning', `Delivery can take up to ${maxDays} days. Slow shipping is the top cause of refund requests and payment disputes.`);
if (cfg.site.title.length > 60) flag('warning', `site.title is ${cfg.site.title.length} characters. Search results cut off around 60.`);
if (cfg.site.description.length > 160) flag('warning', `site.description is ${cfg.site.description.length} characters. Search results cut off around 160.`);

/* --- Write everything ---------------------------------------------------- */
await rm(out, { recursive: true, force: true });
await mkdir(path.join(out, 'assets'), { recursive: true });
await mkdir(path.join(out, 'img'), { recursive: true });

const html = productPage();
await writeFile(path.join(out, 'index.html'), html);
for (const [file, [title, description, body]] of Object.entries(policies)) await writeFile(path.join(out, file), policyPage(file, title, description, body));
await writeFile(path.join(out, '404.html'), notFound);

await cp(path.join(root, 'template', 'store.css'), path.join(out, 'assets', 'store.css'));
await cp(path.join(root, 'template', 'store.js'), path.join(out, 'assets', 'store.js'));
await cp(path.join(root, 'template', 'fonts'), path.join(out, 'assets', 'fonts'), { recursive: true });
if (existsSync(path.join(src, 'img'))) await cp(path.join(src, 'img'), path.join(out, 'img'), { recursive: true });
for (const [name, image] of placeholders) await writeFile(path.join(out, 'img', name), placeholderSvg(image));

const initial = esc((brand.wordmark || brand.name).trim()[0].toUpperCase());
await writeFile(
  path.join(out, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${c.ink}"/><text x="16" y="23" font-size="20" font-family="Georgia,serif" font-weight="600" fill="${c.bg}" text-anchor="middle">${initial}</text></svg>`
);
await writeFile(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
const today = new Date().toISOString().slice(0, 10);
await writeFile(
  path.join(out, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['', ...Object.keys(policies)]
    .map((f) => `  <url><loc>${siteUrl}/${f}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`
);
await writeFile(
  path.join(out, '_headers'),
  `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/assets/fonts/*\n  Cache-Control: public, max-age=31536000, immutable\n/img/*\n  Cache-Control: public, max-age=604800\n/assets/*\n  Cache-Control: public, max-age=3600\n`
);

/* --- Report -------------------------------------------------------------- */
const rel = path.relative(process.cwd(), out) || '.';
console.log(`\nBuilt ${brand.name} -> ${rel}/  (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB of HTML)\n`);
const titles = { blocker: 'BLOCKERS: fix before taking orders', warning: 'WARNINGS', info: 'NOTES' };
for (const level of ['blocker', 'warning', 'info']) {
  if (!report[level].length) continue;
  console.log(`${titles[level]} (${report[level].length})`);
  for (const m of report[level]) console.log(`  - ${m}`);
  console.log('');
}
if (!report.blocker.length) console.log('No blockers. Place one real test order before you run ads.\n');
if (strict && report.blocker.length) process.exit(2);

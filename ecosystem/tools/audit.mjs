#!/usr/bin/env node
/* ============================================================
   audit — local-business web presence audit.

     node ecosystem/tools/audit.mjs https://example-plumber.com
     node ecosystem/tools/audit.mjs --file saved.html --url https://…
     node ecosystem/tools/audit.mjs --file p.html --json

   No dependencies. Every check reports what it found, why it
   costs the business money, and the fix — because the report is
   the thing you hand a stranger, and a score with no reasons is
   not worth paying for.

   Known limits, stated up front:
   - It reads ONE page's HTML. It cannot see JS-rendered content,
     Core Web Vitals, or anything behind a login.
   - "Address/hours found" is a text heuristic. It can be fooled.
   - It does not check the Google Business Profile itself — that
     needs a human to look. It only checks the site's link to it.
   ============================================================ */
import { readFileSync, existsSync } from 'node:fs';

const argv = process.argv.slice(2);
const pos = [], flag = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    const k = argv[i].slice(2);
    flag[k] = (argv[i + 1] && !argv[i + 1].startsWith('--')) ? argv[++i] : true;
  } else pos.push(argv[i]);
}
const die = (m) => { console.error(`audit: ${m}`); process.exit(1); };

/* ---------- tiny HTML helpers (no DOM, no deps) ---------- */
const strip  = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
                       .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ')
                       .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const tags   = (h, t) => h.match(new RegExp(`<${t}\\b[^>]*>([\\s\\S]*?)<\\/${t}>`, 'gi')) || [];
const attr   = (tag, a) => (tag.match(new RegExp(`${a}\\s*=\\s*["']([^"']*)["']`, 'i')) || [])[1] || null;
const meta   = (h, name) => {
  const re = new RegExp(`<meta[^>]+(?:name|property)\\s*=\\s*["']${name}["'][^>]*>`, 'i');
  const m = h.match(re); return m ? attr(m[0], 'content') : null;
};
const voids  = (h, t) => h.match(new RegExp(`<${t}\\b[^>]*>`, 'gi')) || [];
const links  = (h) => voids(h, 'a').map((a) => ({ href: attr(a, 'href') || '', raw: a }));

/* ---------- the checks ---------- */
const CHECKS = [
  { id: 'viewport', sev: 'critical', label: 'Mobile viewport',
    why: 'Over half of local-service searches happen on a phone. Without this the site renders desktop-width on mobile and visitors pinch-zoom or leave.',
    fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to <head>.',
    run: (h) => { const v = meta(h, 'viewport');
      return v ? (/width\s*=\s*device-width/i.test(v) ? ok(`"${v}"`) : bad(`present but wrong: "${v}"`)) : bad('no viewport meta tag'); } },

  { id: 'tel', sev: 'critical', label: 'Tap-to-call phone number',
    why: 'A phone number that is not a link cannot be tapped on a phone. For a service business this is the single most common lost call.',
    fix: 'Wrap the number: <a href="tel:+15555550142">(555) 555-0142</a>.',
    run: (h) => { const tel = links(h).filter((l) => l.href.startsWith('tel:'));
      const text = strip(h); const shown = /(\(\d{3}\)\s*|\b\d{3}[-.\s])\d{3}[-.\s]\d{4}\b/.test(text);
      if (tel.length) return ok(`${tel.length} tel: link${tel.length > 1 ? 's' : ''} (${tel[0].href})`);
      return bad(shown ? 'a phone number is shown as plain text, not a tel: link' : 'no phone number found at all'); } },

  { id: 'contact', sev: 'critical', label: 'A way to get in touch',
    why: 'If a visitor cannot contact you in one click, the visit was wasted. Every other fix is worth less than this one.',
    fix: 'Add a short contact form, or at minimum a mailto: link above the fold.',
    run: (h) => { const forms = tags(h, 'form').length, mail = links(h).filter((l) => l.href.startsWith('mailto:')).length;
      if (forms || mail) return ok(`${forms} form(s), ${mail} mailto link(s)`);
      return bad('no form and no mailto link'); } },

  { id: 'title', sev: 'major', label: 'Page title',
    why: 'The title is the blue line in Google results. Generic or missing titles get skipped in the list.',
    fix: 'Write "<Service> in <Town> | <Business Name>" — 30-60 characters.',
    run: (h) => { const t = tags(h, 'title')[0]; if (!t) return bad('no <title> tag');
      const v = strip(t); if (!v) return bad('<title> is empty');
      if (/^(home|untitled|index|welcome|document|new page)$/i.test(v)) return bad(`generic title: "${v}"`);
      if (v.length < 15) return warn(`very short (${v.length} chars): "${v}"`);
      if (v.length > 65) return warn(`${v.length} chars — Google truncates around 60: "${v.slice(0, 60)}…"`);
      return ok(`"${v}" (${v.length} chars)`); } },

  { id: 'description', sev: 'major', label: 'Meta description',
    why: 'This is the grey text under the title in search results. Without it Google invents one from the page, usually badly.',
    fix: 'Add <meta name="description" content="…"> — 120-155 characters, naming the service and the town.',
    run: (h) => { const d = meta(h, 'description'); if (!d) return bad('no meta description');
      if (d.length < 70) return warn(`only ${d.length} chars — too short to be useful`);
      if (d.length > 165) return warn(`${d.length} chars — truncated in results`);
      return ok(`${d.length} chars`); } },

  { id: 'schema', sev: 'major', label: 'LocalBusiness structured data',
    why: 'This is how Google learns your hours, address, phone and service area as data rather than guessing from text. It drives the map pack.',
    fix: 'Add a JSON-LD <script type="application/ld+json"> block with @type LocalBusiness (or a subtype), name, address, telephone, openingHours and areaServed.',
    run: (h) => { const blocks = h.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || [];
      if (!blocks.length) return bad('no JSON-LD structured data at all');
      const types = [];
      for (const b of blocks) { const body = b.replace(/<[^>]+>/g, '');
        try { const j = JSON.parse(body); (Array.isArray(j) ? j : [j]).forEach((x) => { const t = x['@type']; if (t) types.push(...[].concat(t)); if (x['@graph']) x['@graph'].forEach((g) => g['@type'] && types.push(...[].concat(g['@type']))); }); }
        catch { return warn(`a JSON-LD block is present but does not parse — Google ignores invalid blocks silently`); } }
      const local = types.find((t) => /LocalBusiness|Store|Restaurant|Service|Contractor|HomeAndConstruction|Plumber|Electrician|Roofing|Dentist|Lawyer|Professional/i.test(t));
      return local ? ok(`@type ${local}`) : warn(`JSON-LD present (${[...new Set(types)].join(', ') || 'no @type'}) but no LocalBusiness type`); } },

  { id: 'h1', sev: 'major', label: 'One clear H1',
    why: 'The H1 tells Google and a skimming visitor what this page is in one line. Zero is a missed signal; several is a confused one.',
    fix: 'Exactly one H1 naming the service and the place: "Emergency Plumbing in Ambler, PA".',
    run: (h) => { const hs = tags(h, 'h1').map(strip).filter(Boolean);
      if (!hs.length) return bad('no H1 on the page');
      if (hs.length > 1) return warn(`${hs.length} H1s: ${hs.slice(0, 3).map((x) => `"${x.slice(0, 40)}"`).join(', ')}`);
      return ok(`"${hs[0].slice(0, 60)}"`); } },

  { id: 'address', sev: 'major', label: 'Address or service area',
    why: 'Local ranking depends on Google being confident where you operate. A site that never names a town does not rank for that town.',
    fix: 'Put the address, or an explicit service-area list of towns, in the footer of every page.',
    run: (h) => { const t = strip(h);
      const street = /\d{1,5}\s+[A-Z][a-z]+\s+(St|Street|Ave|Avenue|Rd|Road|Blvd|Dr|Drive|Ln|Lane|Way|Pike|Pl|Place)\b/.test(t);
      const cityst = /\b[A-Z][a-z]+,\s*(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/.test(t);
      const area = /serv(e|ing|ice area)|areas? we serve|proudly serv/i.test(t);
      if (street && cityst) return ok('street address with city and state');
      if (cityst || area) return warn('a service area or city is named, but no full address found');
      return bad('no address, city or service area found in the page text'); } },

  { id: 'hours', sev: 'minor', label: 'Business hours',
    why: '"Are they open now" is one of the most common things a visitor checks before calling.',
    fix: 'List hours in the footer, and mirror them in the LocalBusiness schema.',
    run: (h) => { const t = strip(h);
      return /(mon|tue|wed|thu|fri|sat|sun)[a-z]*\s*[-–—:]/i.test(t) || /\b(open|hours)\b[^.]{0,40}\b\d{1,2}\s*(am|pm)/i.test(t)
        ? ok('hours appear in the page text') : bad('no business hours found'); } },

  { id: 'gbp', sev: 'major', label: 'Link to Google Business Profile',
    why: 'For local search the Business Profile outranks the website. Linking it from the site connects the two and drives reviews.',
    fix: 'Add a "Find us on Google" link to your Maps listing, and a direct "leave a review" link.',
    run: (h) => { const l = links(h).filter((x) => /google\.[a-z.]+\/maps|goo\.gl\/maps|g\.page|maps\.app\.goo\.gl/i.test(x.href));
      return l.length ? ok(l[0].href.slice(0, 70)) : bad('no link to a Google Maps / Business Profile listing'); } },

  { id: 'reviews', sev: 'major', label: 'Social proof on the page',
    why: 'For a service somebody lets into their home, reviews do more work than any other section.',
    fix: 'Put three real, attributed reviews above the fold. Never invent them — fabricated reviews violate Google policy and can get rich results suppressed.',
    run: (h) => { const t = strip(h);
      return /review|testimonial|★|⭐|\bstars?\b|what (our )?(customers|clients) say/i.test(t)
        ? ok('review or testimonial content found') : bad('no reviews or testimonials on the page'); } },

  { id: 'og', sev: 'minor', label: 'Link preview tags',
    why: 'Controls how the site looks when someone shares it in a text or on Facebook. Without them it shares as a bare URL and gets fewer clicks.',
    fix: 'Add og:title, og:description and og:image (1200×630).',
    run: (h) => { const have = ['og:title', 'og:description', 'og:image'].filter((k) => meta(h, k));
      if (have.length === 3) return ok('og:title, og:description and og:image all present');
      if (!have.length) return bad('no Open Graph tags');
      return warn(`only ${have.join(', ')}`); } },

  { id: 'alt', sev: 'minor', label: 'Image alt text',
    why: 'Alt text is an accessibility requirement and it is also how images rank in search. Decorative images should have alt="".',
    fix: 'Describe each meaningful image in its alt attribute.',
    run: (h) => { const imgs = voids(h, 'img'); if (!imgs.length) return skip('no <img> tags on the page');
      const withAlt = imgs.filter((i) => attr(i, 'alt') !== null).length;
      const pct = Math.round((withAlt / imgs.length) * 100);
      if (pct === 100) return ok(`all ${imgs.length} images have alt`);
      if (pct >= 70) return warn(`${withAlt}/${imgs.length} images have alt (${pct}%)`);
      return bad(`only ${withAlt}/${imgs.length} images have alt (${pct}%)`); } },

  { id: 'favicon', sev: 'minor', label: 'Favicon',
    why: 'Shows in the browser tab and in Google mobile results. Its absence reads as unfinished.',
    fix: 'Add <link rel="icon" href="/favicon.svg">.',
    run: (h) => voids(h, 'link').some((l) => /icon/i.test(attr(l, 'rel') || '')) ? ok('favicon declared') : bad('no favicon link') },

  { id: 'stale', sev: 'major', label: 'Site looks maintained',
    why: 'A copyright year two years out of date is the strongest "are they still in business" signal a visitor gets, and it is free to fix.',
    fix: 'Render the year dynamically, or update it every January.',
    run: (h) => { const t = strip(h); const yr = new Date().getFullYear();
      const years = [...t.matchAll(/(?:©|copyright|&copy;)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/gi)].map((m) => +m[1]);
      if (!years.length) return warn('no copyright year found');
      const newest = Math.max(...years);
      if (newest >= yr) return ok(`copyright ${newest}`);
      if (newest === yr - 1) return warn(`copyright says ${newest} — one year stale`);
      return bad(`copyright says ${newest} — ${yr - newest} years stale; the site reads as abandoned`); } },

  { id: 'deadlinks', sev: 'minor', label: 'Placeholder links',
    why: 'Links that go nowhere are the clearest sign a site was never finished, and visitors notice.',
    fix: 'Point them somewhere or remove them.',
    run: (h) => { const l = links(h); const dead = l.filter((x) => x.href === '#' || x.href === '' || /^javascript:\s*void/i.test(x.href));
      if (!l.length) return skip('no links found');
      return dead.length ? warn(`${dead.length} of ${l.length} links go nowhere (href="#" or empty)`) : ok(`all ${l.length} links have a destination`); } },

  { id: 'weight', sev: 'minor', label: 'Page weight',
    why: 'Slow pages lose mobile visitors before they see anything. Every external script is a round trip.',
    fix: 'Cut unused scripts; self-host fonts; compress images.',
    run: (h, ctx) => { const kb = Math.round(ctx.bytes / 1024);
      const ext = voids(h, 'script').filter((s) => attr(s, 'src') && /^https?:\/\//i.test(attr(s, 'src'))).length;
      if (kb > 600) return bad(`${kb} KB of HTML, ${ext} external scripts`);
      if (kb > 250 || ext > 8) return warn(`${kb} KB of HTML, ${ext} external scripts`);
      return ok(`${kb} KB of HTML, ${ext} external scripts`); } }
];

const ok   = (e) => ({ v: 'pass', e });
const warn = (e) => ({ v: 'warn', e });
const bad  = (e) => ({ v: 'fail', e });
const skip = (e) => ({ v: 'skip', e });
const WEIGHT = { critical: 5, major: 3, minor: 1 };
const EARN   = { pass: 1, warn: 0.5, fail: 0, skip: null };

/* ---------- run ---------- */
async function main() {
  let html, url = flag.url && flag.url !== true ? flag.url : (pos[0] || null), source;

  if (flag.file && flag.file !== true) {
    if (!existsSync(flag.file)) die(`no file at ${flag.file}`);
    html = readFileSync(flag.file, 'utf8'); source = `file: ${flag.file}`;
  } else if (url) {
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try {
      const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000),
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; steading-audit/1.0)' } });
      html = await r.text();
      source = `${r.status} ${url}`;
      if (!r.ok) console.error(`audit: warning — server returned ${r.status}`);
    } catch (e) {
      die(`could not fetch ${url}: ${e.message}\n` +
          `       If outbound access is blocked here, save the page and use:\n` +
          `       node ecosystem/tools/audit.mjs --file page.html --url ${url}`);
    }
  } else die('usage: audit.mjs <url>   |   audit.mjs --file page.html [--url https://…]');

  const ctx = { bytes: Buffer.byteLength(html), url };
  const results = CHECKS.map((c) => { let r; try { r = c.run(html, ctx); } catch (e) { r = skip(`check errored: ${e.message}`); }
    return { ...c, ...r }; });

  const scored = results.filter((r) => r.v !== 'skip');
  const got = scored.reduce((n, r) => n + WEIGHT[r.sev] * EARN[r.v], 0);
  const max = scored.reduce((n, r) => n + WEIGHT[r.sev], 0);
  const score = Math.round((got / max) * 100);

  if (flag.json) { console.log(JSON.stringify({ url, source, score, checks: results }, null, 2)); return; }

  const fails = results.filter((r) => r.v === 'fail').sort((a, b) => WEIGHT[b.sev] - WEIGHT[a.sev]);
  const warns = results.filter((r) => r.v === 'warn').sort((a, b) => WEIGHT[b.sev] - WEIGHT[a.sev]);
  const pass  = results.filter((r) => r.v === 'pass');

  const band = score >= 85 ? 'in good shape' : score >= 65 ? 'workable, with gaps'
             : score >= 40 ? 'losing customers it does not need to' : 'costing real money every week';

  console.log(`# Web presence audit\n`);
  console.log(url ? `**${url}**\n` : '');
  console.log(`**Score: ${score}/100** — ${band}.\n`);
  console.log(`${fails.length} problem${fails.length === 1 ? '' : 's'}, ${warns.length} worth tightening, ${pass.length} already right.`);
  console.log(`\n_Checked ${scored.length} things on one page. ${source}._\n`);

  const block = (title, rows, lead) => {
    if (!rows.length) return;
    console.log(`\n## ${title}\n`);
    if (lead) console.log(`${lead}\n`);
    rows.forEach((r, i) => {
      console.log(`### ${i + 1}. ${r.label}  \`${r.sev}\``);
      console.log(`\n**Found:** ${r.e}\n`);
      console.log(`**Why it matters:** ${r.why}\n`);
      console.log(`**Fix:** ${r.fix}\n`);
    });
  };
  block('Fix these first', fails, 'Ranked by what they cost you, not by how hard they are.');
  block('Worth tightening', warns);

  if (pass.length) {
    console.log(`\n## Already right\n`);
    pass.forEach((r) => console.log(`- **${r.label}** — ${r.e}`));
  }
  const skipped = results.filter((r) => r.v === 'skip');
  if (skipped.length) {
    console.log(`\n## Not checked\n`);
    skipped.forEach((r) => console.log(`- **${r.label}** — ${r.e}`));
  }
  console.log(`\n---\n`);
  console.log(`_This reads one page's HTML. It cannot see JavaScript-rendered content, page speed in the field, or the Google Business Profile itself — that last one needs a human to look at the listing._`);
}
main();

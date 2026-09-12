/* Adapter tests — no network, no keys.  node test.mjs  */
import { createServer } from 'node:http';
import { parseCSV, sheet, stripeRevenue, collect, dayKey } from './sources.js';

const DAY = 86400000;
const now = new Date();
const k = (n) => dayKey(new Date(now.getTime() - n * DAY));

let pass = 0, fail = 0;
const ok = (name, cond, extra='') => { cond ? pass++ : fail++; console.log((cond?'ok  ':'FAIL'), name, extra); };

// ---- 1. CSV parsing, including quoted commas ----
const rows = parseCSV('date,revenue,note\n2026-01-01,100,"a, b"\n2026-01-02,50,plain\n');
ok('csv rows', rows.length === 3, `got ${rows.length}`);
ok('csv quoted comma', rows[1][2] === 'a, b', JSON.stringify(rows[1][2]));

// ---- 2. Sheet adapter over real HTTP ----
const csv = [
  'date,revenue,downloads,tiktok,instagram,youtube,x',
  `${k(1)},100,10,1000,500,200,50`,
  `${k(2)},200,20,2000,0,0,0`,
  `${k(9)},50,5,100,0,0,0`,     // in the PRIOR week, drives the delta
].join('\n');

const csvServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/csv' });
  res.end(csv);
}).listen(9911);

const sh = await sheet('http://localhost:9911/x.csv', now);
ok('sheet last7 revenue', sh.revenue.last7 === 300, `got ${sh.revenue.last7}`);
ok('sheet prior week delta', sh.revenue.delta7 === 500, `got ${sh.revenue.delta7}`);  // 300 vs 50
ok('sheet downloads', sh.downloads.last7 === 30, `got ${sh.downloads.last7}`);
ok('sheet views total', sh.views.last7 === 3750, `got ${sh.views.last7}`);
ok('sheet series length', sh.revenue.series.length === 14, `got ${sh.revenue.series.length}`);
const tt = sh.platforms.find(p => p.name === 'TikTok');
ok('sheet platform split', tt.views === 3000, `got ${tt.views}`);

// ---- 3. Stripe adapter against a stubbed API ----
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.includes('/v1/charges')) {
    return new Response(JSON.stringify({ has_more: false, data: [
      { id:'c1', paid:true, refunded:false, amount: 5000, amount_refunded:0, created: Math.floor((now-1*DAY)/1000) },
      { id:'c2', paid:true, refunded:false, amount: 2500, amount_refunded:0, created: Math.floor((now-2*DAY)/1000) },
      { id:'c3', paid:true, refunded:true,  amount: 9900, amount_refunded:9900, created: Math.floor((now-1*DAY)/1000) },
      { id:'c4', paid:false,refunded:false, amount: 7700, amount_refunded:0, created: Math.floor((now-1*DAY)/1000) },
      { id:'c5', paid:true, refunded:false, amount: 1000, amount_refunded:0, created: Math.floor((now-10*DAY)/1000) },
    ]}), { status: 200 });
  }
  if (u.includes('/v1/subscriptions')) {
    return new Response(JSON.stringify({ data: [
      { items:{ data:[{ quantity:1, price:{ unit_amount: 1200, recurring:{ interval:'month', interval_count:1 } } }] } },
      { items:{ data:[{ quantity:2, price:{ unit_amount: 12000, recurring:{ interval:'year', interval_count:1 } } }] } },
    ]}), { status: 200 });
  }
  return realFetch(url, init);
};

const st = await stripeRevenue('sk_test_x', now);
ok('stripe ignores refunded+unpaid', st.last7 === 75, `got ${st.last7}`);       // 50 + 25
ok('stripe prior week', st.delta7 === 650, `got ${st.delta7}`);                 // 75 vs 10
ok('stripe mrr monthly+annual', st.mrr === 32, `got ${st.mrr}`);                // 12 + (240/12=20)

// ---- 4. collect(): unconfigured sources fail soft ----
const c = await collect({ SHEET_CSV_URL: 'http://localhost:9911/x.csv' }, now);
ok('collect reports unconfigured', c.sources.stripe === 'not configured', c.sources.stripe);
ok('collect fills from sheet', c.growth.downloads7 === 30, `got ${c.growth && c.growth.downloads7}`);
ok('unknown is null, not zero', c.content.followers === null, `got ${c.content.followers}`);
ok('unknown mrr is null', c.revenue.mrr === null, `got ${c.revenue.mrr}`);
ok('known value still set', c.content.views7 === 3750, `got ${c.content.views7}`);

const bad = await collect({ SHEET_CSV_URL: 'http://localhost:9999/nope.csv' }, now);
ok('bad source degrades, no throw', String(bad.sources.sheet).startsWith('error'), bad.sources.sheet);

globalThis.fetch = realFetch;
csvServer.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

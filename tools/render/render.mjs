// Renders scene.html in headless Chromium and writes JPEG + WebP files.
// Usage: node render.mjs <outDir> [jobName ...]
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(process.argv[2] || path.join(root, '../../assets/img/renders'));
const only = process.argv.slice(3);
fs.mkdirSync(outDir, { recursive: true });

const JOBS = [
  { name: 'hero',              state: 'after',  view: 'hero',       w: 2400, h: 1350 },
  { name: 'hero-md',           state: 'after',  view: 'hero',       w: 1400, h: 788 },
  { name: 'hero-portrait',     state: 'after',  view: 'portrait',   w: 1080, h: 1920 },
  { name: 'before',            state: 'before', view: 'ba',         w: 1600, h: 1000 },
  { name: 'after',             state: 'after',  view: 'ba',         w: 1600, h: 1000 },
  { name: 'og',                state: 'after',  view: 'og',         w: 1200, h: 630 },
  { name: 'service-roofline',  state: 'after',  view: 'roofline',   w: 900,  h: 675 },
  { name: 'service-landscape', state: 'after',  view: 'landscape',  w: 900,  h: 675 },
  { name: 'service-wreaths',   state: 'after',  view: 'wreaths',    w: 900,  h: 675 },
  { name: 'service-commercial',state: 'after',  view: 'commercial', w: 900,  h: 675 },
  { name: 'service-full',      state: 'after',  view: 'full',       w: 900,  h: 675 },
];

const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
try {
  for (const job of JOBS.filter((j) => !only.length || only.includes(j.name))) {
    const t0 = Date.now();
    const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
    page.on('pageerror', (e) => console.error(`[${job.name}] page error:`, e.message));
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error(`[${job.name}]`, m.text()); });
    await page.goto(`http://localhost:${port}/scene.html?state=${job.state}&view=${job.view}&w=${job.w}&h=${job.h}`);
    await page.waitForFunction(() => window.__result, null, { timeout: 900000, polling: 500 });
    const r = await page.evaluate(() => window.__result);
    for (const ext of ['jpg', 'webp']) {
      fs.writeFileSync(path.join(outDir, `${job.name}.${ext}`), Buffer.from(r[ext].split(',')[1], 'base64'));
    }
    console.log(`${job.name}: ${((Date.now() - t0) / 1000).toFixed(1)}s`, JSON.stringify(r.stats));
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}

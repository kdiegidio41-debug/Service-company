#!/usr/bin/env node
// Renders a video's frames in headless Chromium.
//   node tools/render.js <id>                    every frame -> out/<id>/frames
//   node tools/render.js <id> --times 1,5.5,20   just those moments -> out/<id>/stills (for checking)
// Options: --w 720 --h 1280 --fps 30 --workers 3 --resume 1 (keep frames already rendered; only use if the scene hasn't changed)
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff' };

function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const file = path.join(ROOT, path.normalize(rel));
      if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

function parseArgs() {
  const a = process.argv.slice(2);
  const opt = { id: a[0], w: 720, h: 1280, fps: 30, workers: 3, times: null, resume: 0 };
  for (let i = 1; i < a.length; i += 2) {
    const k = a[i].replace(/^--/, ''), v = a[i + 1];
    if (k === 'times') opt.times = v.split(',').map(Number); else opt[k] = Number(v);
  }
  if (!opt.id) { console.error('usage: render.js <video-id> [--times 1,2,3] [--w 720 --h 1280 --fps 30 --workers 3]'); process.exit(2); }
  return opt;
}

async function worker(port, opt, frames, dir, k) {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const page = await browser.newPage({ viewport: { width: opt.w, height: opt.h }, deviceScaleFactor: 1 });
    page.on('pageerror', e => console.error('[page error]', e.message));
    page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
    await page.goto(`http://127.0.0.1:${port}/engine/stage.html?video=${opt.id}&w=${opt.w}&h=${opt.h}`);
    await page.waitForFunction('window.ready === true || !!window.failed', null, { timeout: 180000 });
    const failed = await page.evaluate('window.failed');
    if (failed) throw new Error(failed);
    const t0 = Date.now();
    for (let n = 0; n < frames.length; n++) {
      const f = frames[n];
      await page.evaluate(t => window.renderAt(t), f.t);
      await page.screenshot({ path: path.join(dir, f.name), type: 'jpeg', quality: 93 });
      if (k === 0 && n > 0 && n % 120 === 0) {
        const per = (Date.now() - t0) / n;
        console.log(`  worker 0: ${n}/${frames.length} frames, about ${Math.round(per * (frames.length - n) / 60000 * 10) / 10} min left`);
      }
    }
  } finally {
    await browser.close();
  }
}

(async () => {
  const opt = parseArgs();
  const out = path.join(ROOT, 'out', opt.id);
  const timeline = JSON.parse(fs.readFileSync(path.join(out, 'timeline.json'), 'utf8'));
  let frames, dir;
  if (opt.times) {
    dir = path.join(out, 'stills');
    frames = opt.times.map((t, i) => ({ t, name: `s${String(i).padStart(2, '0')}_${t.toFixed(2)}.jpg` }));
  } else {
    dir = path.join(out, 'frames');
    const total = Math.ceil(timeline.duration * opt.fps);
    frames = Array.from({ length: total }, (_, i) => ({ t: i / opt.fps, name: `f${String(i).padStart(5, '0')}.jpg` }));
  }
  if (opt.resume && !opt.times && fs.existsSync(dir)) {
    const before = frames.length;
    frames = frames.filter(f => { const p = path.join(dir, f.name); return !(fs.existsSync(p) && fs.statSync(p).size > 0); });
    console.log(`  resuming: ${before - frames.length} frames already done, ${frames.length} to go`);
  } else {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
  const srv = await serve();
  const port = srv.address().port;
  const P = Math.max(1, Math.min(opt.workers, frames.length));
  const t0 = Date.now();
  try {
    await Promise.all(Array.from({ length: P }, (_, k) => worker(port, opt, frames.filter((_, i) => i % P === k), dir, k)));
  } finally {
    srv.close();
  }
  console.log(`  rendered ${frames.length} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${path.relative(ROOT, dir)}`);
})().catch(e => { console.error(e.message || e); process.exit(1); });

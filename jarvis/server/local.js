#!/usr/bin/env node
/* =========================================================================
   JARVIS — metrics proxy (local)
   -------------------------------------------------------------------------
   The same adapters as the Worker, run on your own machine. Use this if you
   would rather not deploy anything.

     cp .dev.vars.example .env    # fill in your keys
     node local.js                # → http://localhost:8787/metrics

   Then paste http://localhost:8787/metrics into the app's data panel.
   Note it only answers while this process is running.
   ========================================================================= */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { collect } from './sources.js';

/* A tiny .env reader — not worth a dependency for six lines. */
function loadEnv(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = { ...loadEnv(new URL('.env', import.meta.url).pathname), ...process.env };
const PORT = Number(env.PORT || 8787);

let cache = { at: 0, body: null };
const TTL = 4 * 60 * 1000;

const server = createServer(async (req, res) => {
  const send = (status, body) => {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS'
    });
    res.end(JSON.stringify(body, null, 2));
  };

  if (req.method === 'OPTIONS') { send(204, {}); return; }
  if (req.method !== 'GET') { send(405, { error: 'GET only' }); return; }

  if (env.JARVIS_TOKEN) {
    const sent = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (sent !== env.JARVIS_TOKEN) { send(401, { error: 'unauthorized' }); return; }
  }

  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.endsWith('/health')) {
    send(200, {
      ok: true,
      configured: {
        stripe: !!env.STRIPE_SECRET_KEY,
        youtube: !!(env.YOUTUBE_API_KEY && env.YOUTUBE_CHANNEL_ID),
        sheet: !!env.SHEET_CSV_URL
      }
    });
    return;
  }

  if (!url.searchParams.has('fresh') && cache.body && Date.now() - cache.at < TTL) {
    send(200, { ...cache.body, cached: true });
    return;
  }

  try {
    const payload = await collect(env);
    cache = { at: Date.now(), body: payload };
    send(200, payload);
  } catch (err) {
    send(500, { error: String(err && err.message || err) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Jarvis metrics  →  http://localhost:${PORT}/metrics`);
  console.log(`Health check    →  http://localhost:${PORT}/health`);
  const on = ['STRIPE_SECRET_KEY', 'YOUTUBE_API_KEY', 'SHEET_CSV_URL']
    .filter((k) => env[k]);
  console.log(on.length ? `Configured: ${on.join(', ')}` : 'No sources configured yet — see README.md');
});

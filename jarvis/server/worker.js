/* =========================================================================
   JARVIS — metrics proxy (Cloudflare Worker)
   -------------------------------------------------------------------------
   Deploy:  npx wrangler deploy
   Secrets: npx wrangler secret put STRIPE_SECRET_KEY   (and the rest)

   This exists so your API keys never touch the page. The browser calls this;
   this calls Stripe and the others. Keys stay here.
   ========================================================================= */
import { collect } from './sources.js';

/* The page sends its token in a header, so the origin must be allowed to
   send that header. Set ALLOWED_ORIGIN to your installed app's origin. */
function cors(env, request) {
  const allowed = env.ALLOWED_ORIGIN || '*';
  const origin = request.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': allowed === '*' ? '*' : (origin === allowed ? origin : allowed),
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers }
  });
}

export default {
  async fetch(request, env, ctx) {
    const headers = cors(env, request);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'GET') return json({ error: 'GET only' }, 405, headers);

    /* A bearer token, so this endpoint isn't a free read of your business
       for anyone who finds the URL. Set JARVIS_TOKEN to a long random
       string and paste the same one into the app's data panel. */
    if (env.JARVIS_TOKEN) {
      const sent = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
      if (sent !== env.JARVIS_TOKEN) {
        return json({ error: 'unauthorized' }, 401, headers);
      }
    }

    const url = new URL(request.url);
    if (url.pathname.endsWith('/health')) {
      return json({
        ok: true,
        configured: {
          stripe: !!env.STRIPE_SECRET_KEY,
          youtube: !!(env.YOUTUBE_API_KEY && env.YOUTUBE_CHANNEL_ID),
          sheet: !!env.SHEET_CSV_URL
        }
      }, 200, headers);
    }

    /* Upstream APIs are rate limited and slow; the HUD polls every five
       minutes per client. Cache the assembled payload so ten open tabs are
       still one round of upstream calls. */
    const cache = caches.default;
    const cacheKey = new Request(url.origin + url.pathname, { method: 'GET' });
    if (!url.searchParams.has('fresh')) {
      const hit = await cache.match(cacheKey);
      if (hit) {
        const body = await hit.json();
        return json({ ...body, cached: true }, 200, headers);
      }
    }

    try {
      const payload = await collect(env);
      const res = json(payload, 200, { ...headers, 'Cache-Control': 'public, max-age=240' });
      ctx.waitUntil(cache.put(cacheKey, res.clone()));
      return res;
    } catch (err) {
      return json({ error: String(err && err.message || err) }, 500, headers);
    }
  }
};

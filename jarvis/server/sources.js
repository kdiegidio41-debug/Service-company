/* =========================================================================
   JARVIS — metric sources
   -------------------------------------------------------------------------
   Runs on the server, never in the page, because this is where the API keys
   live. Shared by worker.js (Cloudflare) and local.js (Node).

   Every adapter is independent and fails soft: a source that isn't
   configured, or that errors, returns null and says so in `sources`. A dead
   Stripe key must never blank out your YouTube numbers.

   What each source can honestly provide is documented in server/README.md.
   Short version: Stripe gives real daily revenue; YouTube gives followers
   and per-video totals but NOT a daily series without OAuth; the sheet
   adapter gives you everything, because you control the rows.
   ========================================================================= */

const DAY = 86400000;

/* --- helpers ------------------------------------------------------------ */

export function dayKey(d) {
  return d.getFullYear() + '-' +
         String(d.getMonth() + 1).padStart(2, '0') + '-' +
         String(d.getDate()).padStart(2, '0');
}

/* 14 day keys, oldest first — the window the HUD draws. */
export function window14(now = new Date()) {
  const keys = [];
  for (let i = 13; i >= 0; i--) keys.push(dayKey(new Date(now.getTime() - i * DAY)));
  return keys;
}

const sum = (a) => a.reduce((x, y) => x + y, 0);

/* null means "no prior week to compare", which the HUD renders as "new".
   Reporting +100% against zero would be inventing a comparison. */
function delta(now, before) {
  if (!before) return now > 0 ? null : 0;
  return ((now - before) / before) * 100;
}

/* Turn a {dayKey: number} map into the series/last7/delta the HUD wants. */
export function shapeSeries(byDay, keys) {
  const series = keys.map((k) => byDay[k] || 0);
  const last7 = sum(series.slice(7));
  const prev7 = sum(series.slice(0, 7));
  return { series, last7, delta7: delta(last7, prev7) };
}

async function getJSON(url, init = {}) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${body.slice(0, 160)}`);
  }
  return res.json();
}

/* =========================================================================
   Stripe — revenue
   Needs: STRIPE_SECRET_KEY (sk_live_… or sk_test_…, restricted key is fine:
   it only needs read access to Charges and Subscriptions)
   Gives: real per-day revenue for the full 14-day window, plus MRR summed
   from active subscriptions.
   ========================================================================= */
export async function stripeRevenue(key, now = new Date()) {
  const since = Math.floor((now.getTime() - 14 * DAY) / 1000);
  const auth = { Authorization: `Bearer ${key}` };
  const byDay = {};

  let url = `https://api.stripe.com/v1/charges?limit=100&created[gte]=${since}`;
  /* Stripe pages at 100. Cap the walk so a busy account can't spin here. */
  for (let page = 0; page < 10; page++) {
    const data = await getJSON(url, { headers: auth });
    for (const c of data.data || []) {
      if (!c.paid || c.refunded) continue;
      const k = dayKey(new Date(c.created * 1000));
      byDay[k] = (byDay[k] || 0) + (c.amount - (c.amount_refunded || 0)) / 100;
    }
    if (!data.has_more || !data.data.length) break;
    url = `https://api.stripe.com/v1/charges?limit=100&created[gte]=${since}` +
          `&starting_after=${data.data[data.data.length - 1].id}`;
  }

  /* MRR: every active subscription normalised to a monthly figure. */
  let mrr = 0;
  try {
    const subs = await getJSON(
      'https://api.stripe.com/v1/subscriptions?status=active&limit=100&expand[]=data.items',
      { headers: auth });
    for (const s of subs.data || []) {
      for (const item of (s.items && s.items.data) || []) {
        const price = item.price || {};
        const amount = (price.unit_amount || 0) * (item.quantity || 1) / 100;
        const iv = (price.recurring && price.recurring.interval) || 'month';
        const ic = (price.recurring && price.recurring.interval_count) || 1;
        const perMonth = iv === 'year' ? amount / (12 * ic)
                       : iv === 'week' ? amount * (52 / 12) / ic
                       : iv === 'day'  ? amount * 30 / ic
                       : amount / ic;
        mrr += perMonth;
      }
    }
  } catch (e) {
    /* Charges succeeded; a subscriptions failure just means no MRR figure. */
  }

  const keys = window14(now);
  const shaped = shapeSeries(byDay, keys);
  return { ...shaped, mrr: Math.round(mrr) };
}

/* =========================================================================
   YouTube — followers and recent posts
   Needs: YOUTUBE_API_KEY + YOUTUBE_CHANNEL_ID
   Gives: subscriber count, and the view total for recent uploads.
   Does NOT give: views per day. That is the YouTube Analytics API, which
   needs OAuth as the channel owner, not a plain API key. Log daily views by
   voice, or use the sheet adapter, if you want the content series.
   ========================================================================= */
export async function youtube(key, channelId, now = new Date()) {
  const stats = await getJSON(
    `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${key}`);
  const ch = (stats.items || [])[0];
  if (!ch) throw new Error('channel not found — check YOUTUBE_CHANNEL_ID');

  const followers = Number(ch.statistics.subscriberCount || 0);

  const since = new Date(now.getTime() - 14 * DAY).toISOString();
  const search = await getJSON(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}` +
    `&order=date&type=video&maxResults=15&publishedAfter=${since}&key=${key}`);

  const ids = (search.items || []).map((i) => i.id.videoId).filter(Boolean);
  let posts = [];
  if (ids.length) {
    const vids = await getJSON(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet` +
      `&id=${ids.join(',')}&key=${key}`);
    posts = (vids.items || []).map((v) => ({
      hook: v.snippet.title,
      platform: 'YouTube',
      views: Number(v.statistics.viewCount || 0),
      saves: Number(v.statistics.likeCount || 0),
      at: new Date(v.snippet.publishedAt).getTime()
    }));
  }

  return { followers, posts, views: sum(posts.map((p) => p.views)) };
}

/* =========================================================================
   Sheet — the catch-all, and honestly the most useful one
   Needs: SHEET_CSV_URL (File → Share → Publish to web → CSV, in Sheets)
   Gives: whatever you put in it. Columns, header row required:
     date,revenue,downloads,tiktok,instagram,youtube,x
   TikTok and Instagram have no usable public metrics API without an app
   review, so for those this is the realistic path — paste the numbers in
   once a week and every chart fills in.
   ========================================================================= */
export function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

export async function sheet(url, now = new Date()) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} — is the sheet published to the web?`);
  const rows = parseCSV(await res.text());
  if (rows.length < 2) throw new Error('sheet has no data rows');

  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name) => head.indexOf(name);
  const iDate = col('date');
  if (iDate < 0) throw new Error('sheet needs a "date" column');

  const num = (r, name) => {
    const i = col(name);
    if (i < 0) return 0;
    const v = parseFloat(String(r[i] || '').replace(/[^0-9.\-]/g, ''));
    return isNaN(v) ? 0 : v;
  };

  const rev = {}, dl = {}, plat = { TikTok: {}, Instagram: {}, YouTube: {}, X: {} };
  for (const r of rows.slice(1)) {
    const raw = (r[iDate] || '').trim();
    if (!raw) continue;
    const d = new Date(raw);
    if (isNaN(d)) continue;
    const k = dayKey(d);
    rev[k] = (rev[k] || 0) + num(r, 'revenue');
    dl[k] = (dl[k] || 0) + num(r, 'downloads');
    plat.TikTok[k]    = (plat.TikTok[k] || 0)    + num(r, 'tiktok');
    plat.Instagram[k] = (plat.Instagram[k] || 0) + num(r, 'instagram');
    plat.YouTube[k]   = (plat.YouTube[k] || 0)   + num(r, 'youtube');
    plat.X[k]         = (plat.X[k] || 0)         + num(r, 'x');
  }

  const keys = window14(now);
  const views = {};
  for (const k of keys) {
    views[k] = plat.TikTok[k] + plat.Instagram[k] + plat.YouTube[k] + plat.X[k] || 0;
  }

  return {
    revenue: shapeSeries(rev, keys),
    downloads: shapeSeries(dl, keys),
    views: shapeSeries(views, keys),
    platforms: Object.keys(plat).map((name) => ({
      name,
      views: sum(keys.slice(7).map((k) => plat[name][k] || 0))
    }))
  };
}

/* =========================================================================
   Assemble
   -------------------------------------------------------------------------
   Returns only the sections it could actually fill. The page merges these
   over its local data, so a section we omit keeps whatever you logged by
   hand — connecting Stripe should not wipe out your view counts.
   ========================================================================= */
export async function collect(env, now = new Date()) {
  const sources = {};
  const out = { generatedAt: new Date().toISOString(), sources };

  const tones = { TikTok: '', Instagram: 'gold', YouTube: 'violet', X: 'jade' };

  /* Run every configured source at once; one slow API shouldn't stack. */
  const jobs = [];

  if (env.STRIPE_SECRET_KEY) {
    jobs.push(stripeRevenue(env.STRIPE_SECRET_KEY, now).then(
      (r) => {
        sources.stripe = 'ok';
        out.revenue = { mrr: r.mrr, last7: Math.round(r.last7 * 100) / 100,
                        delta7: r.delta7, series: r.series, arpu: null };
      },
      (e) => { sources.stripe = 'error: ' + e.message; }));
  } else sources.stripe = 'not configured';

  if (env.YOUTUBE_API_KEY && env.YOUTUBE_CHANNEL_ID) {
    jobs.push(youtube(env.YOUTUBE_API_KEY, env.YOUTUBE_CHANNEL_ID, now).then(
      (y) => { sources.youtube = 'ok'; out._youtube = y; },
      (e) => { sources.youtube = 'error: ' + e.message; }));
  } else sources.youtube = 'not configured';

  if (env.SHEET_CSV_URL) {
    jobs.push(sheet(env.SHEET_CSV_URL, now).then(
      (s) => { sources.sheet = 'ok'; out._sheet = s; },
      (e) => { sources.sheet = 'error: ' + e.message; }));
  } else sources.sheet = 'not configured';

  await Promise.all(jobs);

  /* The sheet is the only source with a real daily series for downloads and
     views, so it wins those. Stripe wins revenue when both have it. */
  const sh = out._sheet;
  if (sh) {
    if (!out.revenue && sh.revenue.last7) {
      out.revenue = { mrr: null, last7: sh.revenue.last7, delta7: sh.revenue.delta7,
                      series: sh.revenue.series, arpu: null };
    }
    out.growth = {
      downloads7: sh.downloads.last7, delta7: sh.downloads.delta7,
      series: sh.downloads.series,
      activeUsers: env.ACTIVE_USERS ? Number(env.ACTIVE_USERS) : null,
      trialConversion: env.TRIAL_CONVERSION ? Number(env.TRIAL_CONVERSION) : null,
      churn: env.CHURN ? Number(env.CHURN) : null
    };
    out.content = {
      views7: sh.views.last7, delta7: sh.views.delta7, series: sh.views.series,
      posts7: null, followers: null,
      platforms: sh.platforms.map((p) => ({ ...p, tone: tones[p.name] || '' })),
      top: null
    };
  }

  const yt = out._youtube;
  if (yt) {
    if (!out.content) {
      /* YouTube alone can't give a daily series, so leave those null and let
         the page keep whatever it has locally. */
      out.content = {
        views7: null, delta7: null, series: null,
        posts7: null, followers: null, platforms: null, top: null
      };
    }
    out.content.followers = yt.followers;
    const weekAgo = now.getTime() - 7 * DAY;
    out.content.posts7 = yt.posts.filter((p) => p.at >= weekAgo).length;
    out.content.top = yt.posts.slice().sort((a, b) => b.views - a.views)[0] || null;
  }

  /* arpu once both halves are known. */
  if (out.revenue && out.growth && out.growth.downloads7) {
    out.revenue.arpu = Math.round((out.revenue.last7 / out.growth.downloads7) * 100) / 100;
  }

  delete out._sheet;
  delete out._youtube;
  return out;
}

/* =============================================================
   config.js — the blueprint of the farm.

   Positions are GRID tiles, not pixels. render.js projects them
   into isometric view, so (gx, gy) is a square on the ground.

   Each building houses one AI agent. Right now the work is
   simulated; `wire` says what that agent needs to become real.
   ============================================================= */

const GRID  = { w: 30, h: 20 };
const WORLD = { w: 1500, h: 850, hallRow: 10.5, ox: 620, oy: 120, tw: 56, th: 28 };

/* --- Paddocks ----------------------------------------------- */
const ZONES = {
  etsy:    { id:'etsy',    name:'Craft Yard',     sub:'Etsy Print-on-Demand', color:'#e8613c', gx:1,  gy:1,  gw:11, gh:8 },
  ops:     { id:'ops',     name:'Farmhouse Hill', sub:'Command',              color:'#c89b3c', gx:13, gy:1,  gw:5,  gh:8 },
  content: { id:'content', name:'Studio Meadow',  sub:'Short-Form Video',     color:'#4a90d9', gx:19, gy:1,  gw:11, gh:8 },
  market:  { id:'market',  name:'Market Road',    sub:'Where it ships out',   color:'#5aa84f', gx:1,  gy:12, gw:29, gh:6 },
};

/* --- What gets carried between buildings -------------------- */
const ITEMS = {
  niche:    { label:'Niche',     color:'#fbbf24' },
  design:   { label:'Design',    color:'#f97316' },
  mockup:   { label:'Mockup',    color:'#fb7185' },
  listing:  { label:'Listing',   color:'#f59e0b' },
  priced:   { label:'Priced',    color:'#84cc16' },
  trend:    { label:'Trend',     color:'#38bdf8' },
  script:   { label:'Script',    color:'#60a5fa' },
  cut:      { label:'Video',     color:'#818cf8' },
  captioned:{ label:'Captioned', color:'#c084fc' },
  post:     { label:'Post',      color:'#34d399' },
  report:   { label:'Report',    color:'#a78bfa' },
};

/* --- Buildings -----------------------------------------------
   who   : the farm hand who lives here
   cycle : the job name shown in the status bar
   takes / makes / to : the production line
   ------------------------------------------------------------- */
const STATIONS = [
  /* ---------- CRAFT YARD (Etsy print-on-demand) ---------- */
  { id:'niche', zone:'etsy', gx:2, gy:2, build:'windmill', name:'Niche Scout',
    who:'Otis', cycle:'niche_hunt', role:'Hunting niches',
    takes:null, makes:'niche', dur:9, to:'design',
    agent:'Finds low-competition, high-demand print-on-demand niches and starts the line.',
    wire:['Etsy search + eRank/Marmalade data','Claude API key'] },

  { id:'design', zone:'etsy', gx:6, gy:2, build:'barn', name:'Design Barn',
    who:'Gus', cycle:'design_cycle', role:'Drawing artwork',
    takes:'niche', makes:'design', dur:14, to:'mockup',
    agent:'Turns a niche into finished shirt artwork — writes the image prompt and generates the file.',
    wire:['Image generation API','Claude API key'] },

  { id:'mockup', zone:'etsy', gx:10, gy:2, build:'shed', name:'Mockup Shed',
    who:'Hattie', cycle:'mockup_stage', role:'Staging mockups',
    takes:'design', makes:'mockup', dur:7, to:'listing',
    agent:'Drops the artwork onto shirt mockups so the listing has real photos.',
    wire:['Printify / Printful API'] },

  { id:'listing', zone:'etsy', gx:10, gy:6, build:'house', name:'Listing House',
    who:'Alma', cycle:'listing_cycle', role:'Writing the listing',
    takes:'mockup', makes:'listing', dur:8, to:'pricing',
    agent:'Writes the title, all 13 tags and the description, inside Etsy’s character limits.',
    wire:['Claude API key'] },

  { id:'pricing', zone:'etsy', gx:6, gy:6, build:'shed', name:'Pricing Shed',
    who:'Silas', cycle:'price_scan', role:'Checking competitors',
    takes:'listing', makes:'priced', dur:6, to:'storefront',
    agent:'Scans what comparable listings charge and sets a price that still clears your cost.',
    wire:['Etsy public listing data','Your Printify cost sheet'] },

  { id:'reviews', zone:'etsy', gx:2, gy:6, build:'coop', name:'Review Coop',
    who:'Millie', cycle:'review_triage', role:'Answering buyers',
    takes:null, makes:null, dur:11, to:null, idleWork:true,
    agent:'Drafts replies to new reviews and buyer messages for you to approve.',
    wire:['Etsy shop OAuth','Claude API key'] },

  /* ---------- FARMHOUSE HILL (command) ---------- */
  { id:'command', zone:'ops', gx:15, gy:2, build:'house', name:'Farmhouse',
    who:'Wade', cycle:'dispatch_cycle', role:'Assigning work',
    takes:null, makes:null, dur:8, to:null, idleWork:true,
    agent:'Decides what the farm works on next and keeps both fields fed.',
    wire:['Nothing — this one is the orchestrator'] },

  { id:'analytics', zone:'ops', gx:15, gy:5, build:'silo', name:'Stats Silo',
    who:'Delia', cycle:'stats_pull', role:'Reading the numbers',
    takes:null, makes:'report', dur:16, to:'treasury',
    agent:'Pulls yesterday’s numbers and works out what actually performed.',
    wire:['Etsy Stats','TikTok / IG / YouTube analytics'] },

  { id:'treasury', zone:'ops', gx:15, gy:8, build:'silo', name:'Grain Store',
    who:'Fern', cycle:'ledger_cycle', role:'Counting revenue',
    takes:'report', makes:null, dur:6, to:null,
    agent:'Tracks money in, cost per post, and what each field is actually earning.',
    wire:['Etsy payouts','Platform payout APIs'] },

  /* ---------- STUDIO MEADOW (short-form video) ---------- */
  { id:'trend', zone:'content', gx:20, gy:2, build:'windmill', name:'Trend Mill',
    who:'Roscoe', cycle:'trend_scan', role:'Watching trends',
    takes:null, makes:'trend', dur:6, to:'script',
    agent:'Watches trending sounds and formats on each platform and picks what to ride.',
    wire:['TikTok / IG / YouTube trend data'] },

  { id:'script', zone:'content', gx:24, gy:2, build:'house', name:'Script House',
    who:'Junie', cycle:'hook_cycle', role:'Writing hooks',
    takes:'trend', makes:'script', dur:8, to:'edit',
    agent:'Writes the hook and the full script — the first three seconds get the most attention.',
    wire:['Claude API key'] },

  { id:'edit', zone:'content', gx:28, gy:2, build:'barn', name:'Edit Barn',
    who:'Cyrus', cycle:'edit_cycle', role:'Cutting video',
    takes:'script', makes:'cut', dur:11, to:'caption',
    agent:'Assembles the video — voiceover, b-roll, cuts on the beat.',
    wire:['Voice API','Stock/b-roll source','Render service'] },

  { id:'caption', zone:'content', gx:28, gy:6, build:'shed', name:'Caption Shed',
    who:'Nell', cycle:'caption_pass', role:'Captioning',
    takes:'cut', makes:'captioned', dur:5, to:'repurpose',
    agent:'Burns in captions and writes the caption text and hashtags per platform.',
    wire:['Claude API key'] },

  { id:'repurpose', zone:'content', gx:24, gy:6, build:'shed', name:'Repurpose Shed',
    who:'Beau', cycle:'repurpose_cut', role:'Cutting 3 versions',
    takes:'captioned', makes:'post', dur:6, to:'approvals',
    agent:'Reframes one video into a TikTok, a Reel and a Short — different crops, hooks and lengths.',
    wire:['Render service'] },

  { id:'cover', zone:'content', gx:20, gy:6, build:'coop', name:'Cover Coop',
    who:'Opal', cycle:'cover_art', role:'Making thumbnails',
    takes:null, makes:null, dur:9, to:null, idleWork:true,
    agent:'Designs the cover frame and thumbnail — the thing people decide on before pressing play.',
    wire:['Image generation API'] },

  /* ---------- MARKET ROAD (publishing) ---------- */
  { id:'storefront', zone:'market', gx:4, gy:14, build:'stall', name:'Etsy Stall',
    who:'Marlow', cycle:'publish_listing', role:'Publishing listing',
    takes:'priced', makes:null, dur:4, to:null, terminal:'listing',
    agent:'Pushes the finished listing live to your shop.',
    wire:['Etsy shop OAuth (write access)'] },

  { id:'approvals', zone:'market', gx:11, gy:14, build:'house', name:'Approval Gate',
    who:'Etta', cycle:'approval_queue', role:'Waiting on you',
    takes:'post', makes:'post', dur:2, to:'dock',
    agent:'Holds every post for your thumbs-up before it goes out. Turn this off to run fully hands-off.',
    wire:['Nothing — this is your review queue'] },

  { id:'dock', zone:'market', gx:19, gy:14, build:'barn', name:'Posting Barn',
    who:'Boone', cycle:'post_cycle', role:'Posting',
    takes:'post', makes:null, dur:3, to:null, terminal:'post',
    agent:'Posts to TikTok, Instagram and YouTube on schedule — 3 a day, each platform.',
    wire:['TikTok Content Posting API','Instagram Graph API','YouTube Data API'] },

  { id:'vault', zone:'market', gx:26, gy:14, build:'silo', name:'Asset Barn',
    who:'Hollis', cycle:'asset_filing', role:'Filing assets',
    takes:null, makes:null, dur:13, to:null, idleWork:true,
    agent:'Keeps every design, clip and caption filed so nothing gets remade twice.',
    wire:['Cloud storage bucket'] },
];

/* Farm hands who walk finished work between buildings. */
const COURIERS = [
  { name:'Dash',   zone:'etsy',    color:'#e8613c' },
  { name:'Ferry',  zone:'etsy',    color:'#e8613c' },
  { name:'Cart',   zone:'etsy',    color:'#e8613c' },
  { name:'Relay',  zone:'content', color:'#4a90d9' },
  { name:'Loop',   zone:'content', color:'#4a90d9' },
  { name:'Bramble',zone:'content', color:'#4a90d9' },
  { name:'Runner', zone:'ops',     color:'#c89b3c' },
  { name:'Porter', zone:'market',  color:'#5aa84f' },
  { name:'Hoist',  zone:'market',  color:'#5aa84f' },
];

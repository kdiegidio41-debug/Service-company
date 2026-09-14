/* =============================================================
   config.js — the blueprint of the facility.

   Everything about the world lives here: zones (rooms), stations
   (desks), operators (the little workers), and the production
   lines that connect them.

   Each station names the REAL agent it stands for. Right now the
   work is simulated; when we wire an API key + backend, a station's
   `wire` block says exactly what it needs to become live.
   ============================================================= */

const WORLD = { w: 1600, h: 900, hallY: 610 };

/* --- Zones -------------------------------------------------- */
const ZONES = {
  etsy:    { id:'etsy',    name:'Etsy Wing',      sub:'Print-on-Demand', color:'#f97316', x:40,   y:110, w:560, h:470 },
  ops:     { id:'ops',     name:'Ops Core',       sub:'Command',         color:'#a78bfa', x:630,  y:110, w:340, h:470 },
  content: { id:'content', name:'Content Wing',   sub:'Short-Form',      color:'#22d3ee', x:1000, y:110, w:560, h:470 },
  market:  { id:'market',  name:'Publishing Floor', sub:'Where it goes out', color:'#34d399', x:40, y:650, w:1520, h:212 },
};

/* --- Item types (what gets carried around) ------------------ */
const ITEMS = {
  niche:    { label:'Niche',      color:'#fbbf24' },
  design:   { label:'Design',     color:'#f97316' },
  mockup:   { label:'Mockup',     color:'#fb7185' },
  listing:  { label:'Listing',    color:'#f59e0b' },
  priced:   { label:'Priced',     color:'#84cc16' },
  trend:    { label:'Trend',      color:'#22d3ee' },
  script:   { label:'Script',     color:'#38bdf8' },
  cut:      { label:'Video',      color:'#818cf8' },
  captioned:{ label:'Captioned',  color:'#c084fc' },
  post:     { label:'Post',       color:'#34d399' },
  report:   { label:'Report',     color:'#a78bfa' },
};

/* --- Stations ------------------------------------------------
   role      : verb shown in the work bubble
   takes     : item id required to start (null = generates from nothing)
   makes     : item id produced
   dur       : seconds of work at 1x
   to        : station id the output is carried to (null = terminal)
   agent     : the real AI agent this desk represents
   wire      : what it needs to stop being a simulation
   ------------------------------------------------------------- */
const STATIONS = [
  /* ============ ETSY WING ============ */
  { id:'niche', zone:'etsy', x:150, y:210, name:'Niche Scout', role:'Hunting niches',
    takes:null, makes:'niche', dur:9, to:'design',
    agent:'Finds low-competition, high-demand print-on-demand niches and hands one down the line.',
    wire:['Etsy search + eRank/Marmalead data', 'Claude API key'] },

  { id:'design', zone:'etsy', x:330, y:210, name:'Design Studio', role:'Drawing artwork',
    takes:'niche', makes:'design', dur:14, to:'mockup',
    agent:'Turns a niche into finished shirt artwork — writes the image prompt and generates the file.',
    wire:['Image generation API', 'Claude API key'] },

  { id:'mockup', zone:'etsy', x:510, y:210, name:'Mockup Bench', role:'Staging mockups',
    takes:'design', makes:'mockup', dur:7, to:'listing',
    agent:'Drops the artwork onto shirt mockups so the listing has real photos.',
    wire:['Printify / Printful API'] },

  { id:'listing', zone:'etsy', x:510, y:430, name:'Listing Desk', role:'Writing the listing',
    takes:'mockup', makes:'listing', dur:8, to:'pricing',
    agent:'Writes the title, all 13 tags and the description, inside Etsy’s character limits.',
    wire:['Claude API key'] },

  { id:'pricing', zone:'etsy', x:330, y:430, name:'Pricing Desk', role:'Checking competitors',
    takes:'listing', makes:'priced', dur:6, to:'storefront',
    agent:'Scans what comparable listings charge and sets a price that still clears your cost.',
    wire:['Etsy public listing data', 'Your Printify cost sheet'] },

  { id:'reviews', zone:'etsy', x:150, y:430, name:'Review Desk', role:'Answering buyers',
    takes:null, makes:null, dur:11, to:null, idleWork:true,
    agent:'Drafts replies to new reviews and buyer messages for you to approve.',
    wire:['Etsy shop OAuth', 'Claude API key'] },

  /* ============ OPS CORE ============ */
  { id:'command', zone:'ops', x:800, y:190, name:'Command Desk', role:'Assigning work',
    takes:null, makes:null, dur:8, to:null, idleWork:true,
    agent:'Decides what the facility works on next and keeps both wings fed.',
    wire:['Nothing — this one is the orchestrator'] },

  { id:'analytics', zone:'ops', x:800, y:350, name:'Analytics', role:'Reading the numbers',
    takes:null, makes:'report', dur:16, to:'treasury',
    agent:'Pulls yesterday’s numbers and works out what actually performed.',
    wire:['Etsy Stats', 'TikTok / IG / YouTube analytics'] },

  { id:'treasury', zone:'ops', x:800, y:510, name:'Treasury', role:'Counting revenue',
    takes:'report', makes:null, dur:6, to:null,
    agent:'Tracks money in, cost per post, and what each wing is actually earning.',
    wire:['Etsy payouts', 'Platform payout APIs'] },

  /* ============ CONTENT WING ============ */
  { id:'trend', zone:'content', x:1110, y:210, name:'Trend Scout', role:'Watching trends',
    takes:null, makes:'trend', dur:6, to:'script',
    agent:'Watches trending sounds and formats on each platform and picks what to ride.',
    wire:['TikTok / IG / YouTube trend data'] },

  { id:'script', zone:'content', x:1290, y:210, name:'Script Room', role:'Writing hooks',
    takes:'trend', makes:'script', dur:8, to:'edit',
    agent:'Writes the hook and the full script — the first three seconds get the most attention.',
    wire:['Claude API key'] },

  { id:'edit', zone:'content', x:1450, y:210, name:'Edit Bay', role:'Cutting video',
    takes:'script', makes:'cut', dur:11, to:'caption',
    agent:'Assembles the video — voiceover, b-roll, cuts on the beat.',
    wire:['Voice API', 'Stock/b-roll source', 'Render service'] },

  { id:'caption', zone:'content', x:1450, y:430, name:'Caption Desk', role:'Captioning',
    takes:'cut', makes:'captioned', dur:5, to:'repurpose',
    agent:'Burns in captions and writes the caption text and hashtags per platform.',
    wire:['Claude API key'] },

  { id:'repurpose', zone:'content', x:1290, y:430, name:'Repurpose Bench', role:'Cutting 3 versions',
    takes:'captioned', makes:'post', dur:6, to:'approvals',
    agent:'Reframes one video into a TikTok, a Reel and a Short — different crops, hooks and lengths.',
    wire:['Render service'] },

  { id:'cover', zone:'content', x:1110, y:430, name:'Cover Art', role:'Making thumbnails',
    takes:null, makes:null, dur:9, to:null, idleWork:true,
    agent:'Designs the cover frame and thumbnail — the thing people decide on before pressing play.',
    wire:['Image generation API'] },

  /* ============ PUBLISHING FLOOR ============ */
  { id:'storefront', zone:'market', x:300, y:760, name:'Etsy Storefront', role:'Publishing listing',
    takes:'priced', makes:null, dur:4, to:null, terminal:'listing',
    agent:'Pushes the finished listing live to your shop.',
    wire:['Etsy shop OAuth (write access)'] },

  { id:'approvals', zone:'market', x:700, y:760, name:'Approval Inbox', role:'Waiting on you',
    takes:'post', makes:'post', dur:2, to:'dock',
    agent:'Holds every post for your thumbs-up before it goes out. Turn this off to run fully hands-off.',
    wire:['Nothing — this is your review queue'] },

  { id:'dock', zone:'market', x:1080, y:760, name:'Publishing Dock', role:'Posting',
    takes:'post', makes:null, dur:3, to:null, terminal:'post',
    agent:'Posts to TikTok, Instagram and YouTube on schedule — 3 a day, each platform.',
    wire:['TikTok Content Posting API', 'Instagram Graph API', 'YouTube Data API'] },

  { id:'vault', zone:'market', x:1420, y:760, name:'Asset Vault', role:'Filing assets',
    takes:null, makes:null, dur:13, to:null, idleWork:true,
    agent:'Keeps every design, clip and caption filed so nothing gets remade twice.',
    wire:['Cloud storage bucket'] },
];

/* --- Operators (one per station) ---------------------------- */
const OPERATOR_NAMES = {
  niche:'Scout', design:'Pixel', mockup:'Frame', listing:'Quill', pricing:'Tally', reviews:'Echo',
  command:'Chief', analytics:'Ledger', treasury:'Vault',
  trend:'Radar', script:'Hook', edit:'Splice', caption:'Sub', repurpose:'Triple', cover:'Cover',
  storefront:'Shelf', approvals:'Gate', dock:'Launch', vault:'Archive',
};

/* Couriers walk finished work from one desk to the next. */
const COURIERS = [
  { name:'Dash',  zone:'etsy',    color:'#f97316' },
  { name:'Ferry', zone:'etsy',    color:'#f97316' },
  { name:'Relay', zone:'content', color:'#22d3ee' },
  { name:'Shuttle', zone:'content', color:'#22d3ee' },
  { name:'Runner', zone:'ops',    color:'#a78bfa' },
  { name:'Cart',   zone:'etsy',    color:'#f97316' },
  { name:'Loop',   zone:'content', color:'#22d3ee' },
  { name:'Porter', zone:'market',  color:'#34d399' },
  { name:'Hoist',  zone:'market',  color:'#34d399' },
];

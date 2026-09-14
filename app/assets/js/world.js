/* =============================================================
   world.js — the simulation.

   Stations do work. Couriers carry the finished work to the next
   desk. Operators stand at their desk and look busy while it
   happens. Nothing here touches a real API yet — see `wire` in
   config.js for what each desk needs to go live.
   ============================================================= */

const DAY_SECONDS = 150;          // one facility "day" at 1x
const TRAY_CAP    = 3;            // stops generators running away
const POSTS_TARGET = 9;           // 3 platforms x 3 posts

function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

/* Route between two points. Same zone: walk straight. Different
   zones: out to the main hall, along it, then in. */
function route(from, to, fromZone, toZone) {
  if (fromZone === toZone) return [{ x: to.x, y: to.y }];
  return [
    { x: from.x, y: WORLD.hallY },
    { x: to.x,   y: WORLD.hallY },
    { x: to.x,   y: to.y },
  ];
}

class Mover {
  constructor(x, y, speed) {
    this.x = x; this.y = y; this.speed = speed;
    this.path = []; this.facing = 1; this.bob = Math.random() * 6.28;
    this.moving = false;
  }
  goTo(pt, fromZone, toZone) {
    this.path = route(this, pt, fromZone, toZone);
  }
  step(dt) {
    this.moving = this.path.length > 0;
    if (!this.moving) return true;
    const t = this.path[0];
    const d = dist(this, t);
    const travel = this.speed * dt;
    if (d <= travel) {
      this.x = t.x; this.y = t.y; this.path.shift();
      return this.path.length === 0;
    }
    const nx = (t.x - this.x) / d, ny = (t.y - this.y) / d;
    this.x += nx * travel; this.y += ny * travel;
    if (Math.abs(nx) > 0.15) this.facing = nx > 0 ? 1 : -1;
    this.bob += dt * 11;
    return false;
  }
}

class Station {
  constructor(def) {
    Object.assign(this, def);
    this.zoneDef  = ZONES[this.zone];
    this.input    = [];      // items waiting to be worked
    this.tray     = [];      // finished items waiting for a courier
    this.progress = 0;       // 0..1
    this.working  = false;
    this.jobsDone = 0;
    this.claimed  = false;   // a courier is already coming for the tray
    this.quotaLogged = false;
    this.waitSince = 0;      // when this tray started waiting for pickup
  }
  get isGenerator() { return this.takes === null && (this.makes !== null || this.idleWork); }
  canStart() {
    if (this.working) return false;
    if (this.makes && this.tray.length >= TRAY_CAP) return false;
    if (this.takes === null) return true;
    return this.input.length > 0;
  }
}

class Operator {
  constructor(station) {
    this.station = station;
    this.name = OPERATOR_NAMES[station.id] || 'Operator';
    this.color = ZONES[station.zone].color;
    this.home = { x: station.x - 42, y: station.y + 12 };
    this.mv = new Mover(this.home.x, this.home.y, 52);
    this.restTimer = Math.random() * 3;
  }
  update(dt) {
    const s = this.station;
    if (s.working) {
      // stand at the desk while working
      if (dist(this.mv, this.home) > 3) this.mv.goTo(this.home, s.zone, s.zone);
      this.mv.step(dt);
      return;
    }
    // idle: drift around the desk so the floor never looks frozen
    const done = this.mv.step(dt);
    if (done) {
      this.restTimer -= dt;
      if (this.restTimer <= 0) {
        this.restTimer = 1.5 + Math.random() * 3.5;
        this.mv.goTo({
          x: this.home.x + (Math.random() - 0.5) * 34,
          y: this.home.y + (Math.random() - 0.5) * 40,
        }, s.zone, s.zone);
      }
    }
  }
}

class Courier {
  constructor(def, startStation) {
    this.name = def.name;
    this.color = def.color;
    this.zone = def.zone;
    this.mv = new Mover(startStation.x, startStation.y + 40, 112);
    this.job = null;          // { from, to, itemType }
    this.phase = 'idle';      // idle | pickup | deliver
    this.carrying = null;
    this.delivered = 0;
    this.restTimer = Math.random() * 2;
  }
  currentZone() {
    // whichever zone the courier is physically standing in
    for (const z of Object.values(ZONES)) {
      if (this.mv.x >= z.x && this.mv.x <= z.x + z.w && this.mv.y >= z.y && this.mv.y <= z.y + z.h) return z.id;
    }
    return 'hall';
  }
}

class World {
  constructor() {
    this.stations  = STATIONS.map(d => new Station(d));
    this.byId      = Object.fromEntries(this.stations.map(s => [s.id, s]));
    this.operators = this.stations.map(s => new Operator(s));
    this.couriers  = COURIERS.map(c => {
      const home = this.stations.find(s => s.zone === c.zone) || this.stations[0];
      return new Courier(c, home);
    });
    this.items   = [];        // items in flight, drawn on the courier
    this.speed   = 1;
    this.paused  = false;
    this.clock   = 0;
    this.age     = 0;   // never resets — orders the courier queue
    this.day     = 1;
    this.log     = [];
    this.stats   = { revenue: 0, listingsLive: 0, postsToday: 0, postsTotal: 0, handoffs: 0 };
    this.seed();
    this.say('Facility online. Both wings staffed.', '#a78bfa');
  }

  /* Start mid-shift so the floor is already busy when you open it,
     rather than idle for the first ten seconds. */
  seed() {
    const pre = [
      ['design','niche'], ['mockup','design'], ['listing','mockup'], ['pricing','listing'],
      ['script','trend'], ['edit','script'], ['caption','cut'], ['repurpose','captioned'],
    ];
    for (const [id, item] of pre) this.byId[id].input.push(item);
    this.byId.niche.tray.push('niche');
    this.byId.trend.tray.push('trend');
  }

  say(text, color = '#8b8b98') {
    this.log.unshift({ text, color, day: this.day, t: this.clock });
    if (this.log.length > 60) this.log.pop();
  }

  update(rawDt) {
    if (this.paused) return;
    const dt = Math.min(rawDt, 0.05) * this.speed;
    this.clock += dt;
    this.age   += dt;

    if (this.clock >= DAY_SECONDS) {
      this.clock = 0;
      this.day += 1;
      this.say(`Day ${this.day} begins. Yesterday: ${this.stats.postsToday}/${POSTS_TARGET} posts out.`, '#fbbf24');
      this.stats.postsToday = 0;
      this.stations.forEach(st => { st.quotaLogged = false; });
    }

    this.stations.forEach(s => this.updateStation(s, dt));
    this.operators.forEach(o => o.update(dt));
    this.dispatch();
    this.couriers.forEach(c => this.updateCourier(c, dt));

    // published listings keep earning a little in the background
    this.stats.revenue += this.stats.listingsLive * 0.0016 * dt * 60;
  }

  updateStation(s, dt) {
    if (!s.working) {
      // The dock posts 3 per platform per day and no more. Anything
      // finished past that waits in its input tray for tomorrow.
      if (s.terminal === 'post' && this.stats.postsToday >= POSTS_TARGET) {
        if (!s.quotaLogged) {
          s.quotaLogged = true;
          this.say(`${s.name}: ${POSTS_TARGET}/${POSTS_TARGET} posted. Holding ${s.input.length} for tomorrow.`, '#fbbf24');
        }
        return;
      }
      if (s.canStart()) {
        if (s.takes) s.input.shift();
        s.working = true; s.progress = 0;
      }
      return;
    }
    s.progress += dt / s.dur;
    if (s.progress < 1) return;

    s.working = false; s.progress = 0; s.jobsDone += 1;

    if (s.terminal === 'listing') {
      this.stats.listingsLive += 1;
      this.stats.revenue += 4 + Math.random() * 9;
      this.say(`${s.name}: listing #${this.stats.listingsLive} is live.`, '#f97316');
      return;
    }
    if (s.terminal === 'post') {
      this.stats.postsToday += 1;
      this.stats.postsTotal += 1;
      this.stats.revenue += 0.6 + Math.random() * 3.4;
      const plat = ['TikTok', 'Instagram', 'YouTube'][this.stats.postsTotal % 3];
      this.say(`${s.name}: posted to ${plat}. ${this.stats.postsToday}/${POSTS_TARGET} today.`, '#34d399');
      return;
    }
    if (s.makes) {
      if (!s.tray.length) s.waitSince = this.age;
      s.tray.push(s.makes);
      if (s.isGenerator) this.say(`${s.name} produced a ${ITEMS[s.makes].label.toLowerCase()}.`, ZONES[s.zone].color);
    }
  }

  /* Hand waiting output trays to free couriers.

     Longest-waiting tray goes first. Walking `this.stations` in array
     order instead would let the Etsy desks (first in the list) claim
     every free courier each tick and starve the Content Wing. */
  dispatch() {
    const pending = this.stations
      .filter(s => s.tray.length && s.to && !s.claimed)
      .sort((a, b) => a.waitSince - b.waitSince);

    for (const s of pending) {
      const free = this.couriers.filter(c => c.phase === 'idle');
      if (!free.length) return;
      free.sort((a, b) =>
        (a.zone === s.zone ? 0 : 1) - (b.zone === s.zone ? 0 : 1) ||
        dist(a.mv, s) - dist(b.mv, s));
      const c = free[0];
      c.job = { from: s, to: this.byId[s.to], itemType: s.tray[0] };
      c.phase = 'pickup';
      s.claimed = true;
      c.mv.goTo({ x: s.x, y: s.y + 34 }, c.currentZone(), s.zone);
    }
  }

  updateCourier(c, dt) {
    const arrived = c.mv.step(dt);
    if (c.phase === 'idle') {
      if (arrived) {
        c.restTimer -= dt;
        if (c.restTimer <= 0) {
          c.restTimer = 2 + Math.random() * 4;
          const z = ZONES[c.zone];
          c.mv.goTo({
            x: z.x + 60 + Math.random() * (z.w - 120),
            y: z.y + 60 + Math.random() * (z.h - 120),
          }, c.currentZone(), c.zone);
        }
      }
      return;
    }
    if (!arrived) return;

    if (c.phase === 'pickup') {
      const from = c.job.from;
      if (from.tray.length) {
        c.carrying = from.tray.shift();
        from.claimed = false;
        if (from.tray.length) from.waitSince = this.age;
        c.phase = 'deliver';
        c.mv.goTo({ x: c.job.to.x, y: c.job.to.y + 34 }, from.zone, c.job.to.zone);
      } else {
        from.claimed = false;
        c.phase = 'idle'; c.job = null;
      }
      return;
    }

    if (c.phase === 'deliver') {
      const to = c.job.to;
      to.input.push(c.carrying);
      this.stats.handoffs += 1;
      c.delivered += 1;
      c.carrying = null; c.job = null; c.phase = 'idle';
    }
  }
}

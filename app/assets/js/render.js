/* =============================================================
   render.js — draws the farm in isometric view.

   Grid tile (gx, gy) projects to screen with iso(). Everything is
   drawn with canvas paths, so there are no image files to load.
   Static scenery is laid out once from a seeded random so it
   never jitters between frames.
   ============================================================= */

const TW = WORLD.tw, TH = WORLD.th;          // tile width / height on screen

function iso(gx, gy) {
  return { x: (gx - gy) * TW / 2 + WORLD.ox,
           y: (gx + gy) * TH / 2 + WORLD.oy };
}

/* how tall each building stands, in screen pixels above its tile */
const BUILD_H = { barn: 74, house: 68, shed: 46, silo: 86, coop: 42, windmill: 96, stall: 54 };

const C = {
  grass:    '#6aa544', grassAlt: '#5f9a3c', grassLit: '#7cb551',
  dirt:     '#c8a563', dirtLit:  '#d8b878', dirtDark: '#a8874c',
  soil:     '#7b5a3a', soilDark: '#654a2f',
  wall:     '#b5443a', wallDark: '#8f342c', wallLit: '#c9584c',
  cream:    '#e8ddc4', creamDark:'#c9bda2',
  roof:     '#3f5a72', roofDark: '#2e4356', roofLit: '#4d6d88',
  wood:     '#9a7546', woodDark: '#6e5232', woodLit: '#b58f5c',
  metal:    '#b9c2c7', metalDark:'#8d979d',
  glow:     '#ffd36b',
  leaf:     '#3f7a2e', leafLit:  '#599a3f', leafDark: '#2f5f22',
};

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/* one flat diamond tile */
function tile(ctx, gx, gy, fill, inset = 0) {
  const p = iso(gx, gy);
  const hw = TW / 2 - inset, hh = TH / 2 - inset * (TH / TW);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - hh); ctx.lineTo(p.x + hw, p.y);
  ctx.lineTo(p.x, p.y + hh); ctx.lineTo(p.x - hw, p.y);
  ctx.closePath(); ctx.fill();
}

/* an upright box: top face + two side faces */
function box(ctx, gx, gy, w, d, h, top, left, right, lift = 0) {
  const c = iso(gx, gy);
  const hw = w * TW / 2, hd = d * TH / 2;
  const by = c.y - lift;                       // base centre
  const ty = by - h;                           // top centre
  ctx.fillStyle = left;                        // left/front face
  ctx.beginPath();
  ctx.moveTo(c.x - hw, by - hd * 0); ctx.lineTo(c.x, by + hd);
  ctx.lineTo(c.x, ty + hd); ctx.lineTo(c.x - hw, ty); ctx.closePath(); ctx.fill();
  ctx.fillStyle = right;                       // right face
  ctx.beginPath();
  ctx.moveTo(c.x + hw, by); ctx.lineTo(c.x, by + hd);
  ctx.lineTo(c.x, ty + hd); ctx.lineTo(c.x + hw, ty); ctx.closePath(); ctx.fill();
  ctx.fillStyle = top;                         // top face
  ctx.beginPath();
  ctx.moveTo(c.x, ty - hd); ctx.lineTo(c.x + hw, ty);
  ctx.lineTo(c.x, ty + hd); ctx.lineTo(c.x - hw, ty); ctx.closePath(); ctx.fill();
  return { cx: c.x, top: ty, base: by, hw, hd };
}

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.view = { scale: 1, ox: 0, oy: 0 };
    this.t = 0;
    this.puffs = []; this.smoke = [];
    this.buildGround();
    this.buildScenery();
    this.buildAnimals();
  }

  /* ---------- ground map: grass / path / crop soil ---------- */
  buildGround() {
    const rnd = seeded(20260914);
    const g = [];
    for (let y = 0; y < GRID.h; y++) {
      g[y] = [];
      for (let x = 0; x < GRID.w; x++) g[y][x] = rnd() < 0.5 ? 'grass' : 'grassAlt';
    }
    const road = (x, y) => { if (g[y] && g[y][x]) g[y][x] = 'dirt'; };

    // the main farm road, plus a lane to every building and between hand-offs
    for (let x = 0; x < GRID.w; x++) { road(x, 10); road(x, 11); }
    for (const s of STATIONS) {
      for (let y = Math.min(s.gy + 1, 10); y <= Math.max(s.gy + 1, 10); y++) road(s.gx, y);
      road(s.gx - 1, s.gy + 1); road(s.gx + 1, s.gy + 1);
    }
    for (const s of STATIONS) {
      if (!s.to) continue;
      const t = STATIONS.find(q => q.id === s.to);
      if (s.zone !== t.zone) continue;
      const y = s.gy + 1;
      for (let x = Math.min(s.gx, t.gx); x <= Math.max(s.gx, t.gx); x++) road(x, y);
      for (let yy = Math.min(y, t.gy + 1); yy <= Math.max(y, t.gy + 1); yy++) road(t.gx, yy);
    }

    // planted rows in the leftover space inside each paddock
    for (const z of Object.values(ZONES)) {
      for (let y = z.gy; y < z.gy + z.gh; y++)
        for (let x = z.gx; x < z.gx + z.gw; x++) {
          if (!g[y] || g[y][x] !== 'grass' && g[y][x] !== 'grassAlt') continue;
          const nearBuilding = STATIONS.some(s => Math.abs(s.gx - x) <= 1 && Math.abs(s.gy - y) <= 1);
          if (!nearBuilding && rnd() < 0.34) g[y][x] = 'soil';
        }
    }
    this.ground = g;
  }

  buildScenery() {
    const rnd = seeded(4242);
    this.trees = []; this.props = [];
    for (let i = 0; i < 300; i++) {
      const gx = rnd() * GRID.w, gy = rnd() * GRID.h;
      const tx = Math.floor(gx), ty = Math.floor(gy);
      if (!this.ground[ty] || this.ground[ty][tx] === 'dirt' || this.ground[ty][tx] === 'soil') continue;
      if (STATIONS.some(s => Math.abs(s.gx - gx) < 1.6 && Math.abs(s.gy - gy) < 1.6)) continue;
      const inZone = Object.values(ZONES).some(z =>
        gx > z.gx - 0.5 && gx < z.gx + z.gw + 0.5 && gy > z.gy - 0.5 && gy < z.gy + z.gh + 0.5);
      const r = rnd();
      if (!inZone && r < 0.5 && this.trees.length < 42)
        this.trees.push({ gx, gy, s: 0.8 + rnd() * 0.5, p: rnd() * 6.28 });
      else if (inZone && r > 0.93 && this.props.length < 26)
        this.props.push({ gx, gy, kind: rnd() < 0.55 ? 'hay' : 'crate' });
    }
  }

  buildAnimals() {
    const rnd = seeded(77);
    this.animals = [];
    for (let i = 0; i < 12; i++) {
      const z = Object.values(ZONES)[i % 4];
      this.animals.push({
        gx: z.gx + 1 + rnd() * (z.gw - 2), gy: z.gy + 1 + rnd() * (z.gh - 2),
        tx: 0, ty: 0, wait: rnd() * 3, face: 1, zone: z, hop: rnd() * 6.28,
        kind: i % 3 === 0 ? 'sheep' : 'chicken',
      });
    }
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width  = Math.round(r.width  * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.cssW = r.width; this.cssH = r.height;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const scale = Math.min(r.width / WORLD.w, r.height / WORLD.h);
    this.view = { scale, ox: (r.width - WORLD.w * scale) / 2, oy: (r.height - WORLD.h * scale) / 2 };
  }

  toWorld(cx, cy) {
    const r = this.canvas.getBoundingClientRect();
    return { x: (cx - r.left - this.view.ox) / this.view.scale,
             y: (cy - r.top  - this.view.oy) / this.view.scale };
  }

  /* screen point -> grid tile (inverse iso) */
  toGrid(sx, sy) {
    const x = sx - WORLD.ox, y = sy - WORLD.oy;
    return { gx: (x / (TW / 2) + y / (TH / 2)) / 2,
             gy: (y / (TH / 2) - x / (TW / 2)) / 2 };
  }

  /* ================= main draw ================= */
  draw(world, selected, hovered, dt) {
    this.t += dt;
    this.stepParticles(dt);
    this.stepAnimals(dt);

    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.cssW, this.cssH);
    const sky = ctx.createLinearGradient(0, 0, 0, this.cssH);
    sky.addColorStop(0, '#1b4a8f'); sky.addColorStop(1, '#0f2c5c');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, this.cssW, this.cssH);
    ctx.translate(this.view.ox, this.view.oy);
    ctx.scale(this.view.scale, this.view.scale);

    this.drawGround(ctx);

    /* one depth-sorted pass so nothing draws through anything in front */
    const layer = [
      ...Object.values(ZONES).map(z => ({ d: z.gx + 0.6 + z.gy + z.gh + 0.8, k: 's', r: z })),
      ...world.stations.map(s => ({ d: s.gx + s.gy, k: 'b', r: s })),
      ...this.trees.map(t      => ({ d: t.gx + t.gy, k: 't', r: t })),
      ...this.props.map(p      => ({ d: p.gx + p.gy, k: 'p', r: p })),
      ...this.animals.map(a    => ({ d: a.gx + a.gy, k: 'a', r: a })),
      ...world.operators.map(o => ({ d: o.mv.x + o.mv.y, k: 'o', r: o })),
      ...world.couriers.map(c  => ({ d: c.mv.x + c.mv.y, k: 'c', r: c })),
    ].sort((m, n) => m.d - n.d);

    for (const it of layer) {
      if      (it.k === 's') this.drawSign(ctx, it.r);
      else if (it.k === 'b') this.drawStation(ctx, it.r, selected, hovered);
      else if (it.k === 't') this.drawTree(ctx, it.r);
      else if (it.k === 'p') this.drawProp(ctx, it.r);
      else if (it.k === 'a') this.drawAnimal(ctx, it.r);
      else if (it.k === 'o') this.drawOperator(ctx, it.r, selected, hovered);
      else                   this.drawCourier(ctx, it.r, selected, hovered);
    }

    this.drawParticles(ctx);
    ctx.restore();
  }

  /* ---------- ground ---------- */
  drawGround(ctx) {
    // drop shadow under the whole island
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    const a = iso(0, 0), b = iso(GRID.w, 0), c2 = iso(GRID.w, GRID.h), d = iso(0, GRID.h);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y + 16); ctx.lineTo(b.x, b.y + 16);
    ctx.lineTo(c2.x, c2.y + 16); ctx.lineTo(d.x, d.y + 16); ctx.closePath(); ctx.fill();

    // soil rim so the farm reads as a slab, like the reference
    ctx.fillStyle = C.soilDark;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(c2.x, c2.y + 14);
    ctx.lineTo(b.x, b.y + 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.soil;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(c2.x, c2.y + 14);
    ctx.lineTo(d.x, d.y + 14); ctx.closePath(); ctx.fill();

    for (let y = 0; y < GRID.h; y++) {
      for (let x = 0; x < GRID.w; x++) {
        const k = this.ground[y][x];
        if (k === 'dirt') {
          tile(ctx, x, y, C.dirt);
          tile(ctx, x, y, C.dirtLit, 4);
        } else if (k === 'soil') {
          tile(ctx, x, y, C.soilDark);
          tile(ctx, x, y, C.soil, 2);
          this.drawCropRow(ctx, x, y);
        } else {
          tile(ctx, x, y, C[k]);
        }
      }
    }
  }

  drawCropRow(ctx, gx, gy) {
    const p = iso(gx, gy);
    for (let i = -1; i <= 1; i++) {
      const sway = Math.sin(this.t * 1.6 + gx + gy + i) * 1.5;
      const bx = p.x + i * 11, by = p.y + i * 2;
      ctx.strokeStyle = C.leafDark; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, by + 3); ctx.lineTo(bx + sway, by - 6); ctx.stroke();
      ctx.fillStyle = C.leafLit;
      ctx.beginPath(); ctx.ellipse(bx + sway, by - 7, 3.4, 2.4, 0, 0, 6.2832); ctx.fill();
    }
    ctx.lineCap = 'butt';
  }

  /* ---------- paddock signpost ---------- */
  drawSign(ctx, z) {
    const p = iso(z.gx + 0.6, z.gy + z.gh + 0.8);
    const label = z.name.toUpperCase();
    ctx.font = '700 12px ui-sans-serif, system-ui, sans-serif';
    ctx.letterSpacing = '1.3px';
    const w = ctx.measureText(label).width + 22;
    ctx.fillStyle = C.woodDark; ctx.fillRect(p.x - 2, p.y - 14, 4, 20);
    ctx.fillStyle = C.wood; rr(ctx, p.x - w / 2, p.y - 32, w, 19, 4); ctx.fill();
    ctx.fillStyle = C.woodLit; rr(ctx, p.x - w / 2 + 2, p.y - 30, w - 4, 5, 2); ctx.fill();
    ctx.strokeStyle = C.woodDark; ctx.lineWidth = 1.6;
    rr(ctx, p.x - w / 2, p.y - 32, w, 19, 4); ctx.stroke();
    ctx.fillStyle = hexA(z.color, 1);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, p.x, p.y - 22);
    ctx.letterSpacing = '0px';
  }

  /* ---------- scenery ---------- */
  drawTree(ctx, t) {
    const p = iso(t.gx, t.gy);
    const sway = Math.sin(this.t * 0.9 + t.p) * 1.8;
    const s = t.s;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 14 * s, 6 * s, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = C.woodDark; ctx.fillRect(p.x - 3 * s, p.y - 22 * s, 6 * s, 22 * s);
    ctx.fillStyle = C.leafDark;
    ctx.beginPath(); ctx.arc(p.x + sway, p.y - 30 * s, 15 * s, 0, 6.2832); ctx.fill();
    ctx.fillStyle = C.leaf;
    ctx.beginPath(); ctx.arc(p.x + sway - 3 * s, p.y - 34 * s, 12 * s, 0, 6.2832); ctx.fill();
    ctx.fillStyle = C.leafLit;
    ctx.beginPath(); ctx.arc(p.x + sway - 5 * s, p.y - 38 * s, 7 * s, 0, 6.2832); ctx.fill();
  }

  drawProp(ctx, pr) {
    const p = iso(pr.gx, pr.gy);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 12, 5, 0, 0, 6.2832); ctx.fill();
    if (pr.kind === 'hay') {
      ctx.fillStyle = '#d4b158';
      ctx.beginPath(); ctx.ellipse(p.x, p.y - 7, 12, 9, 0, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = '#b0913f'; ctx.lineWidth = 1.4;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.ellipse(p.x, p.y - 7, 12 - Math.abs(i) * 4, 9, 0, 0, 6.2832); ctx.stroke();
      }
    } else {
      box(ctx, pr.gx, pr.gy, 0.42, 0.42, 13, C.woodLit, C.woodDark, C.wood);
    }
  }

  /* ---------- animals ---------- */
  stepAnimals(dt) {
    for (const a of this.animals) {
      const d = Math.hypot(a.tx - a.gx, a.ty - a.gy);
      if (d < 0.08) {
        a.wait -= dt;
        if (a.wait <= 0) {
          a.wait = 1 + Math.random() * 4;
          a.tx = a.zone.gx + 0.6 + Math.random() * (a.zone.gw - 1.2);
          a.ty = a.zone.gy + 0.6 + Math.random() * (a.zone.gh - 1.2);
        }
      } else {
        const sp = (a.kind === 'sheep' ? 0.32 : 0.55) * dt;
        a.gx += (a.tx - a.gx) / d * sp;
        a.gy += (a.ty - a.gy) / d * sp;
        a.face = a.tx > a.gx ? 1 : -1;
        a.hop += dt * 9;
      }
    }
  }

  drawAnimal(ctx, a) {
    const p = iso(a.gx, a.gy);
    const moving = Math.hypot(a.tx - a.gx, a.ty - a.gy) > 0.08;
    const y = p.y - (moving ? Math.abs(Math.sin(a.hop)) * 1.6 : 0);
    ctx.fillStyle = 'rgba(0,0,0,0.24)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, 6, 2.6, 0, 0, 6.2832); ctx.fill();
    if (a.kind === 'sheep') {
      ctx.fillStyle = '#f0ece2';
      ctx.beginPath(); ctx.ellipse(p.x, y - 6, 7.5, 5.5, 0, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#3b3630';
      ctx.beginPath(); ctx.arc(p.x + a.face * 7, y - 8, 3, 0, 6.2832); ctx.fill();
      ctx.fillRect(p.x - 4, y - 2, 2, 4); ctx.fillRect(p.x + 3, y - 2, 2, 4);
    } else {
      ctx.fillStyle = '#fbf7ef';
      ctx.beginPath(); ctx.ellipse(p.x, y - 5, 5, 4.2, 0, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.arc(p.x + a.face * 4.2, y - 9, 2.8, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#d1483a';
      ctx.beginPath(); ctx.arc(p.x + a.face * 4.4, y - 11.6, 1.4, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#e8a92e';
      ctx.beginPath(); ctx.moveTo(p.x + a.face * 6.6, y - 9);
      ctx.lineTo(p.x + a.face * 9, y - 8.2); ctx.lineTo(p.x + a.face * 6.6, y - 7.4); ctx.fill();
    }
  }

  /* ---------- particles ---------- */
  stepParticles(dt) {
    for (const p of this.puffs) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += 6 * dt; }
    this.puffs = this.puffs.filter(p => p.life > 0);
    for (const p of this.smoke) { p.life -= dt; p.y -= 15 * dt; p.x += p.drift * dt; p.r += 7 * dt; }
    this.smoke = this.smoke.filter(p => p.life > 0);
  }

  drawParticles(ctx) {
    for (const p of this.puffs) {
      ctx.fillStyle = `rgba(200,175,125,${0.3 * p.life})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
    }
    for (const p of this.smoke) {
      ctx.fillStyle = `rgba(245,242,235,${0.26 * (p.life / p.max)})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
    }
  }

  /* ================= buildings ================= */
  drawStation(ctx, st, selected, hovered) {
    const z = ZONES[st.zone];
    const isSel = selected && selected.kind === 'station' && selected.id === st.id;
    const isHov = hovered  && hovered.kind  === 'station' && hovered.id  === st.id;
    const p = iso(st.gx, st.gy);

    ctx.fillStyle = 'rgba(0,0,0,0.26)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 4, TW * 0.62, TH * 0.62, 0, 0, 6.2832); ctx.fill();
    if (isSel || isHov) {
      ctx.strokeStyle = hexA(z.color, isSel ? 1 : 0.55);
      ctx.lineWidth = isSel ? 3 : 2;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 4, TW * 0.68, TH * 0.68, 0, 0, 6.2832); ctx.stroke();
    }

    this[`b_${st.build}`](ctx, st, st.working);

    const topY = p.y - (BUILD_H[st.build] || 50);

    if (st.working && Math.random() < 0.09 && (st.build === 'house' || st.build === 'barn'))
      this.smoke.push({ x: p.x + 13, y: topY - 4, r: 3, drift: 6 + Math.random() * 7, life: 2.6, max: 2.6 });

    this.lantern(ctx, p.x + TW * 0.42, p.y - 6, st.working);
    this.crates(ctx, st, p);
    this.namePlate(ctx, st, p.x, topY - 30, isSel || isHov);

    if (st.working) {                             // progress ring on the plate
      const ry = topY - 30;
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(p.x, ry - 17, 8.5, 0, 6.2832); ctx.stroke();
      ctx.strokeStyle = z.color; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(p.x, ry - 17, 8.5, -1.5708, -1.5708 + st.progress * 6.2832); ctx.stroke();
      ctx.lineCap = 'butt';
    }
  }

  /* the agent's name floating over its building */
  namePlate(ctx, st, x, y, big) {
    ctx.font = '700 12px ui-sans-serif, system-ui, sans-serif';
    const w = ctx.measureText(st.who).width + 18;
    ctx.fillStyle = 'rgba(14,20,30,0.86)';
    rr(ctx, x - w / 2, y, w, 18, 5); ctx.fill();
    ctx.strokeStyle = hexA(ZONES[st.zone].color, big ? 0.95 : 0.5);
    ctx.lineWidth = 1.4; rr(ctx, x - w / 2, y, w, 18, 5); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(st.who, x, y + 9);
    ctx.font = '600 9.5px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(st.name, x, y + 27);
  }

  /* glowing lamp on a post — bright while the agent is working */
  lantern(ctx, x, y, on) {
    ctx.fillStyle = C.woodDark; ctx.fillRect(x - 1.5, y - 30, 3, 30);
    const pulse = on ? 0.75 + 0.25 * Math.sin(this.t * 4) : 0.28;
    ctx.save();
    ctx.shadowColor = C.glow; ctx.shadowBlur = on ? 16 : 3;
    ctx.fillStyle = on ? hexA(C.glow, pulse) : 'rgba(180,170,140,0.4)';
    ctx.beginPath(); ctx.arc(x, y - 35, 5, 0, 6.2832); ctx.fill();
    ctx.restore();
    ctx.fillStyle = C.woodDark;
    ctx.beginPath(); ctx.moveTo(x - 6, y - 39); ctx.lineTo(x + 6, y - 39); ctx.lineTo(x, y - 45); ctx.fill();
  }

  crates(ctx, st, p) {
    for (let i = 0; i < Math.min(st.input.length, 3); i++)
      this.crate(ctx, p.x - TW * 0.44, p.y + 6 - i * 9, st.input[i]);
    for (let i = 0; i < Math.min(st.tray.length, 3); i++)
      this.crate(ctx, p.x + TW * 0.30, p.y + 12 - i * 9, st.tray[i]);
  }

  crate(ctx, x, y, type) {
    const c = ITEMS[type] ? ITEMS[type].color : '#fff';
    ctx.fillStyle = C.woodDark; rr(ctx, x - 7, y - 9, 14, 10, 2); ctx.fill();
    ctx.fillStyle = C.woodLit;  rr(ctx, x - 7, y - 9, 14, 4, 2); ctx.fill();
    ctx.save(); ctx.shadowColor = c; ctx.shadowBlur = 8;
    ctx.fillStyle = c; ctx.fillRect(x - 3, y - 7, 6, 6); ctx.restore();
  }

  win(ctx, x, y, w, h, on) {
    ctx.fillStyle = on ? C.glow : '#2f3d4a';
    if (on) { ctx.save(); ctx.shadowColor = C.glow; ctx.shadowBlur = 9; }
    ctx.fillRect(x, y, w, h);
    if (on) ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
  }

  /* pitched roof sitting on a box of width/depth w,d at height h */
  roof(ctx, gx, gy, w, d, h, rise, lit, dark) {
    const c = iso(gx, gy);
    const hw = w * TW / 2, hd = d * TH / 2, ty = c.y - h;
    const peak = ty - rise;
    ctx.fillStyle = lit;                       // left slope
    ctx.beginPath();
    ctx.moveTo(c.x - hw - 4, ty + 2); ctx.lineTo(c.x, ty + hd + 2);
    ctx.lineTo(c.x, peak + hd * 0.2); ctx.lineTo(c.x - hw - 4, peak - hd * 0.2 + 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = dark;                      // right slope
    ctx.beginPath();
    ctx.moveTo(c.x + hw + 4, ty + 2); ctx.lineTo(c.x, ty + hd + 2);
    ctx.lineTo(c.x, peak + hd * 0.2); ctx.lineTo(c.x + hw + 4, peak - hd * 0.2 + 2);
    ctx.closePath(); ctx.fill();
    return peak;
  }

  b_barn(ctx, st, on) {
    const g = box(ctx, st.gx, st.gy, 1.5, 1.5, 40, C.wallLit, C.wallDark, C.wall);
    this.roof(ctx, st.gx, st.gy, 1.62, 1.62, 40, 30, C.roofLit, C.roofDark);
    const p = iso(st.gx, st.gy);
    ctx.fillStyle = C.woodDark;                 // big doors
    ctx.fillRect(p.x - 16, p.y - 26, 15, 24);
    ctx.strokeStyle = C.creamDark; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(p.x - 16, p.y - 26); ctx.lineTo(p.x - 1, p.y - 2);
    ctx.moveTo(p.x - 1, p.y - 26);  ctx.lineTo(p.x - 16, p.y - 2);
    ctx.stroke();
    this.win(ctx, p.x + 6, p.y - 30, 9, 8, on);
    this.win(ctx, p.x + 20, p.y - 24, 8, 8, on);
  }

  b_house(ctx, st, on) {
    box(ctx, st.gx, st.gy, 1.25, 1.25, 36, C.cream, C.creamDark, '#d8ccb2');
    const peak = this.roof(ctx, st.gx, st.gy, 1.36, 1.36, 36, 26, C.roofLit, C.roofDark);
    const p = iso(st.gx, st.gy);
    ctx.fillStyle = C.wallDark; ctx.fillRect(p.x + 9, peak + 6, 6, 16);   // chimney
    ctx.fillStyle = C.woodDark; ctx.fillRect(p.x - 13, p.y - 22, 11, 20); // door
    this.win(ctx, p.x + 5, p.y - 26, 8, 8, on);
    this.win(ctx, p.x + 17, p.y - 20, 8, 8, on);
  }

  b_shed(ctx, st, on) {
    box(ctx, st.gx, st.gy, 1.05, 1.05, 26, C.woodLit, C.woodDark, C.wood);
    this.roof(ctx, st.gx, st.gy, 1.16, 1.16, 26, 16, C.roofLit, C.roofDark);
    const p = iso(st.gx, st.gy);
    ctx.fillStyle = C.woodDark; ctx.fillRect(p.x - 10, p.y - 17, 9, 15);
    this.win(ctx, p.x + 5, p.y - 19, 7, 7, on);
  }

  b_silo(ctx, st, on) {
    const p = iso(st.gx, st.gy);
    const h = 70, top = p.y - h;
    ctx.fillStyle = C.metalDark;                 // cylinder
    ctx.beginPath();
    ctx.moveTo(p.x - 15, p.y - 4); ctx.lineTo(p.x - 15, top);
    ctx.lineTo(p.x + 15, top); ctx.lineTo(p.x + 15, p.y - 4);
    ctx.ellipse(p.x, p.y - 4, 15, 6, 0, 0, Math.PI); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.metal; ctx.fillRect(p.x - 15, top, 16, h - 4);
    ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = 1;
    for (let y = top + 10; y < p.y - 6; y += 10) {
      ctx.beginPath(); ctx.moveTo(p.x - 15, y); ctx.lineTo(p.x + 15, y); ctx.stroke();
    }
    ctx.fillStyle = C.roofLit;                   // dome
    ctx.beginPath(); ctx.ellipse(p.x, top, 15, 11, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = C.roofDark;
    ctx.beginPath(); ctx.ellipse(p.x, top, 15, 11, 0, Math.PI, Math.PI * 1.5); ctx.fill();
    this.win(ctx, p.x - 4, p.y - 22, 8, 9, on);
  }

  b_coop(ctx, st, on) {
    box(ctx, st.gx, st.gy, 0.95, 0.95, 20, C.woodLit, C.woodDark, C.wood);
    this.roof(ctx, st.gx, st.gy, 1.05, 1.05, 20, 14, C.wallLit, C.wallDark);
    const p = iso(st.gx, st.gy);
    ctx.fillStyle = C.woodDark;                  // ramp
    ctx.beginPath();
    ctx.moveTo(p.x - 6, p.y); ctx.lineTo(p.x + 6, p.y + 5);
    ctx.lineTo(p.x + 6, p.y - 6); ctx.lineTo(p.x - 6, p.y - 11); ctx.closePath(); ctx.fill();
    this.win(ctx, p.x + 6, p.y - 16, 6, 6, on);
  }

  b_windmill(ctx, st, on) {
    const p = iso(st.gx, st.gy);
    const h = 74, top = p.y - h;
    ctx.fillStyle = C.cream;                     // tapered tower
    ctx.beginPath();
    ctx.moveTo(p.x - 17, p.y - 2); ctx.lineTo(p.x - 10, top);
    ctx.lineTo(p.x + 10, top); ctx.lineTo(p.x + 17, p.y - 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.creamDark;
    ctx.beginPath();
    ctx.moveTo(p.x + 2, p.y - 2); ctx.lineTo(p.x + 2, top);
    ctx.lineTo(p.x + 10, top); ctx.lineTo(p.x + 17, p.y - 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.roofLit;                   // cap
    ctx.beginPath(); ctx.ellipse(p.x, top, 12, 9, 0, Math.PI, 0); ctx.fill();
    const spin = this.t * (on ? 2.2 : 0.5);      // sails turn faster while working
    ctx.save(); ctx.translate(p.x, top - 4);
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.rotate(spin + i * 1.5708);
      ctx.fillStyle = C.woodDark; ctx.fillRect(-2, 0, 4, 28);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(2.5, 7, 7, 18);
      ctx.restore();
    }
    ctx.fillStyle = C.wallDark; ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, 6.2832); ctx.fill();
    ctx.restore();
    this.win(ctx, p.x - 4, p.y - 24, 8, 9, on);
  }

  b_stall(ctx, st, on) {
    const p = iso(st.gx, st.gy);
    ctx.fillStyle = C.woodDark;
    ctx.fillRect(p.x - 20, p.y - 30, 4, 30); ctx.fillRect(p.x + 16, p.y - 30, 4, 30);
    box(ctx, st.gx, st.gy, 1.15, 1.15, 16, C.woodLit, C.woodDark, C.wood);
    for (let i = 0; i < 5; i++) {                // striped awning
      ctx.fillStyle = i % 2 ? '#f2ead7' : C.wall;
      ctx.beginPath();
      ctx.moveTo(p.x - 24 + i * 9.6, p.y - 38); ctx.lineTo(p.x - 24 + (i + 1) * 9.6, p.y - 38);
      ctx.lineTo(p.x - 24 + (i + 1) * 9.6, p.y - 29); ctx.lineTo(p.x - 24 + i * 9.6, p.y - 29);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = on ? C.glow : 'rgba(255,255,255,0.25)';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(p.x - 12 + i * 12, p.y - 43, 3, 0, 6.2832); ctx.fill(); }
  }

  /* ================= farm hands ================= */
  person(ctx, mv, color, opts) {
    const p = iso(mv.x, mv.y);
    const bob = mv.moving ? Math.sin(mv.bob) * 1.8 : 0;
    const x = p.x, y = p.y + bob;

    if (mv.moving && Math.random() < 0.08)
      this.puffs.push({ x: p.x - mv.facing * 4, y: p.y + 2, r: 1.6,
                        vx: -mv.facing * 6, vy: -2, life: 0.5 });

    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 8, 3.4, 0, 0, 6.2832); ctx.fill();
    if (opts.ring) {
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 12, 5.6, 0, 0, 6.2832); ctx.stroke();
    }
    if (mv.moving) {
      const sw = Math.sin(mv.bob) * 3;
      ctx.strokeStyle = '#4a3826'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 2, y - 5); ctx.lineTo(x - 2 + sw, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 2, y - 5); ctx.lineTo(x + 2 - sw, y); ctx.stroke();
      ctx.lineCap = 'butt';
    }
    ctx.fillStyle = color;
    rr(ctx, x - 6, y - 16, 12, 13, 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.24)';
    rr(ctx, x - 6, y - 16, 12, 5, 4); ctx.fill();
    ctx.fillStyle = '#f4d9b8';
    ctx.beginPath(); ctx.arc(x, y - 22, 5.4, 0, 6.2832); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath(); ctx.arc(x + mv.facing * 1.8 - 1.4, y - 21.5, 0.95, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(x + mv.facing * 1.8 + 1.4, y - 21.5, 0.95, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#e0bd7c';                    // straw hat
    ctx.beginPath(); ctx.ellipse(x, y - 25.5, 9.5, 3, 0, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y - 27, 4.6, Math.PI, 0); ctx.fill();

    if (opts.carrying) this.crate(ctx, x + mv.facing * 12, y - 8, opts.carrying);

    if (opts.label) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.font = '700 10px ui-sans-serif, system-ui, sans-serif';
      const w = ctx.measureText(opts.label).width + 12;
      ctx.fillStyle = 'rgba(14,20,30,0.85)';
      rr(ctx, x - w / 2, y - 43, w, 15, 4); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle';
      ctx.fillText(opts.label, x, y - 35);
    }
    if (opts.bubble) {
      ctx.font = '600 10.5px ui-sans-serif, system-ui, sans-serif';
      const w = ctx.measureText(opts.bubble).width + 16;
      const bx = x - w / 2, by = y - (opts.label ? 66 : 48);
      ctx.fillStyle = 'rgba(14,20,30,0.92)'; rr(ctx, bx, by, w, 19, 9); ctx.fill();
      ctx.strokeStyle = hexA(color, 0.7); ctx.lineWidth = 1; rr(ctx, bx, by, w, 19, 9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 4, by + 19); ctx.lineTo(x, by + 24); ctx.lineTo(x + 4, by + 19);
      ctx.fillStyle = 'rgba(14,20,30,0.92)'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(opts.bubble, x, by + 10);
    }
  }

  drawOperator(ctx, o, selected, hovered) {
    const sel = selected && selected.kind === 'operator' && selected.id === o.station.id;
    const hov = hovered  && hovered.kind  === 'operator' && hovered.id  === o.station.id;
    this.person(ctx, o.mv, o.color, {
      ring: sel, label: sel || hov ? o.name : null,
      bubble: (sel || hov) && o.station.working ? o.station.role : null,
    });
  }

  drawCourier(ctx, c, selected, hovered) {
    const sel = selected && selected.kind === 'courier' && selected.id === c.name;
    const hov = hovered  && hovered.kind  === 'courier' && hovered.id  === c.name;
    this.person(ctx, c.mv, c.color, {
      ring: sel, carrying: c.carrying, label: sel || hov ? c.name : null,
      bubble: (sel || hov) && c.phase === 'deliver' ? `→ ${c.job.to.who}` : null,
    });
  }

  /* ---------- hit testing (screen space) ---------- */
  pick(world, wx, wy) {
    const near = (mv, r) => {
      const p = iso(mv.x, mv.y);
      return Math.abs(p.x - wx) < r && wy < p.y + 6 && wy > p.y - 30;
    };
    for (const c of world.couriers) if (near(c.mv, 11)) return { kind: 'courier', id: c.name, ref: c };
    for (const o of world.operators) if (near(o.mv, 11)) return { kind: 'operator', id: o.station.id, ref: o };

    // buildings: test front-to-back so the nearest one wins
    const sorted = [...world.stations].sort((a, b) => (b.gx + b.gy) - (a.gx + a.gy));
    for (const s of sorted) {
      const p = iso(s.gx, s.gy);
      const h = BUILD_H[s.build] || 50;
      if (Math.abs(p.x - wx) < TW * 0.55 && wy < p.y + TH * 0.6 && wy > p.y - h - 34)
        return { kind: 'station', id: s.id, ref: s };
    }
    return null;
  }
}

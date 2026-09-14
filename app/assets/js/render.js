/* =============================================================
   render.js — draws the facility. Everything is drawn with plain
   canvas paths, so there are no image assets to load or lose.
   ============================================================= */

const DESK_W = 58, DESK_H = 40;

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

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.view = { scale: 1, ox: 0, oy: 0 };
    this.t = 0;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width  = Math.round(r.width  * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.cssW = r.width; this.cssH = r.height;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const scale = Math.min(r.width / WORLD.w, r.height / WORLD.h);
    this.view = {
      scale,
      ox: (r.width  - WORLD.w * scale) / 2,
      oy: (r.height - WORLD.h * scale) / 2,
    };
  }

  toWorld(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left - this.view.ox) / this.view.scale,
      y: (clientY - r.top  - this.view.oy) / this.view.scale,
    };
  }

  draw(world, selected, hovered, dt) {
    this.t += dt;
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.cssW, this.cssH);
    ctx.fillStyle = '#08080b';
    ctx.fillRect(0, 0, this.cssW, this.cssH);
    ctx.translate(this.view.ox, this.view.oy);
    ctx.scale(this.view.scale, this.view.scale);

    this.drawFloor(ctx);
    Object.values(ZONES).forEach(z => this.drawZone(ctx, z));
    this.drawHall(ctx);
    this.drawLines(ctx, world);
    world.stations.forEach(s => this.drawStation(ctx, s, selected, hovered));

    // people sorted back-to-front so overlaps look right
    const people = [...world.operators.map(o => ({ o, y: o.mv.y })),
                    ...world.couriers.map(c => ({ c, y: c.mv.y }))]
                    .sort((a, b) => a.y - b.y);
    for (const p of people) {
      if (p.o) this.drawOperator(ctx, p.o, selected, hovered);
      else     this.drawCourier(ctx, p.c, selected, hovered);
    }
    ctx.restore();
  }

  drawFloor(ctx) {
    ctx.fillStyle = '#0c0c11';
    rr(ctx, 20, 90, WORLD.w - 40, WORLD.h - 110, 22); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.022)';
    ctx.lineWidth = 1;
    for (let x = 40; x < WORLD.w - 20; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 90); ctx.lineTo(x, WORLD.h - 20); ctx.stroke();
    }
    for (let y = 110; y < WORLD.h - 20; y += 40) {
      ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(WORLD.w - 20, y); ctx.stroke();
    }
  }

  drawZone(ctx, z) {
    ctx.fillStyle = hexA(z.color, 0.055);
    rr(ctx, z.x, z.y, z.w, z.h, 16); ctx.fill();
    ctx.strokeStyle = hexA(z.color, 0.34);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([9, 7]);
    rr(ctx, z.x, z.y, z.w, z.h, 16); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = hexA(z.color, 0.95);
    ctx.font = '700 15px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.letterSpacing = '2px';
    const heading = z.name.toUpperCase();
    ctx.fillText(heading, z.x + 16, z.y - 12);
    const headingW = ctx.measureText(heading).width;   // measured in the heading's own font
    ctx.letterSpacing = '0px';
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    ctx.font = '500 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(z.sub, z.x + 16 + headingW + 12, z.y - 12);
  }

  drawHall(ctx) {
    const y = WORLD.hallY;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 30;
    ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(WORLD.w - 40, y); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1.5; ctx.setLineDash([14, 12]);
    ctx.lineDashOffset = -this.t * 22;
    ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(WORLD.w - 40, y); ctx.stroke();
    ctx.setLineDash([]); ctx.lineDashOffset = 0;
  }

  /* faint production-line arrows desk -> desk */
  drawLines(ctx, world) {
    ctx.lineWidth = 1.4;
    for (const s of world.stations) {
      if (!s.to) continue;
      const t = world.byId[s.to];
      const col = ZONES[s.zone].color;
      ctx.strokeStyle = hexA(col, 0.20);
      ctx.setLineDash([5, 9]);
      ctx.lineDashOffset = -this.t * 26;
      ctx.beginPath();
      if (s.zone === t.zone) {
        ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y);
      } else {
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x, WORLD.hallY);
        ctx.lineTo(t.x, WORLD.hallY);
        ctx.lineTo(t.x, t.y);
      }
      ctx.stroke();
      ctx.setLineDash([]); ctx.lineDashOffset = 0;
    }
  }

  drawStation(ctx, s, selected, hovered) {
    const col = ZONES[s.zone].color;
    const x = s.x - DESK_W / 2, y = s.y - DESK_H / 2;
    const isSel = selected && selected.kind === 'station' && selected.id === s.id;
    const isHov = hovered && hovered.kind === 'station' && hovered.id === s.id;

    // floor shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(s.x, y + DESK_H + 4, DESK_W * 0.52, 8, 0, 0, 6.2832); ctx.fill();

    // desk body
    ctx.fillStyle = '#1b1b23';
    rr(ctx, x, y, DESK_W, DESK_H, 8); ctx.fill();
    ctx.strokeStyle = isSel ? col : (isHov ? hexA(col, 0.75) : 'rgba(255,255,255,0.10)');
    ctx.lineWidth = isSel ? 2.4 : 1.4;
    rr(ctx, x, y, DESK_W, DESK_H, 8); ctx.stroke();

    // desk top surface
    ctx.fillStyle = hexA(col, 0.14);
    rr(ctx, x + 5, y + 5, DESK_W - 10, 13, 4); ctx.fill();

    // monitor
    ctx.fillStyle = s.working ? hexA(col, 0.9) : 'rgba(255,255,255,0.16)';
    rr(ctx, s.x - 11, y + 21, 22, 13, 3); ctx.fill();

    // status LED
    const pulse = 0.55 + 0.45 * Math.sin(this.t * 5);
    ctx.fillStyle = s.working ? hexA('#34d399', pulse) : 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.arc(x + DESK_W - 9, y + 10, 3, 0, 6.2832); ctx.fill();

    // work progress ring
    if (s.working) {
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(s.x, y - 16, 11, 0, 6.2832); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(s.x, y - 16, 11, -1.5708, -1.5708 + s.progress * 6.2832); ctx.stroke();
      ctx.lineCap = 'butt';
    }

    // input / output trays
    for (let i = 0; i < Math.min(s.input.length, 4); i++)
      this.drawItem(ctx, x - 11, y + DESK_H - 8 - i * 9, s.input[i], 0.9);
    for (let i = 0; i < Math.min(s.tray.length, 4); i++)
      this.drawItem(ctx, x + DESK_W + 11, y + DESK_H - 8 - i * 9, s.tray[i], 1);

    // name
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = isSel || isHov ? '#fff' : 'rgba(255,255,255,0.72)';
    ctx.font = '600 11.5px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(s.name, s.x, y + DESK_H + 12);
  }

  drawItem(ctx, x, y, type, alpha) {
    const c = ITEMS[type] ? ITEMS[type].color : '#fff';
    ctx.save();
    ctx.translate(x, y); ctx.rotate(0.785);
    ctx.shadowColor = c; ctx.shadowBlur = 9;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = c;
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
  }

  /* shared little-person drawing */
  person(ctx, mv, color, opts) {
    const bob = mv.moving ? Math.sin(mv.bob) * 1.6 : 0;
    const x = mv.x, y = mv.y + bob;

    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath(); ctx.ellipse(mv.x, mv.y + 11, 8.5, 3.6, 0, 0, 6.2832); ctx.fill();

    if (opts.ring) {                       // selection halo
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(mv.x, mv.y + 11, 13, 6, 0, 0, 6.2832); ctx.stroke();
    }

    // legs
    if (mv.moving) {
      const s = Math.sin(mv.bob) * 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 2, y + 6); ctx.lineTo(x - 2 + s, y + 11); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 2, y + 6); ctx.lineTo(x + 2 - s, y + 11); ctx.stroke();
      ctx.lineCap = 'butt';
    }

    // body
    ctx.fillStyle = color;
    rr(ctx, x - 6, y - 4, 12, 12, 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    rr(ctx, x - 6, y - 4, 12, 5, 4); ctx.fill();

    // head
    ctx.fillStyle = '#f1d5b4';
    ctx.beginPath(); ctx.arc(x, y - 10, 5.4, 0, 6.2832); ctx.fill();
    ctx.fillStyle = color;                       // visor / hair
    ctx.beginPath(); ctx.arc(x, y - 11.6, 5.4, Math.PI, 0); ctx.fill();
    // eyes
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.beginPath(); ctx.arc(x + mv.facing * 1.9 - 1.4, y - 9, 0.95, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(x + mv.facing * 1.9 + 1.4, y - 9, 0.95, 0, 6.2832); ctx.fill();

    if (opts.carrying) this.drawItem(ctx, x + mv.facing * 10, y - 2, opts.carrying, 1);

    if (opts.label) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText(opts.label, x, y - 18);
    }

    if (opts.bubble) {
      ctx.font = '600 10.5px ui-sans-serif, system-ui, sans-serif';
      const w = ctx.measureText(opts.bubble).width + 16;
      const bx = x - w / 2, by = y - 40;
      ctx.fillStyle = 'rgba(14,14,20,0.94)';
      rr(ctx, bx, by, w, 19, 9); ctx.fill();
      ctx.strokeStyle = hexA(color, 0.55); ctx.lineWidth = 1;
      rr(ctx, bx, by, w, 19, 9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 4, by + 19); ctx.lineTo(x, by + 24); ctx.lineTo(x + 4, by + 19);
      ctx.fillStyle = 'rgba(14,14,20,0.94)'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(opts.bubble, x, by + 10);
    }
  }

  drawOperator(ctx, o, selected, hovered) {
    const sel = selected && selected.kind === 'operator' && selected.id === o.station.id;
    const hov = hovered  && hovered.kind  === 'operator' && hovered.id  === o.station.id;
    this.person(ctx, o.mv, o.color, {
      ring: sel,
      label: sel || hov ? o.name : null,
      bubble: o.station.working ? o.station.role : null,
    });
  }

  drawCourier(ctx, c, selected, hovered) {
    const sel = selected && selected.kind === 'courier' && selected.id === c.name;
    const hov = hovered  && hovered.kind  === 'courier' && hovered.id  === c.name;
    this.person(ctx, c.mv, c.color, {
      ring: sel,
      carrying: c.carrying,
      label: sel || hov ? c.name : null,
      bubble: c.phase === 'deliver' ? `→ ${c.job.to.name}` : null,
    });
  }

  /* --- hit testing --- */
  pick(world, wx, wy) {
    for (const c of world.couriers)
      if (Math.hypot(c.mv.x - wx, c.mv.y - wy) < 16) return { kind: 'courier', id: c.name, ref: c };
    for (const o of world.operators)
      if (Math.hypot(o.mv.x - wx, o.mv.y - wy) < 16) return { kind: 'operator', id: o.station.id, ref: o };
    for (const s of world.stations)
      if (Math.abs(s.x - wx) < DESK_W / 2 + 8 && Math.abs(s.y - wy) < DESK_H / 2 + 12)
        return { kind: 'station', id: s.id, ref: s };
    return null;
  }
}

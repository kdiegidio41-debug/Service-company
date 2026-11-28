// 010 - How a retaining wall holds up a hill. A block wall along z, cut open at z = 0 so the
// section shows the base, the buried row, the setback, drainage gravel, the pipe, fabric and geogrid.
import {
  THREE, lerp, clamp01, rng, easeOutBack, easeOutBounce, mixColor, makeDuck, makeLabel, instanced, shapeOf, extrude, wallGeometry,
} from '../../engine/engine.js';

export function build(ctx) {
  const { scene, tl, lib } = ctx;
  const R = rng(1010);
  const add = (m, cast = false, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; scene.add(m); return m; };
  const basic = o => new THREE.MeshBasicMaterial(o);
  const flat = (pts, mat, z) => { const m = add(new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(pts)), mat), false, false); m.position.z = z; return m; };
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const canvasTex = (w, h, draw, repeat) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); return t;
  };
  // a ribbon of thickness w along a polyline (drawn on the cut face)
  const ribbon = (P, w) => {
    const L = [], Rr = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
      L.push([P[i][0] + nx * w / 2, P[i][1] + ny * w / 2]); Rr.push([P[i][0] - nx * w / 2, P[i][1] - ny * w / 2]);
    }
    return [...L, ...Rr.reverse()];
  };
  const along = (P, q) => {
    const seg = []; let total = 0;
    for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); seg.push(l); total += l; }
    let d = clamp01(q) * total;
    for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) { const k = clamp01(d / seg[i]); return [lerp(P[i][0], P[i + 1][0], k), lerp(P[i][1], P[i + 1][1], k)]; } d -= seg[i]; }
  };

  const D = 30, H = 2.4, SB = 0.042, CY = 0.3, NC = 9, BW = 0.5, BL = 0.8, NB = Math.ceil(D / BL);
  const courseY = c => -0.3 + CY * c;

  // ---------------- the ground ----------------
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(260, 110), basic({ map: lib.tex.skyDay, fog: false, depthWrite: false }));
  sky.position.set(0, 26, -90); scene.add(sky);
  const lowLine = [[-14, 0], [-2.0, 0], [-1.6, -0.35], [-1.3, -0.35], [-0.9, 0], [-0.25, 0]];
  const EX = [[-0.25, 0], [-0.25, -0.6], [0.95, -0.6], [2.6, H]];
  const soilMat = lib.soil({ side: THREE.DoubleSide });
  flat([...lowLine, ...EX.slice(1), [14, H], [14, -4.5], [-14, -4.5]], soilMat, 0);
  add(new THREE.Mesh(wallGeometry(EX, 0, -D), soilMat));
  add(new THREE.Mesh(new THREE.PlaneGeometry(28, 0.05), basic({ color: '#e8dcc8' }))).position.set(0, -4.5, 0.001);
  const grassTex = lib.tex.grass.clone(); grassTex.repeat.set(1 / 4, 1 / 4); grassTex.needsUpdate = true;
  const grass = lib.std({ map: grassTex, side: THREE.DoubleSide });
  add(new THREE.Mesh(wallGeometry(lowLine.slice().reverse(), 0, -D - 30), grass));
  const upper = add(new THREE.Mesh(new THREE.PlaneGeometry(11.4, D + 30).rotateX(-Math.PI / 2), grass));
  upper.position.set(2.6 + 5.7, H, -(D + 30) / 2);
  const turf = lib.mat.grassDark;
  flat(ribbon(lowLine.map(([x, y]) => [x, y - 0.05]), 0.1), turf, 0.002);
  flat(rect(2.6, H - 0.1, 14, H), turf, 0.002);
  // the far end of the cut: more hill, so the wall doesn't end in mid-air
  const farHill = add(new THREE.Mesh(extrude([[-0.25, 0], [-0.25, -0.6], [0.95, -0.6], [2.6, H], [-0.3, H], [-0.6, 1.2]], 40), soilMat));
  farHill.position.z = -D - 40;
  const trees = [[-6, -12, 1.2], [5, -9, 1.4], [8.5, -16, 1.6], [-9, -20, 1.5], [1, -24, 1.7]];
  trees.forEach(([x, z, s]) => {
    const g = new THREE.Group(), y0 = x > 2.6 ? H : 0;
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.26 * s, 3.2 * s, 8), lib.mat.bark); tr.position.y = 1.6 * s; tr.castShadow = true; g.add(tr);
    for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry((0.85 + R() * 0.6) * s, 1), i % 2 ? lib.mat.leafA : lib.mat.leafB); b.position.set((R() - 0.5) * 2 * s, (3.1 + R() * 1.5) * s, (R() - 0.5) * 2 * s); b.castShadow = true; g.add(b); }
    g.position.set(x, y0, z); scene.add(g);
  });

  // ---------------- the hill before (hook) and the dig ----------------
  const digClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 10);
  const native = add(new THREE.Mesh(extrude([[-0.25, 0], [-0.25, -0.6], [0.95, -0.6], [2.6, H], [0.7, H], [0.1, 0]], D), lib.soil({ side: THREE.DoubleSide, clippingPlanes: [digClip] })), true, true);
  native.position.z = -D;

  // ---------------- gravel, base, front fill, backfill ----------------
  const gravelTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#6f6a64'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 420; i++) { const r = 5 + R() * 9; g.fillStyle = `hsl(30, ${6 + R() * 10}%, ${45 + R() * 30}%)`; g.beginPath(); g.ellipse(R() * w, R() * h, r, r * (0.6 + R() * 0.4), R() * 3, 0, 7); g.fill(); g.strokeStyle = 'rgba(40,36,32,0.6)'; g.lineWidth = 1.5; g.stroke(); }
  }, [2.2, 2.2]);
  const gravelMat = lib.std({ map: gravelTex, roughness: 0.95 });
  const gravelFace = basic({ map: gravelTex });
  const base = add(new THREE.Mesh(extrude(rect(-0.25, -0.6, 0.95, -0.3), D), gravelMat), false, true); base.position.z = -D;
  const baseFace = flat(rect(-0.25, -0.6, 0.95, -0.3), gravelFace, 0.002);
  const frontFill = add(new THREE.Mesh(extrude(rect(-0.25, 0, 0, 0.3), D), lib.soil()), false, true);
  const frontFace = flat(rect(-0.25, 0, 0, 0.3), lib.soil(), 0.001);
  const backClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), -1);
  const backPts = [[0.5, -0.3], [1.115, -0.3], [2.6, H - 0.01], [0.5, H - 0.01]];
  const backfill = add(new THREE.Mesh(extrude(backPts, D), lib.soil({ side: THREE.DoubleSide, clippingPlanes: [backClip] })), true, true);
  backfill.position.z = -D;
  const backLawn = add(new THREE.Mesh(new THREE.BoxGeometry(2.6 - 0.84, 0.06, D), grass), false, true);
  backLawn.position.set((2.6 + 0.84) / 2, H + 0.02, -D / 2);
  // final wall back line (with setback), and the gravel strip behind it
  const stair = []; for (let c = 0; c < NC; c++) stair.push([c * SB + BW, courseY(c)], [c * SB + BW, courseY(c + 1)]);
  const GT = H - 0.15;
  const gravelPts = [...stair.filter(p => p[1] <= GT + 1e-6), [8 * SB + BW, GT], [8 * SB + BW + 0.42, GT], [BW + 0.42, -0.3]];
  const gravelClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), -1);
  const gravelCut = flat(gravelPts, basic({ map: gravelTex, clippingPlanes: [gravelClip] }), 0.003);
  const waterClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), -1);
  const waterOver = flat([...stair, [2.6, H - 0.01], [1.115, -0.3]], basic({ color: '#3d8fe0', transparent: true, opacity: 0.45, clippingPlanes: [waterClip], depthWrite: false }), 0.0035);
  const mudClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 10);
  const mudMat = basic({ color: '#5b3d22', transparent: true, opacity: 0, clippingPlanes: [mudClip], depthWrite: false });
  const mudOver = flat(gravelPts, mudMat, 0.0037);
  const fabricPts = [[BW + 0.42, -0.3], [8 * SB + BW + 0.42, GT], [8 * SB + BW, GT]];
  const fabric = flat(ribbon(fabricPts, 0.035), basic({ color: '#f4f4f0' }), 0.0045);
  const fabricClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), -1); fabric.material.clippingPlanes = [fabricClip];
  // drain pipe and its outlet to the swale
  const PX = 0.69, PY = -0.17;
  const pipeRing = flat([...Array(25)].map((_, i) => [PX + 0.11 * Math.cos(i / 24 * 6.283), PY + 0.11 * Math.sin(i / 24 * 6.283)]), basic({ color: '#2b2b2b' }), 0.005);
  const pipeIn = flat([...Array(25)].map((_, i) => [PX + 0.085 * Math.cos(i / 24 * 6.283), PY + 0.085 * Math.sin(i / 24 * 6.283)]), basic({ color: '#141414' }), 0.0052);
  const pipeHoles = [...Array(5)].map((_, i) => { const a = 0.6 + i * 0.48; const m = flat([...Array(9)].map((_, j) => [PX + 0.098 * Math.cos(a) + 0.016 * Math.cos(j / 8 * 6.283), PY + 0.098 * Math.sin(a) + 0.016 * Math.sin(j / 8 * 6.283)]), basic({ color: '#6f6a64' }), 0.0054); return m; });
  const pipeWater = flat([...Array(25)].map((_, i) => [PX + 0.07 * Math.cos(i / 24 * 6.283), PY - 0.02 + 0.05 * Math.sin(i / 24 * 6.283)]), basic({ color: '#4fa6e6' }), 0.0056);
  const outletLine = [[PX - 0.05, PY - 0.03], [-0.25, -0.24], [-1.0, -0.29], [-1.36, -0.31]];
  const outlet = add(new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(ribbon(outletLine, 0.1))), basic({ color: '#2b2b2b' })), false, false); outlet.position.z = 0.005;
  const outletClip = new THREE.Plane(new THREE.Vector3(1, 0, 0), 10); outlet.material.clippingPlanes = [outletClip];
  const stream = add(new THREE.Mesh(new THREE.PlaneGeometry(0.3, D).rotateX(-Math.PI / 2), lib.std({ color: '#5aaee8', roughness: 0.05, transparent: true, opacity: 0.85 })), false, false);
  stream.position.set(-1.45, -0.33, -D / 2);

  // ---------------- the blocks ----------------
  const blockMat = lib.std({ color: '#ffffff', roughness: 0.8 });
  const blocks = instanced(ctx, new THREE.BoxGeometry(BW, CY - 0.012, BL - 0.02), blockMat, NC * (NB + 1));
  const capI = instanced(ctx, new THREE.BoxGeometry(BW + 0.09, 0.12, BL - 0.02), lib.std({ color: '#c9bfb2', roughness: 0.7 }), NB + 1);
  const hookI = instanced(ctx, new THREE.BoxGeometry(BW, CY - 0.012, BL - 0.02), blockMat, 8 * (NB + 1));
  const shade = ['#a89b8c', '#b6aa9c', '#9f9283'];
  for (let i = 0; i < NC * (NB + 1); i++) blocks.mesh.setColorAt(i, new THREE.Color(shade[(Math.floor(i / (NB + 1)) + i) % 3]));
  for (let i = 0; i < 8 * (NB + 1); i++) hookI.mesh.setColorAt(i, new THREE.Color(shade[(Math.floor(i / (NB + 1)) + i) % 3]));
  const glue = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.025, D), lib.std({ color: '#6b5a3a' })), false, false);

  // ---------------- arrows, labels, overlays ----------------
  const arrowShape = [[0, 0], [0.35, 0.22], [0.35, 0.09], [1.0, 0.09], [1.0, -0.09], [0.35, -0.09], [0.35, -0.22]];
  const arrow = add(new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(arrowShape)), basic({ color: '#e53935', transparent: true, opacity: 0.92, depthTest: false })), false, false);
  arrow.renderOrder = 6;
  const pushLabel = makeLabel(ctx, { height: 0.36 });
  const wedge = flat([[BW, -0.3], [2.55, H - 0.02], [8 * SB + BW, H - 0.02]], basic({ color: '#e53935', transparent: true, opacity: 0, depthWrite: false }), 0.006);
  const gridMat = basic({ color: '#ff8a1c' });
  const grids = [3, 6].map(c => {
    const g = new THREE.Group(); scene.add(g);
    const y = courseY(c), x0 = c * SB + 0.06, x1 = c * SB + 1.75;
    for (let x = x0; x < x1; x += 0.09) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.065, 0.05), gridMat); m.position.set(x - x0 + 0.03, 0, 0); g.add(m); }
    g.position.set(x0, y, 0.0062); return g;
  });
  const blockOutline = new THREE.Group(); scene.add(blockOutline);
  const outlineMat = basic({ color: '#ffe14d', transparent: true, opacity: 0, depthTest: false });
  const ox0 = -0.06, ox1 = 6 * SB + 1.8, oy0 = -0.34, oy1 = H + 0.06;
  [[ox0, oy0, ox1, oy0 + 0.035], [ox0, oy1 - 0.035, ox1, oy1], [ox0, oy0, ox0 + 0.035, oy1], [ox1 - 0.035, oy0, ox1, oy1]].forEach(r => { const m = new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(rect(...r))), outlineMat); m.renderOrder = 7; blockOutline.add(m); });
  blockOutline.position.z = 0.012;
  const tint = flat(rect(ox0, oy0, ox1, oy1), basic({ color: '#ffe14d', transparent: true, opacity: 0, depthWrite: false }), 0.007);

  const rainI = instanced(ctx, new THREE.BoxGeometry(0.014, 0.3, 0.014), basic({ color: '#d9efff', transparent: true, opacity: 0.7 }), 150);
  const rain = Array.from({ length: 150 }, () => ({ x: -3.6 + R() * 7.2, z: -5 + R() * 5.6, o: R() }));
  const dropI = instanced(ctx, new THREE.CircleGeometry(0.03, 10), basic({ color: '#7fd0ff' }), 30);
  const flowI = instanced(ctx, new THREE.CircleGeometry(0.03, 10), basic({ color: '#bfe6ff' }), 16);
  const mudI = instanced(ctx, new THREE.CircleGeometry(0.03, 8), basic({ color: '#6b4a2b' }), 24);

  const duck = makeDuck(ctx);

  // ---------------- camera ----------------
  ctx.shots([
    { at: 0, offset: 0, pos: [-2.0, 2.4, 7.4], look: [0.1, 1.0, -0.8], push: 0.05 },
    { at: 'base', pos: [-0.9, 1.6, 5.4], look: [0.45, -0.3, -0.4] },
    { at: 'slide', pos: [-0.8, 1.1, 4.8], look: [0.45, -0.15, -0.3] },
    { at: 'tip', pos: [-1.0, 2.4, 8.2], look: [0.9, 1.0, -0.6] },
    { at: 'rain', pos: [-0.7, 2.4, 8.2], look: [1.1, 0.95, -0.4] },
    { at: 'pipe', pos: [-0.45, 1.9, 7.2], look: [-0.35, 0.25, -0.3] },
    { at: 'clog', pos: [-0.4, 2.0, 6.6], look: [1.0, 0.9, -0.4] },
    { at: 'tall', pos: [-0.5, 2.6, 9.6], look: [1.25, 1.0, -0.5] },
    { at: 'cap', pos: [-1.6, 3.9, 6.4], look: [0.5, 2.2, -1.2] },
    { at: 'end', pos: [-3.0, 3.4, 11], look: [0.7, 1.1, -2.0], push: 0.06 },
  ]);

  const tmp = new THREE.Vector2();
  const rot = (x, y, px, py, a) => { const c = Math.cos(a), s = Math.sin(a); return [px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c]; };

  return t => {
    ctx.shake = 0;
    // ---- hook: blocks stacked straight up against the bare bank fall over in the rain
    const fallK = tl.lin('hook', 0.45, 0.82), fallA = (Math.PI / 2 - 0.12) * fallK * fallK;
    const goneK = 1 - tl.p('base', 0.0, 0.12);
    let hi = 0;
    for (let c = 0; c < 8; c++) for (let k = 0; k <= NB; k++) {
      const i = hi++;
      if (goneK < 0.01) { hookI.hide(i); continue; }
      const z = -k * BL - BL / 2;
      if (z < -D) { hookI.hide(i); continue; }
      const [x, y] = rot(-0.45 + BW / 2, c * CY + CY / 2, -0.45, 0, fallA);
      hookI.set(i, x, y, z, goneK, 0, 0, fallA);
    }
    hookI.done();
    digClip.constant = lerp(H + 0.2, -0.7, tl.p('base', 0.05, 0.35));
    native.visible = digClip.constant > -0.65;

    // ---- the base: gravel drops in and gets packed
    const baseK = tl.p('base', 0.4, 0.62), pack = tl.p('base', 0.7, 0.9);
    base.visible = baseFace.visible = baseK > 0.01;
    base.position.y = baseFace.position.y = (1 - baseK) * 1.4 + 0.04 * (1 - pack);
    if (tl.on('base') && !tl.on('slide')) ctx.shake = 0.012 * Math.abs(Math.sin(t * 30)) * (pack > 0 && pack < 1 ? 1 : 0);

    // ---- the first row: slides out, then gets buried
    const row0 = easeOutBounce(tl.lin('slide', 0.05, 0.3));
    const slideOut = 0.22 * tl.p('slide', 0.45, 0.8) * (1 - tl.p('bury', 0.0, 0.2));
    const fillK = tl.p('bury', 0.15, 0.55);
    frontFill.visible = frontFace.visible = fillK > 0.01;
    frontFill.scale.y = frontFace.scale.y = Math.max(0.001, fillK);
    frontFill.position.set(0, -0.3, -D); frontFace.position.y = -0.3;
    // ---- the upper rows: straight up, they tip; then each row steps back
    const lean = tl.p('lean', 0.1, 0.6);
    const tipA = 0.11 * tl.p('tip', 0.5, 0.85) * (1 - tl.p('lean', 0.05, 0.4)) + 0.05 * tl.p('tall', 0.4, 0.8) * (1 - tl.p('grid', 0.3, 0.5));
    const stackSeq = tl.lin('tip', 0.02, 0.4) * 8;
    let bi = 0;
    const capSeq = tl.lin('cap', 0.25, 0.7) * (NB + 6);
    for (let c = 0; c < NC; c++) {
      const s = c === 0 ? row0 : easeOutBounce(clamp01((stackSeq - (c - 1)) / 1.2));
      const xf = c * SB * lean - (c === 0 ? slideOut : 0);
      for (let k = 0; k <= NB; k++) {
        const i = bi++;
        const half = c % 2 === 1 && k === 0;
        const zc = c % 2 ? (half ? -BL / 4 : -k * BL) : -(k * BL) - BL / 2;
        if (s <= 0 || zc < -D) { blocks.hide(i); continue; }
        let [x, y] = [xf + BW / 2, courseY(c) + CY / 2 + (1 - s) * 1.2];
        let a = 0;
        if (c > 0 && tipA > 0) { [x, y] = rot(x, y, xf, courseY(1), tipA * (c / 8 + 0.4)); a = tipA * (c / 8 + 0.4); }
        blocks.set(i, x, y, zc + (half ? 0 : 0) + 0.002, 1, 0, 0, a, 1, half ? 0.5 : 1);
      }
    }
    blocks.done();
    for (let k = 0; k <= NB; k++) {
      const s = easeOutBounce(clamp01((capSeq - k * 0.15) / 1.0));
      const zc = -(k * BL) - BL / 2;
      if (s <= 0 || zc < -D) { capI.hide(k); continue; }
      capI.set(k, 8 * SB + 0.24, H + 0.06 + (1 - s) * 1.0, zc + 0.002);
    }
    capI.done();
    const glueK = tl.p('cap', 0.05, 0.3);
    glue.visible = glueK > 0.01 && !tl.on('end'); glue.scale.z = Math.max(0.001, glueK); glue.position.set(8 * SB + BW / 2, H + 0.012, -D * glueK / 2);
    const backTop = tl.on('tip') ? lerp(-0.3, H, clamp01(stackSeq / 8)) : -1;
    backClip.constant = backTop; backfill.visible = backTop > -0.29;
    const lawnK = tl.p('cap', 0.5, 0.9);
    backLawn.visible = lawnK > 0.01; backLawn.scale.set(1, Math.max(0.001, lawnK), 1);

    // ---- rain, water in the soil, gravel and the pipe
    const rainK = Math.max(tl.p('hook', 0, 0.1) * (1 - tl.p('base', 0, 0.15)), tl.p('rain', 0, 0.12) * (1 - tl.p('pipe', 0.6, 1)), tl.p('clog', 0, 0.1) * (1 - tl.p('fabric', 0.6, 1)));
    rain.forEach((r, i) => {
      if (rainK < 0.02) return rainI.hide(i);
      const bottom = r.x < -0.25 ? (r.x > -2 && r.x < -0.9 ? -0.3 : 0) : (tl.on('tip') ? H : 0);
      rainI.set(i, r.x, 7.5 - ((t * 9 + r.o * 20) % (7.5 - bottom)), r.z, rainK);
    });
    rainI.done();
    const gravelK = tl.p('gravel', 0.05, 0.5);
    gravelClip.constant = lerp(-0.31, GT + 0.01, gravelK); gravelCut.visible = gravelK > 0.01;
    let level = -0.32;
    level = lerp(level, 1.9, tl.p('rain', 0.15, 0.6));
    level = lerp(level, -0.32, tl.p('gravel', 0.4, 0.9));
    level = lerp(level, 0.9, tl.p('clog', 0.5, 1.0));
    level = lerp(level, -0.32, tl.p('fabric', 0.5, 0.9));
    waterClip.constant = level; waterOver.visible = level > -0.3;
    const draining = Math.max(tl.p('gravel', 0.4, 0.5) * (1 - tl.p('clog', 0.2, 0.5)), tl.p('fabric', 0.55, 0.65) * (1 - tl.p('tall', 0, 0.3)));
    for (let i = 0; i < 30; i++) {
      if (draining < 0.05) { dropI.hide(i); continue; }
      const q = (t * 0.55 + i / 30) % 1;
      if (i < 18) dropI.set(i, BW + 0.08 + (i % 6) * 0.055 + 0.12 * (1 - q) * ((i % 3) / 3), lerp(1.9 - (i % 4) * 0.3, PY + 0.06, q), 0.0065, draining);
      else dropI.set(i, lerp(1.6, BW + 0.5, q), 0.2 + (i % 6) * 0.25, 0.0065, draining * 0.9);
    }
    dropI.done();
    const pipeK = tl.p('pipe', 0.0, 0.15);
    [pipeRing, pipeIn, ...pipeHoles].forEach(m => { m.visible = pipeK > 0.01; m.scale.set(1, 1, 1); });
    const outK = tl.p('pipe', 0.15, 0.4);
    outletClip.constant = -lerp(PX + 0.2, -1.5, outK); outlet.visible = outK > 0.01;
    const flowK = tl.p('pipe', 0.35, 0.45) * (1 - tl.p('tall', 0, 0.3)) * (1 - 0.8 * tl.p('clog', 0.3, 0.6) * (1 - tl.p('fabric', 0.5, 0.7)));
    pipeWater.visible = flowK > 0.05;
    for (let i = 0; i < 16; i++) {
      if (flowK < 0.05) { flowI.hide(i); continue; }
      const q = (t * 0.6 + i / 16) % 1, [x, y] = along(outletLine, q);
      flowI.set(i, x, y, 0.0058, flowK);
    }
    flowI.done();
    stream.visible = flowK > 0.05 || tl.on('cap'); stream.scale.x = Math.max(0.001, tl.on('cap') ? 0.6 : flowK);

    // ---- mud clogs the gravel, then filter fabric holds it back
    const mudK = tl.p('clog', 0.2, 0.9) * (1 - tl.p('fabric', 0.3, 0.8));
    mudMat.opacity = 0.75 * mudK; mudClip.constant = -lerp(GT, 0.0, tl.p('clog', 0.2, 0.9)); mudOver.visible = mudK > 0.01;
    const fabK = tl.p('fabric', 0.05, 0.45);
    fabricClip.constant = lerp(-0.31, GT + 0.05, fabK); fabric.visible = fabK > 0.01;
    const mudFlow = tl.p('clog', 0.0, 0.15) * (1 - tl.p('fabric', 0.85, 1.0));
    const stopAt = tl.on('fabric') ? BW + 0.42 + 0.05 : BW + 0.12;
    for (let i = 0; i < 24; i++) {
      if (mudFlow < 0.05) { mudI.hide(i); continue; }
      const q = (t * 0.4 + i / 24) % 1, y = 0.1 + (i % 8) * 0.27;
      mudI.set(i, lerp(1.7, stopAt + (i % 3) * 0.03, Math.min(1, q * 1.3)), y - q * 0.25, 0.0066, mudFlow);
    }
    mudI.done();

    // ---- the push from the hill: an arrow that grows with water and height
    let push = 0;
    push = Math.max(push, 0.8 * tl.p('hook', 0.2, 0.4) * (1 - tl.p('hook', 0.8, 0.95)));
    push = Math.max(push, 0.55 * tl.p('slide', 0.3, 0.45) * (1 - tl.p('bury', 0.0, 0.2)), 0.55 * tl.p('bury', 0.6, 0.75) * (1 - tl.p('tip', 0, 0.1)));
    push = Math.max(push, (0.7 * tl.p('tip', 0.4, 0.55) + 0.7 * tl.p('rain', 0.4, 0.75)) * (1 - 0.5 * tl.p('gravel', 0.4, 0.9)) * (1 - tl.p('pipe', 0.6, 0.9)));
    push = Math.max(push, 1.6 * tl.p('tall', 0.2, 0.5) * (1 - tl.p('grid', 0.4, 0.65)));
    arrow.visible = push > 0.02;
    const ap = !tl.on('base') ? [0.95, 1.2] : !tl.on('tip') ? [0.95, -0.15] : [1.25 + 0.2 * push, tl.on('tall') ? 1.2 : 0.9];
    arrow.position.set(ap[0], ap[1], 0.02); arrow.scale.set(push, Math.max(0.5, push), 1);
    pushLabel.sprite.position.set(1.65, 1.55, 0.3);
    pushLabel.set(tl.on('rain') && !tl.on('gravel') && tl.p('rain', 0.6, 0.65) > 0 ? '2× the push' : null);
    const wedgeK = tl.p('tall', 0.1, 0.4) * (1 - tl.p('grid', 0.45, 0.7));
    wedge.material.opacity = 0.32 * wedgeK; wedge.visible = wedgeK > 0.01;
    grids.forEach((g, i) => { const k = tl.p('grid', 0.05 + i * 0.12, 0.3 + i * 0.12); g.visible = k > 0.01; g.scale.x = Math.max(0.001, k); g.position.x = (i ? 6 : 3) * SB + 0.06; });
    const oneK = tl.p('grid', 0.55, 0.75) * (1 - tl.p('cap', 0.0, 0.3));
    outlineMat.opacity = oneK * (0.7 + 0.3 * Math.sin(t * 6)); blockOutline.visible = oneK > 0.01;
    tint.material.opacity = 0.18 * oneK; tint.visible = oneK > 0.01;

    // ---- the duck: rides the falling wall, then watches from the lawn, ends on the cap
    const dk = duck.group, T = id => tl.start(id);
    duck.tint('#ffd21f', 0);
    dk.visible = true;
    if (t < T('base')) {
      if (fallK < 1) {
        const [x, y] = rot(-0.2, 8 * CY, -0.45, 0, fallA);
        dk.position.set(x, y, -1.2); dk.rotation.set(0, -0.6, fallA); dk.scale.setScalar(0.5);
      } else {
        const k = tl.lin('hook', 0.82, 0.95);
        const [x, y] = rot(-0.2, 8 * CY, -0.45, 0, fallA);
        dk.position.set(x - 0.4 * k, lerp(y, 0, Math.min(1, k * 1.2)) + 0.3 * Math.sin(Math.PI * k), -1.2);
        dk.rotation.set(0, -0.6, fallA * (1 - k)); dk.scale.setScalar(0.5);
        duck.tint('#7a5a3a', 0.45 * k);
      }
    } else if (t < tl.at('end', 0.1)) {
      const k = easeOutBack(tl.lin('base', 0.1, 0.25));
      dk.visible = k > 0; dk.scale.setScalar(0.5 * Math.max(0.001, k));
      const away = tl.p('pipe', 0.0, 0.12) * (1 - tl.p('tall', 0.0, 0.12)), hop = Math.sin(Math.PI * clamp01((t - T('pipe')) / (tl.dur('pipe') * 0.12))) * (tl.on('pipe') && !tl.on('clog') ? 1 : 0);
      dk.position.set(lerp(-1.0, -2.35, away), 0.35 * hop, lerp(0.6, 0.3, away)); dk.rotation.set(0, lerp(-0.15, 0.35, away), 0.04 * Math.sin(t * 3));
      duck.tint('#6fa8ff', 0.4 * tl.p('rain', 0.2, 0.4) * (1 - tl.p('pipe', 0.3, 0.8)));
    } else {
      const k = easeOutBack(tl.lin('end', 0.1, 0.3));
      dk.visible = k > 0; dk.scale.setScalar(0.5 * Math.max(0.001, k));
      dk.position.set(9 * SB + 0.25, H + 0.12, -1.2); dk.rotation.set(0, -0.6, 0);
    }
  };
}

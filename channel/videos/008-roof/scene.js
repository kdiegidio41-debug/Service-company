// 008 - How a roof keeps water out.
// Each roof half is built in "roof coordinates": x runs down the slope from the ridge (0) to the
// eave (L) and y points out of the roof. The left half is the right half mirrored.
import {
  THREE, lerp, clamp01, rng, easeOutBack, easeOutBounce, mixColor, makeDuck, instanced, shapeOf, extrude,
} from '../../engine/engine.js';

export function build(ctx) {
  const { scene, tl, lib } = ctx;
  const R = rng(88);
  const before = scene.children.length;
  ctx.buildYard({ profile: [[-0.01, 0], [-0.01, -0.01], [0.01, -0.01], [0.01, 0]], depth: 0.02, rockTop: -4.6 });
  // the neighbours' houses sit right behind the roof and read as the subject, so leave them out
  scene.children.slice(before).forEach(o => { if (o.isGroup && o.children.length > 9 && o.position.z < -25) o.visible = false; });
  const add = (m, cast = true, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; scene.add(m); return m; };
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const basic = o => new THREE.MeshBasicMaterial(o);
  const canvasTex = (w, h, draw, repeat = [1, 1]) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat); t.anisotropy = 4; return t;
  };

  const D = 6, EAVE_X = 3.6, EAVE_Y = 2.75, RIDGE_Y = 5.35, FLAT_Y = 3.05, WALL_X = 3.04, WALL_TOP = 2.8, CEIL = 2.9;
  const TH = Math.atan2(RIDGE_Y - EAVE_Y, EAVE_X), L = Math.hypot(EAVE_X, RIDGE_Y - EAVE_Y);
  // layers in roof coordinates (thicker than life so they read): deck 0..DECK, underlayment DECK..Y0,
  // then shingles two layers thick
  const DECK = 0.1, Y0 = 0.135, H = 0.065, TOP = Y0 + 2 * H, E = 0.26, SL = 2 * E, N = 16, SHIELD = 1.25, STEP = 0.05;
  const CH0 = 1.35, CH1 = 1.95;                    // the chimney's sides (world x)

  const waterMat = lib.std({ color: '#4fa6e6', transparent: true, opacity: 0.82, roughness: 0.05 });
  const metal = lib.std({ color: '#c6cdd4', metalness: 0.55, roughness: 0.3 });

  // ---------------- the house ----------------
  const wallMat = lib.std({ color: '#e9dcc4' });
  add(box(2 * WALL_X + 0.1, 0.15, D, lib.std({ color: '#b98b5a' }))).position.set(0, 0.075, -D / 2);
  add(box(2 * WALL_X, WALL_TOP, 0.15, wallMat)).position.set(0, WALL_TOP / 2, -D + 0.075);
  for (const s of [-1, 1]) add(box(0.18, WALL_TOP, D, wallMat)).position.set(s * (WALL_X - 0.09), WALL_TOP / 2, -D / 2);
  add(box(1.4, 1.0, 0.06, lib.mat.trim), false).position.set(-1.4, 1.55, -D + 0.18);
  add(box(1.2, 0.8, 0.07, lib.std({ color: '#30506f', roughness: 0.2 })), false).position.set(-1.4, 1.55, -D + 0.2);
  const wood = lib.std({ color: '#8a5a32' });
  add(box(2.0, 0.3, 1.5, wood)).position.set(1.3, 0.3, -1.6);
  add(box(0.08, 0.85, 1.5, wood)).position.set(0.28, 0.575, -1.6);
  add(box(1.9, 0.2, 1.4, lib.std({ color: '#f4f1ea' }))).position.set(1.3, 0.55, -1.6);
  add(box(1.4, 0.06, 1.46, lib.std({ color: '#3d6fb6' }))).position.set(1.55, 0.68, -1.6);
  add(box(0.4, 0.1, 0.9, lib.std({ color: '#ffffff' }))).position.set(0.55, 0.7, -1.6);
  const wetMat = basic({ color: '#2f5f9e', transparent: true, opacity: 0.8 });
  const wetSpots = [[0.95, 0.713, -1.0, 0.22], [-0.7, 0.152, -1.1, 0.35]].map(([x, y, z, r]) => {
    const m = add(new THREE.Mesh(new THREE.CircleGeometry(r, 24), wetMat), false, false); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); return m;
  });
  const ceiling = add(box(2 * WALL_X, 0.1, D, lib.std({ color: '#f2eee6' })));
  ceiling.position.set(0, WALL_TOP + 0.05, -D / 2);
  const stainMat = basic({ color: '#9a8158' });
  const stain = add(new THREE.Mesh(new THREE.CircleGeometry(0.3, 24).rotateX(-Math.PI / 2), stainMat), false, false);
  stain.position.set(2.35, CEIL + 0.003, -0.35);
  const stainFace = add(new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.1), stainMat), false, false);
  stainFace.position.set(2.35, WALL_TOP + 0.05, 0.003);
  const gable = add(new THREE.Mesh(extrude([[-2.96, 0], [2.96, 0], [0, 2.1]], 0.15), lib.std({ color: '#d9c29a' })), false, true);
  gable.position.set(0, CEIL, -D);
  const heat = add(new THREE.Mesh(new THREE.ShapeGeometry(shapeOf([[-2.86, CEIL], [2.86, CEIL], [0, 4.95]])),
    basic({ color: '#ff6a1f', transparent: true, opacity: 0, depthWrite: false })), false, false);
  heat.position.z = 0.012;
  const soffits = [-1, 1].map(() => add(box(EAVE_X - WALL_X + 0.06, 0.04, D, lib.std({ color: '#f2eee6' }))));
  const soffitVents = [-1, 1].map(() => add(box(0.3, 0.046, 0.012, basic({ color: '#161616' })), false, false));
  const fasciaMat = lib.std({ color: '#f2eee6' });
  const fascias = [-1, 1].map(() => add(box(0.04, 0.3, D, fasciaMat)));
  const dripV = [-1, 1].map(() => add(box(0.018, 0.15, D + 0.006, metal)));
  const gutterMat = lib.std({ color: '#eceff1', side: THREE.DoubleSide, roughness: 0.4 });
  const gutters = [-1, 1].map(() => {
    const g = new THREE.Group();
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, D, 18, 1, true, Math.PI / 2, Math.PI), gutterMat);
    pipe.rotation.x = -Math.PI / 2; pipe.position.z = -D / 2; pipe.castShadow = true;
    const lip = new THREE.Mesh(new THREE.RingGeometry(0.112, 0.13, 18, 1, Math.PI, Math.PI), gutterMat); lip.position.z = 0.002;
    g.add(pipe, lip); scene.add(g); return g;
  });

  // ---------------- the roof halves ----------------
  const deckMat = lib.std({ color: '#c89b62', roughness: 0.85 });
  const underMat = lib.std({ color: '#3f86b5', roughness: 0.6 });
  const shieldMat = lib.std({ color: '#6c4fa8', roughness: 0.45 });
  const rafterMat = lib.std({ color: '#b07a45' });
  const granules = shade => canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = shade; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '28,30,36' : '170,176,186'},${0.22 + R() * 0.3})`; g.fillRect(R() * w, R() * h, 2 + R() * 2, 2 + R() * 2); }
    g.fillStyle = 'rgba(12,13,16,0.95)'; g.fillRect(0, h / 2 - 3, w, 6);          // the slot between two tabs
  }, [1, 1 / 0.65]);
  const texB = granules('#737b8a'); texB.offset.set(0, 0.5);
  const shingleMats = [lib.std({ map: granules('#4f5664') }), lib.std({ map: texB })];
  const rotMat = basic({ color: '#3d4524' }), moldMat = basic({ color: '#2d3a1c' });
  const courseShape = k => {
    const a = L + 0.02 - k * E - SL, m = a + E, b = a + SL;
    return [[a, Y0], [m, Y0], [m + STEP, Y0 + H], [b, Y0 + H], [b, Y0 + 2 * H - 0.025], [b - 0.035, Y0 + 2 * H],
      [m + STEP, Y0 + 2 * H], [m, Y0 + H], [a + STEP, Y0 + H]];
  };
  const a15 = L + 0.02 - (N - 1) * E - SL, m15 = a15 + E;
  const capShape = [[0, Y0], [a15, Y0], [a15 + STEP, Y0 + H], [m15, Y0 + H], [m15, Y0 + 2 * H - 0.025], [m15 - 0.035, Y0 + 2 * H], [0, Y0 + 2 * H]];
  const halves = [];
  const makeHalf = side => {
    const outer = new THREE.Group(); outer.scale.x = side; scene.add(outer);
    const g = new THREE.Group(); outer.add(g);
    const part = (geo, mat, x = 0, y = 0, z = 0, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; g.add(m); return m; };
    for (let z = -0.45; z > -D; z -= 1.2) part(new THREE.BoxGeometry(L - 0.05, 0.25, 0.12), rafterMat, (L - 0.05) / 2, -0.125, z);
    part(new THREE.BoxGeometry(L, DECK, D), deckMat, L / 2, DECK / 2, -D / 2);
    const under = part(new THREE.BoxGeometry(L + 0.02, Y0 - DECK, D).translate(-(L + 0.02) / 2, 0, 0), underMat, L + 0.02, (DECK + Y0) / 2, -D / 2, false);
    const shield = part(new THREE.BoxGeometry(SHIELD + 0.02, Y0 - DECK + 0.004, D + 0.004).translate(-(SHIELD + 0.02) / 2, 0, 0), shieldMat, L + 0.02, (DECK + Y0) / 2, -D / 2 + 0.002, false);
    const dripH = part(new THREE.BoxGeometry(0.2, 0.014, D + 0.006), metal, L - 0.04, DECK, -D / 2 + 0.003, false);
    const starter = part(extrude([[L + 0.02 - E, Y0], [L + 0.02, Y0], [L + 0.02, Y0 + H], [L + 0.02 - E + STEP, Y0 + H]], D), shingleMats[1], 0, 0, -D);
    const courses = Array.from({ length: N }, (_, k) => part(extrude(courseShape(k), D), shingleMats[k % 2], 0, 0, -D));
    const cap = part(extrude(capShape, D), shingleMats[N % 2], 0, 0, -D);
    const nailMat = basic({ color: '#25272b' });
    const nails = courses.map((_, k) => {
      const x = L + 0.02 - k * E - SL + E - 0.07;
      const grp = new THREE.Group(); g.add(grp);
      const shank = new THREE.Mesh(new THREE.PlaneGeometry(0.014, Y0 + H + 0.02), nailMat); shank.position.set(x, (Y0 + H - 0.02) / 2, 0.006);
      const head = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.012), nailMat); head.position.set(x, Y0 + H, 0.006);
      grp.add(shank, head);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.12, 32), basic({ color: '#ffd23f', transparent: true, opacity: 0, depthTest: false }));
      ring.position.set(x, (Y0 + H) / 2, 0.02); ring.renderOrder = 5; g.add(ring);
      return { grp, ring };
    });
    const rot = Array.from({ length: 14 }, () => part(new THREE.CircleGeometry(0.08 + R() * 0.1, 14).rotateX(-Math.PI / 2), rotMat, 0.3 + R() * (L - 0.6), DECK + 0.0006, -0.2 - R() * 5.4, false));
    const rotFace = Array.from({ length: 5 }, (_, i) => part(new THREE.PlaneGeometry(0.16 + R() * 0.12, 0.07), rotMat, 0.5 + i * 0.75 + R() * 0.3, DECK / 2, 0.002, false));
    const mold = Array.from({ length: 12 }, () => part(new THREE.CircleGeometry(0.02 + R() * 0.025, 10), moldMat, 0.4 + R() * (L - 1.0), 0.02 + R() * 0.06, 0.004, false));
    const puddle = part(new THREE.BoxGeometry(L - 0.5, 0.09, D - 0.4).translate(-(L - 0.5) / 2, 0.045, 0), waterMat, L - 0.15, DECK, -D / 2 - 0.1, false);
    const h = { outer, g, under, shield, dripH, starter, courses, cap, nails, rot, rotFace, mold, puddle };
    halves.push(h); return h;
  };
  const right = makeHalf(1); makeHalf(-1);
  const rpart = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; right.g.add(m); return m; };
  const snow = rpart(extrude([[0.12, 0], [L - 1.25, 0], [L - 1.25, 0.1], [L - 1.6, 0.15], [0.12, 0.17]], D), lib.std({ color: '#eef4fa', roughness: 0.9 }), 0, TOP, -D);
  const iceMat = lib.std({ color: '#cdeeff', roughness: 0.12, transparent: true, opacity: 0.92 });
  const dam = rpart(extrude([[L - 0.62, 0], [L + 0.04, 0], [L + 0.07, 0.08], [L - 0.06, 0.22], [L - 0.42, 0.25], [L - 0.62, 0.12]], D), iceMat, 0, TOP, -D);
  const pool = rpart(new THREE.BoxGeometry(0.63, 0.055, D).translate(0, 0.0275, 0), waterMat, L - 0.935, TOP, -D / 2);
  const flapMat = lib.std({ color: '#3f86b5', side: THREE.DoubleSide });
  const flap = rpart(new THREE.PlaneGeometry(0.5, 0.4).rotateX(-Math.PI / 2).translate(-0.25, 0, 0), flapMat, 2.6, Y0 + 0.003, -0.5);
  const eaveStain = rpart(new THREE.PlaneGeometry(0.34, DECK + 0.002), basic({ color: '#4d3820', transparent: true, opacity: 0 }), L - 0.17, DECK / 2, 0.004);
  const upS = (CH0 - Y0 * Math.sin(TH)) / Math.cos(TH), dnS = (CH1 - TOP * Math.sin(TH)) / Math.cos(TH);
  const flashUpLeg = rpart(new THREE.BoxGeometry(0.42, 0.02, 0.66), metal, upS - 0.21, Y0 + 0.01, -0.29);
  const flashDnLeg = rpart(new THREE.BoxGeometry(0.4, 0.02, 0.66), metal, dnS + 0.2, TOP + 0.01, -0.29);

  // ---------------- chimney, flashing, ridge vent ----------------
  const brick = canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#d9cfc2'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 16; r++) for (let k = -1; k < 4; k++) { g.fillStyle = `hsl(${8 + R() * 10},55%,${34 + R() * 10}%)`; g.fillRect(k * 32 + (r % 2) * 16 + 1, r * 16 + 1, 30, 14); }
  }, [1, 2.6]);
  const chimney = add(new THREE.Mesh(new THREE.BoxGeometry(CH1 - CH0, 5.45, 0.62).translate(0, 2.725, 0), lib.std({ map: brick })));
  chimney.position.set((CH0 + CH1) / 2, 0.15, -0.29);
  const flue = add(new THREE.Mesh(new THREE.PlaneGeometry(0.24, 5.35).translate(0, 2.675, 0), basic({ color: '#3b2a24' })), false, false);
  flue.position.set((CH0 + CH1) / 2, 0.2, 0.022);
  const flashUpV = add(box(0.03, 0.42, 0.66, metal)), flashDnV = add(box(0.03, 0.36, 0.66, metal));
  const ridgeVent = add(new THREE.Mesh(extrude([[-0.46, -0.33], [0, 0], [0.46, -0.33], [0.46, -0.25], [0, 0.08], [-0.46, -0.25]], D + 0.004), lib.std({ color: '#3b3e44' })));
  const ridgeGap = add(new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.32), basic({ color: '#121212' })), false, false);

  // ---------------- particles ----------------
  const rainI = instanced(ctx, new THREE.BoxGeometry(0.014, 0.32, 0.014), basic({ color: '#d9efff', transparent: true, opacity: 0.7 }), 150);
  const rain = Array.from({ length: 150 }, () => ({ x: -4.3 + R() * 8.6, z: -6 + R() * 6.3, o: R() }));
  const snowI = instanced(ctx, new THREE.SphereGeometry(0.035, 6, 5), basic({ color: '#ffffff' }), 110);
  const flakes = Array.from({ length: 110 }, () => ({ x: -4 + R() * 8.5, z: -6 + R() * 6.2, o: R() * 6.5, w: R() * 6 }));
  const drop = basic({ color: '#5fc6ff' });
  const flowI = instanced(ctx, new THREE.SphereGeometry(0.035, 8, 6), drop, 40);
  const dripI = instanced(ctx, new THREE.SphereGeometry(0.04, 8, 6), drop, 16);
  const roomDripI = instanced(ctx, new THREE.SphereGeometry(0.035, 8, 6), drop, 4);
  const leakI = instanced(ctx, new THREE.SphereGeometry(0.03, 8, 6), drop, 18);
  const chLeakI = instanced(ctx, new THREE.SphereGeometry(0.035, 8, 6), drop, 16);
  const heatI = instanced(ctx, new THREE.SphereGeometry(0.03, 6, 5), basic({ color: '#d6efff' }), 20);
  const icicleI = instanced(ctx, new THREE.ConeGeometry(0.03, 1, 8).rotateX(Math.PI).translate(0, -0.5, 0), iceMat, 6);
  const windI = instanced(ctx, new THREE.PlaneGeometry(0.6, 0.02), basic({ color: '#ffffff', transparent: true, opacity: 0.75 }), 12);
  const arrowI = instanced(ctx, new THREE.ConeGeometry(0.055, 0.17, 10), basic({ color: '#ffffff' }), 24);
  for (let i = 0; i < 24; i++) arrowI.mesh.setColorAt(i, new THREE.Color('#6fd0ff'));
  const sun = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), basic({ color: '#ffe066', fog: false, transparent: true }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: lib.tex.glow, color: '#ffcf40', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.scale.set(3.6, 3.6, 1); sun.add(core, halo); scene.add(sun);
  const duck = makeDuck(ctx);
  const cool = new THREE.Color('#6fd0ff'), warm = new THREE.Color('#ff9a4a'), tmpC = new THREE.Color();

  // ---------------- camera ----------------
  ctx.shots([
    { at: 0, offset: 0, pos: [1.2, 4.6, 11.5], look: [1.0, 1.9, -2], push: 0.05 },
    { at: 'pitch', pos: [0.3, 4.8, 23], look: [0.2, 3.0, -2.5] },
    { at: 'rot', pos: [2.1, 6.9, 10.5], look: [1.9, 3.9, -2.5] },
    { at: 'runs', pos: [2.4, 6.4, 9.5], look: [2.2, 3.7, -1.5] },
    { at: 'nails', pos: [3.0, 3.75, 4.4], look: [2.9, 3.3, -0.3] },
    { at: 'edge', pos: [3.25, 3.75, 5.6], look: [3.5, 2.7, -0.3] },
    { at: 'icedam', pos: [2.95, 4.5, 8.4], look: [2.8, 3.2, -1.0] },
    { at: 'chimney', pos: [1.8, 4.9, 7.0], look: [1.65, 4.25, -0.6] },
    { at: 'attic', pos: [1.35, 4.4, 11], look: [1.35, 3.9, -2.5] },
    { at: 'end', pos: [0.3, 5.0, 23], look: [0.2, 3.2, -2.5], push: 0.08 },
  ]);

  // a point and direction a fraction q of the way along a polyline
  const along = (P, q) => {
    const seg = []; let total = 0;
    for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); seg.push(l); total += l; }
    let d = clamp01(q) * total;
    for (let i = 0; i < seg.length; i++) {
      if (d <= seg[i] || i === seg.length - 1) { const k = clamp01(d / seg[i]), a = P[i], b = P[i + 1]; return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), (b[0] - a[0]) / seg[i], (b[1] - a[1]) / seg[i]]; }
      d -= seg[i];
    }
  };

  return t => {
    // ---- the roof's shape: flat boards first, then the ridge rises
    const pK = tl.p('pitch', 0.05, 0.7);
    const ridgeY = lerp(FLAT_Y, RIDGE_Y, pK), eaveY = lerp(FLAT_Y, EAVE_Y, pK);
    const th = Math.atan2(ridgeY - eaveY, EAVE_X), sx = Math.hypot(EAVE_X, ridgeY - eaveY) / L;
    const c = Math.cos(th), sn = Math.sin(th), tn = Math.tan(th);
    halves.forEach(h => { h.g.position.set(0, ridgeY, 0); h.g.rotation.z = -th; h.g.scale.x = sx; });
    const surfY = (x, v) => ridgeY - Math.abs(x) * tn + v / c;                     // world height of layer v at world x
    const toW = (x, v, side = 1) => [side * (x * sx * c + v * sn), ridgeY - x * sx * sn + v * c];
    const underY = x => surfY(x, -0.25) - 0.12;                                     // just under the rafters

    ceiling.visible = pK > 0.5;
    const gx = (ridgeY - 0.25 / c - CEIL) / Math.max(tn, 1e-3);
    gable.visible = pK > 0.5; gable.scale.set(Math.min(gx, WALL_X) / 2.96, Math.max(0.001, (ridgeY - 0.25 / c - 0.03 - CEIL) / 2.1), 1);
    soffits.forEach((m, i) => m.position.set((i ? 1 : -1) * (WALL_X + EAVE_X) / 2, eaveY - 0.25, -D / 2));
    fascias.forEach((m, i) => m.position.set((i ? 1 : -1) * (EAVE_X + 0.06), eaveY - 0.12, -D / 2));

    // ---- rain, the flat roof's puddles and the drips onto the bed
    const rainK = Math.max(
      tl.p('hook', 0, 0.1) * (1 - tl.p('pitch', 0.6, 0.95)),
      tl.p('rot', 0, 0.15) * (1 - tl.p('underlay', 0.6, 0.9)),
      tl.p('runs', 0, 0.15) * (1 - tl.p('drip', 0.85, 1)),
      tl.p('chimney', 0, 0.15) * (1 - tl.p('flashing', 0.75, 1)));
    rain.forEach((r, i) => {
      if (rainK < 0.02) return rainI.hide(i);
      const bottom = Math.abs(r.x) < EAVE_X + 0.05 ? surfY(r.x, TOP) : 0.02, top = 8.6;
      rainI.set(i, r.x, top - ((t * 9 + r.o * 20) % (top - bottom)), r.z, rainK);
    });
    rainI.done();
    const fill = tl.p('hook', 0.12, 0.5), drain = tl.p('pitch', 0.25, 0.75);
    halves.forEach(h => { h.puddle.visible = fill * (1 - drain) > 0.01; h.puddle.scale.set(Math.max(0.001, 1 - drain), Math.max(0.001, fill), 1); });
    const dripsK = tl.p('hook', 0.3, 0.42) * (1 - tl.p('pitch', 0.0, 0.3));
    [[0.95, -1.0, 0.72], [1.57, -1.5, 1.24], [2.0, -1.9, 0.72], [-0.7, -1.1, 0.15]].forEach(([x, z, yEnd], li) => {
      for (let p = 0; p < 4; p++) {
        const i = li * 4 + p;
        if (dripsK < 0.02) { dripI.hide(i); continue; }
        const q = (t * 0.9 + p / 4 + li * 0.13) % 1;
        dripI.set(i, x, lerp(FLAT_Y - 0.03, yEnd, q * q), z, dripsK);
      }
    });
    dripI.done();
    const wetK = tl.p('hook', 0.42, 0.75) * (1 - tl.p('pitch', 0.3, 0.9));
    wetSpots.forEach(m => { m.visible = wetK > 0.01; m.scale.setScalar(Math.max(0.001, wetK)); });

    // ---- the deck soaks and rots, then the underlayment covers it
    const wet = Math.max(tl.p('hook', 0.1, 0.5) * (1 - tl.p('pitch', 0.3, 0.9)), tl.p('rot', 0.1, 0.6) * (1 - tl.p('underlay', 0.3, 0.9)));
    deckMat.color.copy(mixColor('#c89b62', '#7b5a36', wet));
    const rotK = tl.p('rot', 0.35, 0.95) * (tl.on('sun') ? 0 : 1);
    const roll = tl.p('underlay', 0.08, 0.7);
    const bleach = tl.p('sun', 0.15, 0.8) * (1 - tl.p('shingles', 0.0, 0.3));
    underMat.color.copy(mixColor('#3f86b5', '#b9c2c4', bleach)); flapMat.color.copy(underMat.color);
    const seq = tl.lin('shingles', 0.06, 0.92) * (N + 3.5);
    const fall = j => easeOutBounce(clamp01((seq - j) / 1.5));
    const place = (m, j) => { const s = fall(j); m.visible = s > 0; m.position.y = (1 - s) * 0.9; };
    const ringK = tl.p('nails', 0.08, 0.3) * (1 - tl.p('nails', 0.85, 1));
    const dripK = tl.p('drip', 0.0, 0.3), shieldK = tl.p('shield', 0.1, 0.55);
    const moldK = tl.p('attic', 0.5, 0.85) * (1 - tl.p('vent', 0.6, 1));
    halves.forEach(h => {
      h.rot.forEach((m, i) => { m.visible = rotK > i / 14 + 0.02; });
      h.rotFace.forEach((m, i) => { m.visible = rotK > i / 5 + 0.05; });
      h.under.visible = roll > 0.002; h.under.scale.x = Math.max(0.002, roll);
      place(h.starter, 0); h.courses.forEach((m, k) => place(m, k + 1)); place(h.cap, N + 1);
      h.nails.forEach(({ grp, ring }, k) => {
        grp.visible = fall(k + 1) >= 1;
        ring.material.opacity = 0.95 * ringK * (0.75 + 0.25 * Math.sin(t * 7 + k));
        ring.visible = grp.visible && ringK > 0.01;
      });
      h.dripH.visible = dripK > 0.01; h.dripH.position.x = L - 0.04 + (1 - dripK) * 0.6;
      h.shield.visible = shieldK > 0.01; h.shield.scale.x = Math.max(0.001, shieldK);
      h.mold.forEach((m, i) => { m.visible = moldK > i / 12 + 0.03; });
    });
    const pulse = (0.5 + 0.5 * Math.sin(t * 7)) * tl.p('shield', 0.6, 0.72) * (1 - tl.p('chimney', 0, 0.3));
    shieldMat.color.copy(mixColor('#6c4fa8', '#b494ff', pulse));

    // ---- sun and wind on the bare underlayment
    const sunV = tl.p('sun', 0.0, 0.25) * (1 - tl.p('shingles', 0.0, 0.3));
    sun.visible = sunV > 0.01; sun.position.set(3.2, 6.9 + (1 - sunV) * 1.5, -4);
    core.material.opacity = halo.material.opacity = sunV;
    const windK = tl.p('sun', 0.4, 0.6) * (1 - tl.p('shingles', 0.0, 0.2));
    for (let i = 0; i < 12; i++) {
      if (windK < 0.02) { windI.hide(i); continue; }
      const q = (t * 1.3 + i / 12) % 1;
      windI.set(i, lerp(-1, 5, q), 4.1 + (i % 4) * 0.35, -0.4 - (i % 3), windK);
    }
    windI.done();
    flap.visible = windK > 0.02;
    flap.rotation.z = -(0.35 + 0.55 * Math.abs(Math.sin(t * 8))) * windK;

    // ---- water running off the shingles: off the edge, curling under it, then into the gutter
    const runOn = Math.max(tl.p('pitch', 0.45, 0.7) * (1 - tl.p('rot', 0, 0.15)), tl.p('runs', 0.0, 0.2) * (1 - tl.p('icedam', 0, 0.1)));
    const curl = tl.on('edge') && !tl.on('drip'), intoGutter = tl.on('drip') && tl.p('drip', 0.35, 0.4) > 0;
    const v0 = tl.on('rot') ? TOP + 0.025 : 0.085;
    for (let i = 0; i < 40; i++) {
      if (runOn < 0.02) { flowI.hide(i); continue; }
      const side = (i % 2 && !tl.on('rot')) ? -1 : 1;
      const q = (t * 0.5 + i / 40 + (i % 5) * 0.13) % 1, z = -0.15 - (i % 5) * 1.15;
      let x, y;
      if (q < 0.75) [x, y] = toW(lerp(0.25, L + 0.02, q / 0.75), v0, side);
      else {
        const k = (q - 0.75) / 0.25, [ex, ey] = toW(L + 0.03, v0, 1);
        if (curl) [x, y] = along([[ex, ey], [ex + 0.02, ey - 0.13], [3.69, eaveY + 0.02], [3.69, eaveY - 0.29]], k);
        else if (intoGutter) [x, y] = along([[ex, ey], [ex + 0.04, eaveY - 0.02], [3.84, eaveY - 0.27]], k);
        else { x = ex + 0.5 * k; y = ey - 2.8 * k * k; }
        x *= side;
      }
      flowI.set(i, x, y, z, runOn);
    }
    flowI.done();
    const soak = tl.p('edge', 0.35, 0.9) * (1 - tl.p('drip', 0.3, 0.8));
    fasciaMat.color.copy(mixColor('#f2eee6', '#8d7a5c', soak));
    eaveStain.material.opacity = 0.85 * soak; eaveStain.visible = soak > 0.01;
    dripV.forEach((m, i) => { const s = i ? 1 : -1; m.visible = dripK > 0.01; m.position.set(s * (EAVE_X + 0.1 + (1 - dripK) * 0.5), eaveY - 0.03, -D / 2 + 0.003); });
    const gK = easeOutBack(tl.lin('drip', 0.28, 0.5));
    gutters.forEach((g, i) => { g.visible = gK > 0; g.scale.setScalar(Math.max(0.001, gK)); g.position.set((i ? 1 : -1) * 3.84, eaveY - 0.17, 0); });

    // ---- winter: snow, an ice dam at the cold edge, water backing up under the shingles
    const winter = tl.p('icedam', 0.0, 0.15) * (1 - tl.p('chimney', 0.0, 0.3));
    ctx.setNight(0.25 * winter);
    flakes.forEach((f, i) => {
      if (winter < 0.02) return snowI.hide(i);
      snowI.set(i, f.x + 0.3 * Math.sin(t + f.w), 7.6 - ((t * 1.0 + f.o) % 7.4), f.z, winter);
    });
    snowI.done();
    const spring = 1 - tl.p('chimney', 0.0, 0.35);
    const snowK = tl.p('icedam', 0.0, 0.25) * spring, damK = tl.p('icedam', 0.18, 0.38) * spring, poolK = tl.p('icedam', 0.3, 0.5) * spring;
    snow.visible = snowK > 0.01; snow.scale.y = Math.max(0.001, snowK);
    dam.visible = damK > 0.01; dam.scale.y = Math.max(0.001, damK);
    pool.visible = poolK > 0.01; pool.scale.y = Math.max(0.001, poolK);
    [0.6, 0.85, 0.5, 0.75, 0.4, 0.65].forEach((len, i) => {
      if (damK < 0.02 || gK <= 0) return icicleI.hide(i);
      icicleI.set(i, 3.96, eaveY - 0.17, -0.15 - i * 0.65, 1, 0, 0, 0, len * damK * 0.5);
    });
    icicleI.done();
    const backup = tl.p('icedam', 0.7, 0.85) * (1 - tl.p('shield', 0.4, 0.7));
    for (let i = 0; i < 18; i++) {
      if (backup < 0.02) { leakI.hide(i); continue; }
      const q = (t * 0.45 + i / 18) % 1;
      let x, y;
      if (q < 0.4) [x, y] = toW(lerp(L - 0.62, L - 1.35, q / 0.4), Y0 + 0.006);
      else if (q < 0.5) [x, y] = toW(L - 1.35, lerp(Y0, -0.04, (q - 0.4) / 0.1));
      else { [x, y] = toW(L - 1.35, -0.04); y = lerp(y, CEIL + 0.02, (q - 0.5) / 0.5); }
      leakI.set(i, x, y, 0.012, backup);
    }
    leakI.done();
    for (let i = 0; i < 4; i++) {
      if (backup < 0.3) { roomDripI.hide(i); continue; }
      const q = (t * 0.8 + i / 4) % 1;
      roomDripI.set(i, 2.35, lerp(WALL_TOP - 0.02, 0.16, q * q), -0.3, backup);
    }
    roomDripI.done();
    stain.visible = stainFace.visible = backup > 0.02; stain.scale.set(Math.max(0.001, backup), 1, Math.max(0.001, backup)); stainFace.scale.x = Math.max(0.001, backup);

    // ---- the chimney: a gap that leaks, then flashing tucked under the shingles
    const chK = easeOutBack(tl.lin('chimney', 0.3, 0.55));
    chimney.visible = flue.visible = chK > 0; chimney.scale.y = flue.scale.y = Math.max(0.001, chK);
    const fK = tl.p('flashing', 0.2, 0.45), lift = (1 - fK) * 1.0;
    [flashUpV, flashDnV, flashUpLeg, flashDnLeg].forEach(m => { m.visible = fK > 0.01; });
    flashUpV.position.set(CH0 - 0.015, surfY(CH0, Y0) + 0.21 + lift, -0.29);
    flashDnV.position.set(CH1 + 0.015, surfY(CH1, TOP) + 0.18 + lift, -0.29);
    flashUpLeg.position.y = Y0 + 0.01 + lift; flashDnLeg.position.y = TOP + 0.01 + lift;
    const gapK = tl.p('chimney', 0.72, 0.85) * (1 - tl.p('flashing', 0.4, 0.6));
    for (let i = 0; i < 16; i++) {
      if (gapK < 0.02) { chLeakI.hide(i); continue; }
      const q = (t * 0.6 + (i % 8) / 8) % 1, z = -0.05 - (i % 3) * 0.2;
      if (i < 8) { const [x, y] = toW(lerp(0.3, upS - 0.03, q), TOP + 0.025); chLeakI.set(i, x, y, z, gapK); }
      else chLeakI.set(i, CH0 - 0.04, lerp(surfY(CH0, 0) - 0.05, CEIL + 0.02, q), 0.03, gapK);
    }
    chLeakI.done();

    // ---- the attic: hot and damp, then soffit and ridge vents let it breathe
    const hot = tl.p('attic', 0.15, 0.4) * (1 - tl.p('vent', 0.7, 1));
    heat.material.opacity = 0.3 * hot;
    for (let i = 0; i < 20; i++) {
      if (hot < 0.05) { heatI.hide(i); continue; }
      const x = -2.3 + (i / 19) * 4.6, q = (t * 0.3 + i * 0.37) % 1;
      heatI.set(i, x, lerp(CEIL + 0.15, underY(x) + 0.02, q), 0.02, hot * Math.sin(Math.PI * q));
    }
    heatI.done();
    const slotK = tl.p('vent', 0.05, 0.25), ventK = tl.p('vent', 0.35, 0.55);
    soffitVents.forEach((m, i) => { m.visible = slotK > 0.01; m.scale.x = Math.max(0.001, slotK); m.position.set((i ? 1 : -1) * 3.32, eaveY - 0.25, 0.006); });
    ridgeGap.visible = slotK > 0.01; ridgeGap.scale.x = Math.max(0.001, slotK); ridgeGap.position.set(0, ridgeY + 0.04, 0.006);
    ridgeVent.visible = ventK > 0.01; ridgeVent.position.set(0, ridgeY + TOP / c + (1 - ventK) * 0.8, -D);
    const airK = tl.p('vent', 0.6, 0.75) * (1 - tl.p('end', 0.5, 0.9));
    const path = [[3.32, eaveY - 0.6], [3.32, eaveY - 0.22], [2.7, CEIL + 0.12], [0.4, underY(0.4)], [0, ridgeY - 0.1], [0, ridgeY + 1.1]];
    for (let i = 0; i < 24; i++) {
      if (airK < 0.02) { arrowI.hide(i); continue; }
      const side = i < 12 ? 1 : -1, q = (t * 0.2 + (i % 12) / 12) % 1;
      const [x, y, dx, dy] = along(path, q);
      arrowI.set(i, side * x, y, 0.06, airK, 0, 0, Math.atan2(-side * dx, dy));
      arrowI.mesh.setColorAt(i, tmpC.copy(cool).lerp(warm, clamp01((q - 0.55) / 0.25)));
    }
    arrowI.done(); arrowI.mesh.instanceColor.needsUpdate = true;

    // ---- the duck: wet in bed, slides down the new shingles, lands in the gutter, sweats in the attic
    const dk = duck.group, T = id => tl.start(id);
    duck.tint('#ffd21f', 0);
    dk.visible = true;
    if (t < T('runs') + 0.3) {
      const wetD = tl.p('hook', 0.38, 0.55) * (1 - tl.p('pitch', 0.2, 0.8));
      dk.scale.setScalar(0.5 * (1 - clamp01((t - T('runs')) / 0.3)));
      dk.position.set(1.45, 0.71, -1.5);
      dk.rotation.set(0, -0.5, 0.06 * Math.sin(t * 28) * wetD + 0.3 * tl.p('pitch', 0.3, 0.6) * (1 - tl.p('rot', 0, 0.3)));
      duck.tint('#6fa8ff', 0.5 * wetD);
      dk.visible = dk.scale.x > 0.001;
    } else if (t < tl.at('drip', 0.5)) {
      const slide = tl.lin('runs', 0.15, 0.6), fly = tl.lin('runs', 0.6, 0.85);
      dk.scale.setScalar(0.45 * easeOutBack(clamp01((t - T('runs') - 0.3) / 0.35)));
      if (fly <= 0) {
        const [x, y] = toW(lerp(0.4, L + 0.05, slide * slide), TOP);
        dk.position.set(x, y, -1.0); dk.rotation.set(0, 0, -th);
      } else {
        const [x, y] = toW(L + 0.05, TOP);
        dk.position.set(x + 1.6 * fly, y + 0.3 * fly - 3.2 * fly * fly, -1.0); dk.rotation.set(0, 0, -th - 3 * fly);
        dk.visible = fly < 1;
      }
    } else if (t < T('attic')) {
      const k = easeOutBack(tl.lin('drip', 0.5, 0.7));
      dk.visible = k > 0; dk.scale.setScalar(0.3 * Math.max(0.001, k));
      dk.position.set(3.84, eaveY - 0.27 + 0.015 * Math.sin(t * 3), -0.8); dk.rotation.set(0, -0.7, 0.05 * Math.sin(t * 2));
      duck.tint('#cdeeff', 0.65 * winter);
    } else if (t < T('end')) {
      const k = easeOutBack(tl.lin('attic', 0.0, 0.12));
      dk.visible = k > 0; dk.scale.setScalar(0.5 * Math.max(0.001, k));
      dk.position.set(0.75, CEIL, -1.1); dk.rotation.set(0, -0.6, 0.04 * Math.sin(t * 5) * hot);
      duck.tint('#ff6a4a', 0.55 * hot);
    } else {
      const k = easeOutBack(tl.lin('end', 0.0, 0.25));
      dk.visible = k > 0; dk.scale.setScalar(0.6 * Math.max(0.001, k));
      dk.position.set(0, ridgeY + 0.26 + 0.12 * Math.abs(Math.sin(t * 4)) * tl.p('end', 0.3, 0.4), -1.2); dk.rotation.set(0, -0.5, 0);
    }
  };
}

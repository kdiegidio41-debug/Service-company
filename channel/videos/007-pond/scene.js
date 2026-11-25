// 007 - How a backyard pond is built. Each block below is keyed to a beat in script.json.
import {
  THREE, smooth, lerp, clamp01, rng, easeOutBack, easeOutBounce, mixColor,
  makePipe, makeDuck, instanced, insetProfile, xSpanAt, bottomAt, samplePolyline,
  extrude, wallGeometry, shapeOf,
} from '../../engine/engine.js';

export function build(ctx) {
  const { scene, tl, lib } = ctx;
  const R = rng(77);
  const D = 5;
  const P = [[-3.2, 0], [-2.9, -0.5], [-2.0, -0.55], [-1.5, -1.7], [1.4, -1.8], [2.0, -0.6], [2.9, -0.55], [3.2, 0]];
  const UL = insetProfile(P, 0.05);     // underlayment's inner face
  const LN = insetProfile(P, 0.09);     // liner's inner face
  const yard = ctx.buildYard({ profile: P, depth: D, rockTop: -4.4 });
  const add = (m, cast = false, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; scene.add(m); return m; };
  const basic = o => new THREE.MeshBasicMaterial(o);
  const Z = 0.07;

  // ---------------- dig ----------------
  const digPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.02);
  const earth = add(new THREE.Mesh(extrude(P, D - 0.02), lib.soil({ side: THREE.DoubleSide, clippingPlanes: [digPlane] })));
  earth.position.z = -D + 0.01;
  const earthTop = add(new THREE.Mesh(new THREE.PlaneGeometry(1, D - 0.02), lib.soil({ color: '#9a6238' })));
  earthTop.rotation.x = -Math.PI / 2; earthTop.position.z = -D / 2;
  const hose = add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 10), lib.std({ color: '#2f8f3a' })), true, false);
  const hoseStream = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1, 10).translate(0, -0.5, 0), new THREE.MeshStandardMaterial({ color: '#9fe2ff', transparent: true, opacity: 0.8 })), false, false);

  // ---------------- underlayment and liner ----------------
  const felt = lib.std({ color: '#9b9a93', roughness: 1 });
  const ulPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), -3.4);
  felt.clippingPlanes = [ulPlane];
  add(new THREE.Mesh(wallGeometry(UL, -0.01, -D + 0.05), new THREE.MeshStandardMaterial({ color: '#9b9a93', roughness: 1, side: THREE.DoubleSide, clippingPlanes: [ulPlane] })));
  add(new THREE.Mesh(new THREE.ShapeGeometry(shapeOf([...P, ...[...UL].reverse()])), felt), false, false).position.z = 0.012;
  const linerPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), -3.4);
  const linerMat = new THREE.MeshStandardMaterial({ color: '#1c1c1e', roughness: 0.55, side: THREE.DoubleSide, clippingPlanes: [linerPlane] });
  add(new THREE.Mesh(wallGeometry(LN, -0.02, -D + 0.09), linerMat));
  add(new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(LN)), linerMat)).position.z = -D + 0.09;
  add(new THREE.Mesh(new THREE.ShapeGeometry(shapeOf([...UL, ...[...LN].reverse()])), linerMat), false, false).position.z = 0.014;
  for (const [x, w, z, d] of [[-3.15, 0.5, -D / 2, D], [3.15, 0.5, -D / 2, D], [0, 6.8, -D + 0.05, 0.3]]) add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), linerMat)).position.set(x, 0.012, z);
  const coping = instanced(ctx, new THREE.DodecahedronGeometry(0.22, 0), lib.std({ color: '#8f8a80', flatShading: true }), 40);
  coping.mesh.castShadow = true;
  const copeStones = [];
  for (let i = 0; i < 12; i++) copeStones.push({ x: -3.3 - R() * 0.15, z: -0.25 - i * 0.4 }, { x: 3.3 + R() * 0.15, z: -0.25 - i * 0.4 });
  for (let i = 0; i < 16; i++) copeStones.push({ x: -3.0 + i * 0.4, z: -D - 0.1 });

  // ---------------- rocks and roots that puncture the liner ----------------
  const spikeI = instanced(ctx, new THREE.ConeGeometry(0.09, 0.32, 6), lib.std({ color: '#7d7870', flatShading: true }), 6);
  const spikes = [[-0.9, -1.0], [0.3, -2.2], [0.9, -3.5], [-0.3, -0.05], [0.7, -0.05], [-1.1, -3.0]].map(([x, z]) => ({ x, z, y: bottomAt(LN, x) }));
  const root = add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(1.9, -0.2, 0.06), new THREE.Vector3(1.75, -0.6, 0.06), new THREE.Vector3(1.72, -0.95, 0.06)]), 20, 0.035, 6), lib.std({ color: '#6b4a2b' })), false, false);
  const leakI = instanced(ctx, new THREE.SphereGeometry(0.045, 8, 6), basic({ color: '#5fc6ff' }), 30);
  const leaks = Array.from({ length: 30 }, () => { const s = spikes[Math.floor(R() * 3) + 3] || spikes[3]; return { x: (R() < 0.5 ? -0.3 : 0.7) + (R() - 0.5) * 0.2, ph: R() }; });
  const stainI = instanced(ctx, new THREE.CircleGeometry(1, 18), basic({ color: '#3a1b08', transparent: true, opacity: 0.3, depthWrite: false }), 24);
  const stainPts = samplePolyline(P, 0.3).filter(q => q.y < -0.3);
  const stains = Array.from({ length: 24 }, () => { const q = stainPts[Math.floor(R() * stainPts.length)]; const o = 0.1 + R() * 0.5; return { x: q.x - q.nx * o, y: q.y - q.ny * o, r: 0.18 + R() * 0.3, f: R() * 0.5 }; });

  // ---------------- water ----------------
  const waterPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), -1.7);
  const waterMat = new THREE.MeshStandardMaterial({ color: '#2f9fd6', transparent: true, opacity: 0.62, roughness: 0.12, clippingPlanes: [waterPlane], depthWrite: false });
  const water = add(new THREE.Mesh(extrude(LN, D - 0.17), waterMat), false, false);
  water.position.z = -D + 0.12;
  const surfMat = new THREE.MeshStandardMaterial({ color: '#8fd4f5', transparent: true, opacity: 0.8, roughness: 0.05, depthWrite: false });
  const surf = add(new THREE.Mesh(new THREE.PlaneGeometry(1, D - 0.17), surfMat), false, false);
  surf.rotation.x = -Math.PI / 2; surf.position.z = (-D + 0.12 - 0.05) / 2;
  const lip = add(new THREE.Mesh(new THREE.PlaneGeometry(1, 0.05), basic({ color: '#e9fbff' })), false, false);
  lip.position.z = -0.04;
  const specI = instanced(ctx, new THREE.SphereGeometry(0.03, 6, 5), basic({ color: '#4c8f1a' }), 60);
  const specs = Array.from({ length: 60 }, (_, i) => { const x = -1.4 + R() * 2.8; return { x, y: bottomAt(LN, x) + 0.08 + R() * 1.0, z: i < 30 ? -0.12 - R() * 0.2 : -0.5 - R() * 4, ph: R() * 6.28 }; });
  const bugI = instanced(ctx, new THREE.SphereGeometry(0.025, 6, 5), basic({ color: '#111111' }), 26);
  const bugs = Array.from({ length: 26 }, () => ({ x: -2 + R() * 4, z: -0.5 - R() * 4, ph: R() * 6.28 }));
  const flowI = instanced(ctx, new THREE.SphereGeometry(0.025, 6, 5), basic({ color: '#ffffff', transparent: true, opacity: 0.8 }), 30);
  const flows = Array.from({ length: 30 }, () => ({ r: 0.4 + R() * 1.0, y: -1.5 + R() * 1.0, ph: R(), z: -0.4 - R() * 0.5 }));

  // ---------------- pump, pipe, filter, waterfall ----------------
  const pump = add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.42), lib.std({ color: '#2b2f35' })), true, false);
  const pipe = makePipe(ctx, [[1.0, -1.62, Z], [3.6, -1.62, Z], [3.6, 0.15, Z], [3.6, 0.15, -1.8], [3.6, 0.6, -1.8]], { r: 0.06, color: '#2b2f35', opacity: 1, dots: 22, dotColor: '#8fd4f5' });
  const stones = new THREE.Group();
  [[3.4, 0.15, -1.4, 0.5], [3.9, 0.15, -2.0, 0.55], [3.5, 0.45, -2.1, 0.45], [3.95, 0.6, -2.5, 0.45], [3.3, 0.7, -2.6, 0.4], [3.1, 0.25, -2.2, 0.4]].forEach(([x, y, z, r]) => {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), lib.std({ color: '#8a857c', flatShading: true }));
    m.scale.set(1.2, 0.6, 1); m.position.set(x, y, z); m.rotation.y = R() * 3; m.castShadow = m.receiveShadow = true; stones.add(m);
  });
  scene.add(stones);
  const sheetTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#7fd0f5'; g.fillRect(0, 0, 64, 256); for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(R() * 64, R() * 256, 2 + R() * 3, 10 + R() * 30); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
  const sheet = add(new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.3), new THREE.MeshBasicMaterial({ map: sheetTex, transparent: true, opacity: 0.85, side: THREE.DoubleSide })), false, false);
  sheet.position.set(3.0, 0.25, -2.0); sheet.rotation.set(0, -0.5, 0.12);
  const splashI = instanced(ctx, new THREE.SphereGeometry(0.04, 6, 5), basic({ color: '#e6f8ff' }), 24);
  const splashes = Array.from({ length: 24 }, () => ({ a: R() * Math.PI * 2, v: 0.3 + R() * 0.6, ph: R() }));
  const filterG = new THREE.Group();
  const fBox = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.75, 0.8), new THREE.MeshStandardMaterial({ color: '#34503a', transparent: true, opacity: 0.45, roughness: 0.5 }));
  const media = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.45, 0.65), lib.std({ color: '#3f7fd6', roughness: 0.9 }));
  media.position.y = -0.08; filterG.add(media, fBox);
  const germI = instanced(ctx, new THREE.CapsuleGeometry(0.025, 0.05, 4, 6), basic({ color: '#ffffff' }), 20);
  for (let i = 0; i < 20; i++) germI.mesh.setColorAt(i, new THREE.Color(i % 2 ? '#b863ff' : '#5fe07a'));
  filterG.position.set(3.75, 0.62, -1.8); scene.add(filterG);

  // ---------------- leaves and the skimmer ----------------
  const leafI = instanced(ctx, new THREE.CircleGeometry(0.08, 9), lib.std({ color: '#ffffff', side: THREE.DoubleSide }), 14);
  ['#b5651d', '#d4912a', '#8a6a2a', '#c0392b', '#a0522d', '#cf8b2e', '#7d5a1e'].forEach((c, k) => { leafI.mesh.setColorAt(k, new THREE.Color(c)); leafI.mesh.setColorAt(k + 7, new THREE.Color(c)); });
  const leafs = Array.from({ length: 14 }, (_, i) => ({ x: -1.6 + R() * 3.2, z: -0.6 - R() * 3.5, ph: R(), f: (i % 7) / 7 }));
  const pileMat = lib.std({ color: '#4a3618', roughness: 1, transparent: true, opacity: 0 });
  const pile = add(new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.5), pileMat), false, true);
  pile.rotation.x = -Math.PI / 2; pile.position.set(0, -1.69, -2.2);
  const skim = new THREE.Group();
  const skOuter = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), basic({ color: '#5d636b' })); skOuter.position.set(-3.55, -0.18, 0.03); skim.add(skOuter);
  const skInner = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.46), basic({ color: '#22272c' })); skInner.position.set(-3.55, -0.2, 0.031); skim.add(skInner);
  const netTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.strokeStyle = '#d9d9d9'; g.lineWidth = 2; for (let p = 0; p <= 64; p += 8) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 64); g.moveTo(0, p); g.lineTo(64, p); g.stroke(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2); return t; })();
  const net = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.32), new THREE.MeshBasicMaterial({ map: netTex, transparent: true })); net.position.set(-3.58, -0.25, 0.032); skim.add(net);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.18), basic({ color: '#8fd4f5' })); door.position.set(-3.18, -0.14, 0.033); skim.add(door);
  const lidB = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.8), lib.std({ color: '#4a5058' })); lidB.position.set(-3.55, 0.03, -0.4); lidB.castShadow = true; skim.add(lidB);
  scene.add(skim);

  // ---------------- fish, poop, plants, heron, caves ----------------
  const fishes = Array.from({ length: 5 }, (_, i) => {
    const g = new THREE.Group();
    const bodyMat = lib.std({ color: i % 2 ? '#ff7b1c' : '#f2f2ee', roughness: 0.4 });
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 10), bodyMat); b.scale.set(2.2, 0.8, 0.75); g.add(b);
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), lib.std({ color: i % 2 ? '#ffffff' : '#ff5a1a' })); spot.position.set(0.05, 0.05, 0); spot.scale.set(1.6, 0.6, 0.9); g.add(spot);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 8), bodyMat); tail.rotation.z = Math.PI / 2; tail.position.set(-0.27, 0, 0); tail.scale.set(1, 1, 0.3); g.add(tail);
    scene.add(g);
    return { g, bodyMat, base: i % 2 ? '#ff7b1c' : '#f2f2ee', cx: -0.4 + (i % 3) * 0.4, cz: -0.75 - (i % 2) * 0.5, r: 0.4 + R() * 0.3, y: -1.45 + R() * 0.7, w: 0.6 + R() * 0.4, ph: R() * 6.28, cave: [-0.75 + (i % 3) * 0.18, -1.62 + (i % 2) * 0.12, -1.4 - (i % 3) * 0.2] };
  });
  const poopI = instanced(ctx, new THREE.SphereGeometry(0.022, 6, 5), basic({ color: '#5a3a1a' }), 30);
  const padI = instanced(ctx, new THREE.CircleGeometry(0.32, 20, 0.3, Math.PI * 2 - 0.6), lib.std({ color: '#3f9a32', side: THREE.DoubleSide }), 9);
  const pads = Array.from({ length: 9 }, () => ({ x: -2.2 + R() * 4.2, z: -0.6 - R() * 3.8, s: 0.8 + R() * 0.6, f: R() * 0.6 }));
  const bloomI = instanced(ctx, new THREE.SphereGeometry(0.07, 10, 8), lib.std({ color: '#ff8fc0' }), 4);
  const reedI = instanced(ctx, new THREE.CylinderGeometry(0.02, 0.03, 1.1, 6), lib.std({ color: '#3a7d26' }), 18);
  const reeds = Array.from({ length: 18 }, (_, i) => ({ x: i < 9 ? -2.7 + R() * 0.6 : 2.3 + R() * 0.5, z: -0.4 - R() * 4, h: 0.7 + R() * 0.5, f: R() * 0.5 }));
  const heron = new THREE.Group();
  const hgray = lib.std({ color: '#8d9aa6', roughness: 0.7 });
  const hb = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), hgray); hb.scale.set(1.6, 0.9, 0.8); heron.add(hb);
  const neckPivot = new THREE.Group(); neckPivot.position.set(0.3, 0.12, 0); heron.add(neckPivot);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.55, 8).translate(0, 0.27, 0), hgray); neckPivot.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), hgray); head.position.set(0.02, 0.57, 0); neckPivot.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.28, 8), lib.std({ color: '#e3b21b' })); beak.rotation.z = -Math.PI / 2; beak.position.set(0.2, 0.56, 0); neckPivot.add(beak);
  for (const z of [-0.08, 0.08]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 6).translate(0, -0.4, 0), lib.std({ color: '#d1a23a' })); leg.position.set(0, -0.15, z); heron.add(leg); }
  heron.traverse(o => { o.castShadow = true; }); scene.add(heron);
  const caveRocks = [[-0.95, -1.62, -1.3, 0.28], [-0.4, -1.62, -1.25, 0.26], [-0.7, -1.3, -1.35, 0.36]].map(([x, y, z, r], i) => {
    const m = add(new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), lib.std({ color: '#76716a', flatShading: true })), true, true);
    if (i === 2) m.scale.set(1.8, 0.45, 1.1);
    m.userData = { x, y, z }; return m;
  });

  // ---------------- sun ----------------
  const sun = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), basic({ color: '#ffe066', fog: false, transparent: true }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: lib.tex.glow, color: '#ffcf40', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.scale.set(3.6, 3.6, 1); sun.add(core, halo); scene.add(sun);

  // ---------------- the duck ----------------
  const duck = makeDuck(ctx);

  // ---------------- camera ----------------
  ctx.shots([
    { at: 0, offset: 0, pos: [0, 5.0, 17], look: [0, -0.9, -2.3], push: 0.05 },
    { at: 'poke', pos: [0.2, 0.2, 9], look: [0.2, -1.6, -0.5] },
    { at: 'underlay', pos: [0, 3.4, 14], look: [0, -1.0, -1] },
    { at: 'still', pos: [0, 4.2, 15], look: [0, -0.6, -2.5] },
    { at: 'pump', pos: [0.8, 0.6, 10], look: [0.8, -1.4, -0.8] },
    { at: 'falls', pos: [2.2, 3.2, 15], look: [2.4, -0.2, -1.5] },
    { at: 'leaves', pos: [0, 4.2, 15], look: [0, -0.8, -2.5] },
    { at: 'skimmer', pos: [-2.6, 1.6, 10], look: [-2.8, -0.4, -1] },
    { at: 'fish', pos: [0.2, 2.6, 13], look: [0.2, -1.0, -2] },
    { at: 'filter', pos: [3.0, 2.0, 11], look: [3.2, 0.1, -1.2] },
    { at: 'sun', pos: [0, 3.0, 16], look: [0, 0.8, -3] },
    { at: 'plants', pos: [0, 4.6, 14], look: [0, -0.4, -2.6] },
    { at: 'heron', pos: [-1.6, 2.6, 12], look: [-1.8, 0.0, -2] },
    { at: 'caves', pos: [-0.4, 1.2, 11], look: [-0.5, -1.2, -1.5] },
    { at: 'end', pos: [0.8, 5.2, 19], look: [0.6, -0.4, -2.6], push: 0.08 },
  ]);

  const SUN = new THREE.Vector3(2.0, 5.6, -6);
  return t => {
    // ---- dig, then a soak-away fill
    const dig = lerp(0.02, -1.8, tl.p('hook', 0.02, 0.42));
    digPlane.constant = dig;
    earth.visible = earthTop.visible = dig > -1.78;
    const sp = xSpanAt(P, Math.min(dig, -0.0001));
    if (sp) { earthTop.scale.x = sp[1] - sp[0]; earthTop.position.x = (sp[0] + sp[1]) / 2; }
    earthTop.position.y = dig - 0.002;

    // ---- liner sweeps in; underlayment goes under it later
    linerPlane.constant = tl.on('liner') ? lerp(-3.4, 3.4, tl.p('liner', 0.02, 0.5)) : -3.4;
    ulPlane.constant = tl.on('underlay') ? lerp(-3.4, 3.4, tl.p('underlay', 0.25, 0.65)) : -3.4;
    coping.mesh.visible = tl.on('liner');
    copeStones.forEach((c, i) => {
      const k = easeOutBounce(clamp01(tl.lin('liner', 0.45 + 0.4 * (i / copeStones.length), 0.6 + 0.4 * (i / copeStones.length))));
      if (k <= 0) return coping.hide(i);
      coping.set(i, c.x, lerp(1.2, 0.06, k), c.z, 1, i, i * 0.7, 0, 0.45);
    });
    coping.done();

    // ---- the water: soaks away, holds, leaks through punctures, drains for the pad, refills
    let lv = -1.72;
    if (tl.on('hook')) lv = lerp(lerp(-1.72, -0.35, tl.p('hook', 0.45, 0.7)), -1.65, tl.p('hook', 0.75, 1));
    if (tl.on('liner')) lv = lerp(-1.65, -0.25, tl.p('liner', 0.5, 1));
    if (tl.on('poke')) lv = lerp(-0.25, -0.55, tl.p('poke', 0.35, 1));
    if (tl.on('underlay')) lv = tl.p('underlay', 0.7, 1) > 0 ? lerp(-1.72, -0.22, tl.p('underlay', 0.7, 1)) : lerp(-0.55, -1.72, tl.p('underlay', 0, 0.2));
    if (tl.on('still')) lv = -0.22;
    const hasWater = lv > -1.71;
    water.visible = surf.visible = lip.visible = hasWater;
    if (hasWater) {
      waterPlane.constant = lv;
      const ws = xSpanAt(LN, lv) || [-1, 1];
      surf.scale.x = lip.scale.x = ws[1] - ws[0]; surf.position.x = lip.position.x = (ws[0] + ws[1]) / 2;
      surf.position.y = lip.position.y = lv;
    }
    const filling = (tl.on('hook') && tl.p('hook', 0.45, 0.5) > 0 && tl.p('hook', 0.7, 0.72) === 0) || (tl.on('liner') && !tl.on('poke') && tl.p('liner', 0.5, 0.52) > 0) || (tl.on('underlay') && !tl.on('still') && tl.p('underlay', 0.7, 0.72) > 0);
    hose.visible = hoseStream.visible = filling;
    hose.position.set(-1.5, 1.8, -2.4); hose.rotation.z = 0.5;
    hoseStream.position.set(-1.45, 1.66, -2.4); hoseStream.scale.y = 1.66 - lv;
    const soak = tl.p('hook', 0.72, 1) * (1 - tl.p('underlay', 0.3, 0.8)) + 0.6 * tl.p('poke', 0.4, 1) * (1 - tl.p('underlay', 0.3, 0.8));
    stains.forEach((s, i) => {
      const k = clamp01((Math.min(1, soak) - s.f) / (1 - s.f));
      if (k < 0.01) return stainI.hide(i);
      stainI.set(i, s.x, s.y, 0.006, s.r * k, 0, 0, 0, s.r * k * 0.8);
    });
    stainI.done();
    yard.pitMat.color.copy(mixColor('#ffffff', '#9b7f68', tl.p('hook', 0.72, 1) * (1 - tl.p('liner', 0, 0.4))));

    // ---- spikes and a root poke through; the pad stops them
    const poke = tl.p('poke', 0.0, 0.35) * (1 - tl.p('underlay', 0.1, 0.3));
    spikes.forEach((s, i) => {
      if (poke < 0.01) return spikeI.hide(i);
      spikeI.set(i, s.x, s.y - 0.2 + 0.3 * poke, s.z, 1);
    });
    spikeI.done();
    root.visible = poke > 0.05; root.scale.setScalar(Math.max(0.001, poke));
    const leakK = tl.p('poke', 0.3, 0.45) * (1 - tl.p('underlay', 0, 0.2));
    leaks.forEach((l, i) => {
      if (leakK < 0.01) return leakI.hide(i);
      const q = (t * 0.8 + l.ph) % 1;
      leakI.set(i, l.x + (l.x > 0 ? 1 : -1) * 0.1 * q, -1.86 - q * 0.9, 0.05, leakK * (1 - q));
    });
    leakI.done();

    // ---- water colour: green and buggy when still; cleared by the pump and waterfall; murky with ammonia; cleared by the filter; algae again; cleared by plants
    const greenK = tl.p('still', 0.3, 0.85) * (1 - 0.6 * tl.p('falls', 0.3, 1)) * (1 - tl.p('filter', 0.4, 1));
    const ammonia = tl.p('fish', 0.55, 0.95) * (1 - tl.p('filter', 0.35, 0.9));
    const algae = Math.max(greenK, 0.7 * tl.p('sun', 0.2, 1) * (1 - tl.p('plants', 0.3, 1)));
    waterMat.color.copy(mixColor('#2f9fd6', '#6f9b2c', algae).lerp(new THREE.Color('#a8a54a'), ammonia * 0.8));
    surfMat.color.copy(mixColor('#8fd4f5', '#a8c45a', algae).lerp(new THREE.Color('#cbc77a'), ammonia * 0.8));
    specs.forEach((s, i) => {
      if (!hasWater || algae < 0.05 || s.y > lv - 0.04) return specI.hide(i);
      specI.set(i, s.x + 0.05 * Math.sin(t + s.ph), s.y + 0.04 * Math.sin(t * 1.3 + s.ph), s.z, algae);
    });
    specI.done();
    const bugK = tl.p('still', 0.5, 0.8) * (1 - tl.p('pump', 0.3, 1));
    bugs.forEach((b, i) => {
      if (bugK < 0.01) return bugI.hide(i);
      bugI.set(i, b.x + 0.25 * Math.sin(t * 5 + b.ph), lv + 0.25 + 0.15 * Math.sin(t * 7 + b.ph * 2), b.z + 0.2 * Math.cos(t * 4 + b.ph), bugK);
    });
    bugI.done();

    // ---- pump and circulation
    const pK = easeOutBounce(tl.lin('pump', 0.0, 0.35));
    pump.visible = tl.on('pump') && pK > 0;
    pump.position.set(0.85, lerp(0.4, -1.56, pK), -0.25);
    const circ = tl.p('pump', 0.35, 0.55);
    flows.forEach((f, i) => {
      if (circ < 0.01 || !hasWater) return flowI.hide(i);
      const a = (t * 0.6 + f.ph) * Math.PI * 2;
      flowI.set(i, 0.1 + f.r * Math.cos(a), Math.min(lv - 0.05, f.y + 0.2 * Math.sin(a)), f.z, circ * 0.8);
    });
    flowI.done();
    pipe.grow(tl.p('falls', 0.0, 0.4));
    pipe.flow(t, tl.p('falls', 0.35, 0.45), 1.4);
    const fallsOn = tl.p('falls', 0.4, 0.55);
    stones.visible = tl.p('falls', 0.0, 0.05) > 0;
    stones.scale.set(1, Math.max(0.001, easeOutBack(tl.lin('falls', 0.0, 0.3))), 1);
    sheet.visible = fallsOn > 0.01; sheet.material.opacity = 0.85 * fallsOn; sheetTex.offset.y = -t * 1.6;
    splashes.forEach((s, i) => {
      if (fallsOn < 0.05) return splashI.hide(i);
      const q = (t * 1.5 + s.ph) % 1;
      splashI.set(i, 2.75 + Math.cos(s.a) * q * 0.4 * s.v, lv + Math.sin(Math.abs(s.a)) * q * 0.5 * s.v - 0.6 * q * q, -1.9 + Math.sin(s.a) * 0.2, fallsOn * (1 - q));
    });
    splashI.done();

    // ---- leaves sink and rot; the skimmer catches the next ones
    const leafDrop = tl.lin('leaves', 0.0, 0.9);
    leafs.forEach((l, i) => {
      const first = i < 7;
      if (first) {
        if (!tl.on('leaves') || tl.p('skimmer', 0.2, 0.6) >= 1) return leafI.hide(i);
        const k = clamp01((leafDrop - l.f * 0.5) / 0.5);
        if (k <= 0) return leafI.hide(i);
        const fall = clamp01(k / 0.4), sink = clamp01((k - 0.4) / 0.6);
        const y = fall < 1 ? lerp(3.5, lv, fall) : lerp(lv, bottomAt(LN, l.x) + 0.02, sink);
        leafI.set(i, l.x + 0.3 * Math.sin(t * 2 + l.ph) * (1 - fall), y, l.z, 1 - 0.4 * tl.p('skimmer', 0.2, 0.6), -Math.PI / 2 + (1 - fall) * Math.sin(t * 4 + i), 0, i);
      } else {
        const k = tl.lin('skimmer', 0.1 + l.f * 0.4, 0.55 + l.f * 0.4);
        if (!tl.on('skimmer') || k <= 0) return leafI.hide(i);
        const into = clamp01((k - 0.75) / 0.25);
        if (into >= 1) leafI.set(i, -3.58 + (i % 3) * 0.08, -0.22 + (i % 2) * 0.05, 0.04, 0.8, 0, 0, i);
        else leafI.set(i, lerp(l.x, -3.15, clamp01(k / 0.75)), lv + 0.01, lerp(l.z, -0.1, clamp01(k / 0.75)), 1, -Math.PI / 2, 0, i);
      }
    });
    leafI.done();
    pileMat.opacity = 0.75 * tl.p('leaves', 0.6, 1) * (1 - tl.p('skimmer', 0.2, 0.7));
    const skK = tl.p('skimmer', 0.0, 0.15);
    skim.visible = skK > 0.01; skim.scale.setScalar(Math.max(0.001, easeOutBack(tl.lin('skimmer', 0.0, 0.2))));
    skim.position.set(-3.55 * (1 - skim.scale.x), -0.2 * (1 - skim.scale.y), 0);

    // ---- fish, their waste, the ammonia; bacteria in the filter fix it
    const fishOn = tl.p('fish', 0.0, 0.2);
    const sick = ammonia;
    const flee = tl.p('heron', 0.4, 0.7);
    const hide = tl.p('caves', 0.4, 0.85);
    fishes.forEach((f, i) => {
      f.g.visible = tl.on('fish') && fishOn > 0.01 && hasWater;
      const speed = f.w * (1 - 0.7 * sick) * (1 + 1.5 * flee * (1 - hide));
      const a = f.ph + t * speed;
      let x = f.cx + f.r * Math.cos(a), z = f.cz + 0.7 * f.r * Math.sin(a), y = Math.min(lv - 0.12, f.y + 0.05 * Math.sin(t * 2 + i));
      const [cx, cy, cz] = f.cave;
      x = lerp(x, cx, hide); y = lerp(y, cy, hide); z = lerp(z, cz, hide);
      f.g.position.set(x, y, z);
      f.g.rotation.set(0, -a - Math.PI / 2 + hide * 1.2, sick * 0.6 * Math.sin(t + i));
      f.g.scale.setScalar(Math.max(0.001, 1.4 * fishOn));
      f.bodyMat.color.copy(mixColor(f.base, '#8f8a7a', sick * 0.7));
    });
    const poopK = tl.p('fish', 0.4, 0.6) * (1 - tl.p('filter', 0.4, 0.9));
    for (let i = 0; i < 30; i++) {
      if (poopK < 0.01) { poopI.hide(i); continue; }
      const f = fishes[i % 5], q = (t * 0.3 + i / 30) % 1;
      poopI.set(i, f.g.position.x - 0.3 - q * 0.2, f.g.position.y - q * 0.4, f.g.position.z, poopK * (1 - q));
    }
    poopI.done();
    const fK = easeOutBack(tl.lin('filter', 0.0, 0.25));
    filterG.visible = tl.on('filter') && fK > 0; filterG.scale.setScalar(Math.max(0.001, fK));
    const germK = tl.p('filter', 0.2, 0.4);
    for (let i = 0; i < 20; i++) {
      if (germK < 0.01) { germI.hide(i); continue; }
      germI.set(i, 3.45 + (i % 5) * 0.14 + 0.02 * Math.sin(t * 6 + i), 0.79 + 0.02 * Math.sin(t * 5 + i), -1.55 - Math.floor(i / 5) * 0.15, germK, 0, 0, Math.sin(t * 4 + i));
    }
    germI.done();

    // ---- sun, then plants shade it out
    const sunV = tl.p('sun', 0, 0.3) * (1 - tl.p('heron', 0, 0.5));
    sun.visible = sunV > 0.01; sun.position.set(SUN.x, SUN.y + (1 - sunV) * 1.5, SUN.z);
    core.material.opacity = halo.material.opacity = sunV;
    pads.forEach((p, i) => {
      const k = easeOutBack(clamp01((tl.lin('plants', 0.05, 0.8) - p.f * 0.5) / 0.5));
      if (k <= 0 || !hasWater) return padI.hide(i);
      padI.set(i, p.x, lv + 0.012, p.z, p.s * k, -Math.PI / 2, 0, i);
    });
    padI.done();
    for (let i = 0; i < 4; i++) {
      const p = pads[i * 2], k = easeOutBack(clamp01((tl.lin('plants', 0.4, 1) - i * 0.1) / 0.5));
      if (k <= 0 || !hasWater) { bloomI.hide(i); continue; }
      bloomI.set(i, p.x + 0.05, lv + 0.07, p.z, k, 0, 0, 0, 0.7 * k);
    }
    bloomI.done();
    reeds.forEach((r, i) => {
      const k = clamp01((tl.lin('plants', 0.1, 0.9) - r.f * 0.5) / 0.5);
      if (k <= 0) return reedI.hide(i);
      reedI.set(i, r.x, bottomAt(LN, r.x) + r.h * k / 2, r.z, 1, 0, 0, 0.05 * Math.sin(t + i), r.h * k);
    });
    reedI.done();

    // ---- the heron lands and strikes; the caves go in and it gives up
    const land = tl.p('heron', 0.0, 0.35), leave = tl.p('caves', 0.6, 1);
    heron.visible = tl.on('heron') && !tl.on('end') && leave < 0.999;
    heron.position.set(-2.4 - leave * 1.5, lerp(3.5, 0.5, land) + 3.5 * leave * leave, -2.2);
    heron.rotation.set(0, 0.3, 0);
    const strike = Math.sin(Math.min(1, tl.lin('heron', 0.45, 0.75)) * Math.PI) * (1 - hide);
    neckPivot.rotation.z = -1.2 * strike;
    const rocks = tl.p('caves', 0.05, 0.45);
    caveRocks.forEach((m, i) => {
      const k = easeOutBounce(clamp01((tl.lin('caves', 0.05, 0.45) - i * 0.2) / 0.6));
      m.visible = k > 0;
      m.position.set(m.userData.x, m.userData.y + (1 - k) * 2.5, m.userData.z);
    });

    // ---- the duck: floats, gets pulled into the skimmer net, pops back out, ends on a lily pad
    const dk = duck.group;
    dk.scale.setScalar(0.6);
    if (!tl.on('still') || !hasWater) {
      dk.visible = true; dk.position.set(-3.75, 0.02, -2.4); dk.rotation.set(0, -0.4, 0);
      if (tl.on('liner') && !tl.on('still')) dk.visible = false;
    } else {
      dk.visible = true;
      const drift = tl.p('skimmer', 0.3, 0.75), escape = easeOutBack(tl.lin('fish', 0.0, 0.25));
      let x = 0.4 + 0.2 * Math.sin(t * 0.3), y = lv - 0.07 + 0.02 * Math.sin(t * 2.3), z = -1.6;
      x = lerp(x, -3.4, drift * (1 - escape)); z = lerp(z, -0.35, drift * (1 - escape));
      if (drift > 0.95 && escape < 0.01) { x = -3.45; y = -0.12; z = 0.12; dk.scale.setScalar(0.35); }
      if (tl.on('plants') && pads.length) { const p = pads[3]; x = lerp(x, p.x, tl.p('plants', 0.6, 0.9)); z = lerp(z, p.z, tl.p('plants', 0.6, 0.9)); y += 0.04 * tl.p('plants', 0.6, 0.9); }
      dk.position.set(x, y, z);
      dk.rotation.set(0, -0.5 + 0.1 * Math.sin(t * 0.4) + drift * 6 * (1 - escape), 0.06 * Math.sin(t * 1.7));
    }
  };
}

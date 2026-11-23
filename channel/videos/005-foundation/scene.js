// 005 - How a house foundation is built. Each block below is keyed to a beat in script.json.
import {
  THREE, smooth, lerp, clamp01, rng, easeOutBack, easeOutBounce, mixColor,
  makeDuck, makeLabel, instanced, extrude, shapeOf, xSpanAt,
} from '../../engine/engine.js';

export function build(ctx) {
  const { scene, tl, lib } = ctx;
  const R = rng(55);
  const D = 6;
  // two trenches joined by a shallow scrape across the middle
  const P = [[-3.7, 0], [-3.7, -1.8], [-2.2, -1.8], [-2.2, -0.3], [2.2, -0.3], [2.2, -1.8], [3.7, -1.8], [3.7, 0]];
  ctx.buildYard({ profile: P, depth: D, rockTop: -4.4 });
  const add = (m, cast = false, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; scene.add(m); return m; };
  const basic = o => new THREE.MeshBasicMaterial(o);
  const WX = 2.95, FROST = -1.2, WALL_TOP = 0.4, SILL_TOP = 0.57;
  const conc = lib.std({ map: lib.tex.concrete, roughness: 0.85 });
  const sides = [-1, 1];

  // ---------------- digging ----------------
  const digPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.02);
  const earth = add(new THREE.Mesh(extrude(P, D - 0.02), lib.soil({ side: THREE.DoubleSide, clippingPlanes: [digPlane] })));
  earth.position.z = -D + 0.01;
  const earthTop = add(new THREE.Mesh(new THREE.PlaneGeometry(1, D - 0.02), lib.soil({ color: '#9a6238' })));
  earthTop.rotation.x = -Math.PI / 2; earthTop.position.z = -D / 2;
  const lawnCover = add(new THREE.Mesh(new THREE.PlaneGeometry(7.4, D), lib.mat.grass), false, true);
  lawnCover.rotation.x = -Math.PI / 2; lawnCover.position.set(0, 0.024, -D / 2);

  // ---------------- footings: a shallow one that heaves, then deep ones with rebar ----------------
  const shallow = sides.map(s => add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, D), conc), true, true));
  shallow.forEach((m, i) => m.position.set(sides[i] * WX, -0.45, -D / 2 + 0.005));
  const deepGroups = sides.map(s => {
    const halves = [0, 1].map(h => {
      const pivot = new THREE.Group();
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, D / 2), conc);
      m.castShadow = m.receiveShadow = true;
      m.position.set(0, 0.15, h ? D / 4 : -D / 4);           // the front half hangs back from its front end; the back half forward from its back end
      pivot.add(m);
      pivot.position.set(s * WX, -1.8, h ? -D : 0.005);
      scene.add(pivot);
      return pivot;
    });
    return halves;
  });
  const bentCrack = add(new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.06), basic({ color: '#111111' })), false, false);
  bentCrack.rotation.x = -Math.PI / 2;
  const newFooting = sides.map(s => add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, D).translate(0, 0.15, 0), conc), true, true));
  newFooting.forEach((m, i) => m.position.set(sides[i] * WX, -1.8, -D / 2 + 0.006));
  const rebarMat = lib.std({ color: '#8a4a26', roughness: 0.5, metalness: 0.4 });
  const rods = [];
  sides.forEach(s => [-0.35, 0, 0.35].forEach(dx => { const r = add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, D - 0.2, 8), rebarMat), true, false); r.rotation.x = Math.PI / 2; r.userData = { x: s * WX + dx }; rods.push(r); }));
  const rebarDots = [];
  sides.forEach(s => [-0.35, 0, 0.35].forEach(dx => { const d = add(new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), basic({ color: '#b5602e' })), false, false); d.position.set(s * WX + dx, -1.66, 0.013); rebarDots.push(d); }));

  // ---------------- frost ----------------
  const frostMat = basic({ color: '#8fd0ff', transparent: true, opacity: 0, depthWrite: false });
  const frostBands = [[-30, -3.7, 0, FROST], [-2.2, 2.2, -0.3, FROST], [3.7, 30, 0, FROST]].map(([a, b, y0, y1]) => {
    const m = add(new THREE.Mesh(new THREE.PlaneGeometry(b - a, y0 - y1), frostMat), false, false); m.position.set((a + b) / 2, (y0 + y1) / 2, 0.004); return m;
  });
  const trenchFrost = sides.map(s => { const m = add(new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.6), frostMat), false, false); m.position.set(s * 2.95, -0.9, 0.003); return m; });
  const lensI = instanced(ctx, new THREE.PlaneGeometry(0.5, 0.025), basic({ color: '#ffffff' }), 24);
  const lenses = Array.from({ length: 24 }, () => ({ x: (R() < 0.5 ? -1 : 1) * (2.4 + R() * 1.3), y: -0.65 - R() * 0.5, s: 0.5 + R() * 0.7 }));
  const dashI = instanced(ctx, new THREE.PlaneGeometry(0.22, 0.04), basic({ color: '#ffffff' }), 40);
  const frostLabel = makeLabel(ctx, { height: 0.36, color: '#bfe8ff' });
  const snowI = instanced(ctx, new THREE.SphereGeometry(0.035, 6, 5), basic({ color: '#ffffff' }), 110);
  const snow = Array.from({ length: 110 }, () => ({ x: -1 + R() * 8, z: -7 + R() * 7.5, o: R() * 7, w: R() * 6 }));

  // ---------------- forms and walls ----------------
  const plyMat = lib.std({ color: '#c8a06a', roughness: 0.8 });
  const forms = [];
  sides.forEach(s => [-0.23, 0.23].forEach(dx => { const m = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.0, D), plyMat), true, true); m.userData = { x: s * WX + dx }; forms.push(m); }));
  const walls = sides.map(s => add(new THREE.Mesh(new THREE.BoxGeometry(0.4, WALL_TOP + 1.5, D).translate(0, (WALL_TOP + 1.5) / 2, 0), conc), true, true));
  walls.forEach((m, i) => m.position.set(sides[i] * WX, -1.5, -D / 2 + 0.007));
  const wallBar = sides.map(s => add(new THREE.Mesh(new THREE.PlaneGeometry(0.035, 1.75), basic({ color: '#b5602e' })), false, false));
  wallBar.forEach((m, i) => m.position.set(sides[i] * WX, -0.6, 0.014));

  // ---------------- the sill: a bare board that rots, then treated wood on a foam gasket ----------------
  const bareMat = lib.std({ color: '#c79a5b', roughness: 0.8 });
  const bare = sides.map(s => add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, D), bareMat), true, true));
  bare.forEach((m, i) => m.position.set(sides[i] * WX, WALL_TOP + 0.07, -D / 2 + 0.008));
  const rotI = instanced(ctx, new THREE.CircleGeometry(0.04, 10), basic({ color: '#3f5a2a' }), 20);
  const rots = Array.from({ length: 20 }, () => ({ x: WX + (R() - 0.5) * 0.34, y: WALL_TOP + 0.02 + R() * 0.1, f: R() * 0.6 }));
  const wickI = instanced(ctx, new THREE.SphereGeometry(0.035, 8, 6), basic({ color: '#8fd6ff' }), 18);
  const wicks = Array.from({ length: 18 }, () => ({ x: WX + (R() - 0.5) * 0.3, ph: R() }));
  const gasket = sides.map(s => add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, D), lib.std({ color: '#ff8fb0', roughness: 0.6 })), false, true));
  gasket.forEach((m, i) => m.position.set(sides[i] * WX, WALL_TOP + 0.015, -D / 2 + 0.009));
  const ptMat = lib.std({ color: '#a8a86c', roughness: 0.75 });
  const sill = sides.map(s => add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, D), ptMat), true, true));
  sill.forEach((m, i) => m.position.set(sides[i] * WX, WALL_TOP + 0.03 + 0.07, -D / 2 + 0.01));

  // ---------------- anchor bolt (seen in the cut) ----------------
  const bolt = new THREE.Group();
  const steel = basic({ color: '#c9ced4' });
  const shank = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.95), steel); shank.position.set(0, -0.3, 0); bolt.add(shank);
  const hook = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.035), steel); hook.position.set(0.05, -0.76, 0); bolt.add(hook);
  const hookUp = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.1), steel); hookUp.position.set(0.105, -0.71, 0); bolt.add(hookUp);
  const washer = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.025), steel); washer.position.set(0, 0.185, 0); bolt.add(washer);
  const nut = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.06), basic({ color: '#8f969d' })); nut.position.set(0, 0.23, 0); bolt.add(nut);
  bolt.position.set(WX, WALL_TOP, 0.02); scene.add(bolt);

  // ---------------- termites and the treated soil ----------------
  const tubeMat = basic({ color: '#6b4a2b' });
  const tube = add(new THREE.Mesh(new THREE.PlaneGeometry(0.07, 1).translate(0, 0.5, 0), tubeMat), false, false);
  tube.position.set(WX + 0.235, -0.9, 0.016);
  const termI = instanced(ctx, new THREE.CapsuleGeometry(0.022, 0.05, 4, 6), basic({ color: '#f1e3c4' }), 16);
  const terms = Array.from({ length: 16 }, () => ({ ph: R(), wob: R() * 6 }));
  const treatMat = basic({ color: '#5fe07a', transparent: true, opacity: 0, depthWrite: false });
  [[3.2, 4.6], [1.0, 2.7]].forEach(([a, b]) => add(new THREE.Mesh(new THREE.PlaneGeometry(b - a, 1.0), treatMat), false, false).position.set((a + b) / 2, a > 3 ? -0.5 : -0.8, 0.005));
  const gapArrow = new THREE.Group();
  const gLine = new THREE.Mesh(new THREE.PlaneGeometry(0.025, 0.42), basic({ color: '#ffd23f' })); gLine.position.y = 0.23; gapArrow.add(gLine);
  for (const [y, r] of [[0.03, Math.PI], [0.44, 0]]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 10), basic({ color: '#ffd23f' })); c.position.y = y; c.rotation.z = r; gapArrow.add(c); }
  gapArrow.position.set(WX + 0.45, 0, 0.05); scene.add(gapArrow);

  // ---------------- the house ----------------
  const house = new THREE.Group();
  const hp = (w, h, d, x, y, z, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; house.add(m); return m; };
  const sid = lib.tex.siding.clone(); sid.repeat.set(3, 1.5); sid.needsUpdate = true;
  const sidMat = lib.std({ map: sid });
  hp(6.5, 0.2, D, 0, 0.1, -D / 2, lib.std({ color: '#b98b5a' }));
  hp(6.5, 2.6, 0.15, 0, 1.5, -D + 0.075, lib.std({ color: '#e9dfcf' }));
  hp(0.15, 2.6, D, -3.18, 1.5, -D / 2, sidMat);
  hp(0.15, 2.6, D, 3.18, 1.5, -D / 2, sidMat);
  hp(1.6, 1.1, 0.06, 0.9, 1.6, -D + 0.18, lib.mat.trim);
  hp(1.4, 0.9, 0.07, 0.9, 1.6, -D + 0.2, lib.std({ color: '#30506f', roughness: 0.2 }));
  hp(2.2, 0.45, 0.9, -1.0, 0.43, -D + 0.7, lib.std({ color: '#4a6fa5' }));
  hp(2.2, 0.65, 0.25, -1.0, 0.75, -D + 0.3, lib.std({ color: '#4a6fa5' }));
  const roofTex = lib.tex.shingles.clone(); roofTex.repeat.set(3, 2); roofTex.needsUpdate = true;
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(shapeOf([[-3.75, 0], [3.75, 0], [0, 2.1]]), { depth: D + 0.4, bevelEnabled: false }), lib.std({ map: roofTex }));
  roof.position.set(0, 2.8, -D - 0.2); roof.castShadow = true; house.add(roof);
  const houseCrack = new THREE.Line(new THREE.BufferGeometry().setFromPoints([[3.25, 2.4], [3.15, 2.0], [3.22, 1.6], [3.12, 1.1]].map(([x, y]) => new THREE.Vector3(x, y, 0.02))), new THREE.LineBasicMaterial({ color: '#222222' }));
  house.add(houseCrack);
  scene.add(house);

  // ---------------- the duck ----------------
  const duck = makeDuck(ctx);

  // ---------------- camera ----------------
  ctx.shots([
    { at: 0, offset: 0, pos: [0.4, 4.2, 17], look: [0, 1.0, -3], push: 0.05 },
    { at: 'footing', offset: 0.6, pos: [2.7, 1.4, 9.5], look: [2.95, -0.5, -1], blend: 1.0 },
    { at: 'frost', pos: [2.8, 0.8, 10], look: [3.0, -0.8, -1] },
    { at: 'frostline', pos: [2.8, 0.4, 10.5], look: [3.0, -1.0, -1] },
    { at: 'bend', pos: [2.95, 3.6, 5.5], look: [2.95, -1.6, -3.2] },
    { at: 'rebar', offset: 2.2, pos: [2.8, 0.0, 8.5], look: [2.95, -1.3, -0.5], blend: 1.0 },
    { at: 'forms', pos: [2.8, 0.8, 9.5], look: [2.95, -0.6, -1] },
    { at: 'wick', pos: [2.8, 0.9, 6.0], look: [2.95, 0.0, -0.5] },
    { at: 'frame', pos: [0.4, 4.2, 17], look: [0, 1.2, -3] },
    { at: 'bolts', offset: 0.4, pos: [2.8, 0.9, 6.0], look: [2.95, 0.15, -0.5] },
    { at: 'bolts', offset: 3.4, pos: [0.4, 4.0, 16], look: [0, 1.1, -3], blend: 1.0 },
    { at: 'termites', pos: [3.2, 0.5, 7], look: [3.2, -0.4, -0.5] },
    { at: 'end', pos: [0.6, 4.5, 18], look: [0.2, 1.0, -3], push: 0.08 },
  ]);

  return t => {
    ctx.shake = 0;
    // ---- dig: shallow, then below the frost line, then backfill around the new walls
    let dig = 0.02;
    if (tl.on('footing')) dig = lerp(0.02, -0.6, tl.p('footing', 0.25, 0.6));
    if (tl.on('frostline')) dig = lerp(-0.6, -1.8, tl.p('frostline', 0.15, 0.55));
    if (tl.on('forms')) dig = lerp(-1.8, 0.02, tl.p('forms', 0.85, 1));
    if (tl.on('wick')) dig = 0.02;
    digPlane.constant = dig;
    earth.visible = dig > -1.78;
    const sp = xSpanAt(P, Math.min(dig, -0.0001)) || [-3.7, 3.7];
    earthTop.visible = dig > -1.78; earthTop.scale.x = sp[1] - sp[0]; earthTop.position.set((sp[0] + sp[1]) / 2, dig - 0.002, -D / 2);
    lawnCover.visible = !tl.on('footing') || tl.p('footing', 0.25, 0.3) === 0;
    if (tl.on('wick')) { lawnCover.visible = true; lawnCover.position.y = 0.024; }

    // ---- shallow footing, and frost heaving it
    const sK = tl.p('footing', 0.55, 0.85) * (1 - tl.p('frostline', 0.05, 0.25));
    const heave = tl.p('frost', 0.35, 0.85);
    shallow.forEach((m, i) => {
      m.visible = sK > 0.01;
      m.scale.y = Math.max(0.001, sK);
      m.position.y = -0.6 + 0.15 * sK + 0.2 * heave * (i ? 1 : 0.7);
      m.rotation.z = (i ? 0.06 : -0.04) * heave;
    });
    const frostK = tl.p('frost', 0.05, 0.4) * (1 - tl.p('bend', 0, 0.4));
    frostMat.opacity = 0.55 * frostK;
    trenchFrost.forEach(m => { m.visible = tl.on('frost') && !tl.on('frostline'); });
    lenses.forEach((l, i) => {
      const k = tl.p('frost', 0.3, 0.8) * (1 - tl.p('frostline', 0.0, 0.3));
      if (k < 0.01) return lensI.hide(i);
      lensI.set(i, l.x, l.y, 0.006, l.s * k, 0, 0, (i % 3 - 1) * 0.2);
    });
    lensI.done();
    const lineK = tl.p('frostline', 0.0, 0.25) * (1 - tl.p('bend', 0.0, 0.15));
    for (let i = 0; i < 40; i++) { if (lineK < 0.01) { dashI.hide(i); continue; } dashI.set(i, -1 + i * 0.36, FROST, 0.008, lineK); }
    dashI.done();
    frostLabel.set(lineK > 0.2 ? 'FROST LINE' : '');
    frostLabel.sprite.position.set(1.95, FROST + 0.25, 0.2);
    const snowK = tl.p('frost', 0, 0.2) * (1 - tl.p('bend', 0, 0.3));
    snow.forEach((s, i) => {
      if (snowK < 0.02) return snowI.hide(i);
      const y = 6 - ((t * 1.1 + s.o) % 6.5);
      snowI.set(i, s.x + 0.3 * Math.sin(t + s.w), y, s.z, snowK);
    });
    snowI.done();
    ctx.setNight(0.22 * snowK);

    // ---- deep footing, bending and cracking without steel
    const deepK = tl.p('frostline', 0.55, 0.85) * (1 - tl.p('rebar', 0.0, 0.25));
    const sag = tl.p('bend', 0.4, 0.9);
    deepGroups.forEach((halves, si) => halves.forEach((pv, h) => {
      pv.visible = deepK > 0.01;
      pv.scale.y = Math.max(0.001, deepK);
      const a = si === 1 ? 0.04 * sag : 0;
      pv.rotation.x = h ? a : -a;
    }));
    bentCrack.visible = sag > 0.3 && deepK > 0.01;
    bentCrack.position.set(WX, -1.8 + 0.3 - 0.12 * sag + 0.004, -D / 2);
    bentCrack.scale.set(1, 0.4 + 1.6 * sag, 1);

    // ---- rebar, then the new footing poured around it
    rods.forEach((r, i) => {
      const k = tl.p('rebar', 0.1 + (i % 3) * 0.05, 0.3 + (i % 3) * 0.05);
      r.visible = k > 0.001;
      r.position.set(r.userData.x, -1.66 + (1 - k) * 1.6, -D / 2);
    });
    const pour = tl.p('rebar', 0.35, 0.6);
    newFooting.forEach(m => { m.visible = pour > 0.001; m.scale.y = Math.max(0.001, pour); });
    rebarDots.forEach(d => { d.visible = pour > 0.95; });

    // ---- forms, the walls, then the forms come off
    const fK = tl.p('forms', 0.0, 0.2), fOff = tl.p('forms', 0.8, 0.95);
    forms.forEach(m => { m.visible = fK > 0.001 && fOff < 0.999; m.position.set(m.userData.x, -0.5 + (1 - fK) * 3 + fOff * 3, -D / 2 + 0.02); });
    const wallK = tl.p('forms', 0.2, 0.75);
    walls.forEach(m => { m.visible = wallK > 0.001; m.scale.y = Math.max(0.001, wallK); });
    wallBar.forEach(m => { m.visible = wallK > 0.98; });

    // ---- a bare board soaks up water and rots
    const bareK = easeOutBounce(tl.lin('wick', 0.0, 0.2)), bareOff = tl.p('sill', 0.0, 0.2);
    bare.forEach(m => { m.visible = bareK > 0 && bareOff < 0.999; m.position.y = WALL_TOP + 0.07 + (1 - bareK) * 1.5 + bareOff * 2; });
    const rotK = tl.p('wick', 0.45, 0.95);
    bareMat.color.copy(mixColor('#c79a5b', '#5d4b33', rotK));
    rots.forEach((r, i) => {
      const k = clamp01((rotK - r.f) / 0.4) * (1 - bareOff);
      if (k < 0.01) return rotI.hide(i);
      rotI.set(i, r.x, r.y, 0.022, k);
    });
    rotI.done();
    const wickK = tl.p('wick', 0.2, 0.35) * (1 - tl.p('sill', 0, 0.2));
    wicks.forEach((w, i) => {
      if (wickK < 0.01) return wickI.hide(i);
      const q = (t * 0.5 + w.ph) % 1;
      wickI.set(i, w.x, lerp(-1.4, WALL_TOP + 0.08, q), 0.02, wickK);
    });
    wickI.done();

    // ---- foam gasket, then the treated sill plate
    const gK = tl.p('sill', 0.25, 0.4);
    gasket.forEach(m => { m.visible = gK > 0.001; m.scale.y = Math.max(0.001, gK); });
    const pK = easeOutBounce(tl.lin('sill', 0.45, 0.7));
    sill.forEach(m => { m.visible = pK > 0; m.position.y = WALL_TOP + 0.1 + (1 - pK) * 1.5; });

    // ---- the house: sinks in the hook, gets lifted away, comes back, slides off in the quake, gets bolted down
    let hy = 0, hx = 0, hrz = 0, hVis = true;
    if (!tl.on('footing') || tl.p('footing', 0, 0.25) < 1) {
      const sink = tl.p('hook', 0.2, 0.9);
      hy = -0.56 + -0.3 * sink; hrz = -0.05 * sink;
      hy += 10 * tl.p('footing', 0.0, 0.25) ** 2;
    } else if (!tl.on('frame')) hVis = false;
    else {
      hy = 9 * (1 - easeOutBounce(tl.lin('frame', 0.0, 0.7)));
      const slide = tl.p('quake', 0.35, 0.9) * (1 - tl.p('bolts', 0.0, 0.25));
      hx = 1.1 * slide; hy -= 0.5 * slide * slide; hrz = -0.12 * slide;
      const shaking = tl.on('quake') && !tl.on('bolts') ? tl.p('quake', 0.1, 0.25) : 0;
      const shaking2 = tl.p('bolts', 0.72, 0.8) * (1 - tl.p('termites', 0, 0.1));
      ctx.shake = 0.12 * Math.max(shaking, shaking2);
      hx += 0.04 * Math.sin(t * 45) * Math.max(shaking * (1 - slide), shaking2 * 0.3);
    }
    house.visible = hVis;
    house.position.set(hx, SILL_TOP + hy, 0);
    house.rotation.z = hrz;
    houseCrack.visible = !tl.on('footing') && tl.p('hook', 0.6, 0.65) > 0;
    const boltK = tl.p('bolts', 0.3, 0.6);
    bolt.visible = boltK > 0.001;
    bolt.scale.y = Math.max(0.001, boltK);

    // ---- termites climb a mud tube; treated soil stops them
    const tubeK = tl.p('termites', 0.1, 0.7) * (1 - tl.p('shield', 0.3, 0.9));
    tube.visible = tubeK > 0.01; tube.scale.y = Math.max(0.001, (WALL_TOP + 1.0) * tubeK);
    const tK = tl.p('termites', 0.05, 0.2) * (1 - tl.p('shield', 0.2, 0.6));
    terms.forEach((m, i) => {
      if (tK < 0.01) return termI.hide(i);
      const q = (t * 0.25 + m.ph) % 1, top = -0.9 + (WALL_TOP + 1.0) * tubeK;
      termI.set(i, WX + 0.235 + 0.01 * Math.sin(t * 9 + m.wob), lerp(-1.1, top, q), 0.03, tK);
    });
    termI.done();
    treatMat.opacity = 0.35 * tl.p('shield', 0.0, 0.3) * (1 - tl.p('end', 0.4, 1));
    const gapK = tl.p('shield', 0.5, 0.7) * (1 - tl.p('end', 0.3, 0.6));
    gapArrow.visible = gapK > 0.01; gapArrow.scale.set(1, Math.max(0.001, gapK), 1);

    // ---- the duck: slides off the sinking roof, shivers in the frost, gets bounced by the quake
    const dk = duck.group;
    dk.scale.setScalar(0.85);
    duck.tint('#ffffff', 0);
    const slideOff = tl.p('hook', 0.55, 0.95);
    if (!tl.on('footing') && slideOff < 1) {
      const roofY = SILL_TOP + hy + 2.8 + 2.1;
      if (slideOff <= 0) { dk.position.set(0, roofY, -2.6); dk.rotation.set(0, -0.5, 0); }
      else { dk.position.set(lerp(0, 4.3, slideOff), lerp(roofY, 0.02, slideOff * slideOff), lerp(-2.6, -1.2, slideOff)); dk.rotation.set(0, -0.5, -slideOff * 4); }
    } else {
      dk.position.set(4.3, 0.02, -1.2); dk.rotation.set(0, -0.9, 0);
      const cold = tl.p('frost', 0.1, 0.4) * (1 - tl.p('bend', 0, 0.4));
      if (cold > 0) { duck.body.color.lerp(new THREE.Color('#c4e8ff'), 0.6 * cold); dk.position.x += 0.02 * Math.sin(t * 70) * cold; }
      const bounce = tl.on('quake') && !tl.on('bolts') ? tl.p('quake', 0.1, 0.25) : 0;
      if (bounce > 0) { dk.position.y += 0.25 * Math.abs(Math.sin(t * 14)) * bounce; dk.rotation.z = 0.5 * Math.sin(t * 11) * bounce; }
    }
  };
}

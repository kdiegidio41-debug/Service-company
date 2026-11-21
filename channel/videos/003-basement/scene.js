// 003 - How a basement stays dry. Each block below is keyed to a beat in script.json.
import {
  THREE, smooth, lerp, clamp01, rng, easeOutBack, mixColor,
  makePipe, makeDuck, instanced, extrude, shapeOf,
} from '../../engine/engine.js';

export function build(ctx) {
  const { scene, tl, lib } = ctx;
  const R = rng(33);
  const D = 6;
  const P = [[-3.2, 0], [-3.2, -3.0], [3.2, -3.0], [3.2, 0]];          // the basement hole
  ctx.buildYard({ profile: P, depth: D, rockTop: -5.6 });
  const add = (m, cast = false, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; scene.add(m); return m; };
  const basic = o => new THREE.MeshBasicMaterial(o);
  const Z = 0.07, FLOOR = -2.55;

  // ---------------- dig, and the hole flooding ----------------
  const digPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.02);
  const earth = add(new THREE.Mesh(extrude(P, D - 0.02), lib.soil({ side: THREE.DoubleSide, clippingPlanes: [digPlane] })));
  earth.position.z = -D + 0.01;
  const earthTop = add(new THREE.Mesh(new THREE.PlaneGeometry(6.4, D - 0.02), lib.soil({ color: '#9a6238' })));
  earthTop.rotation.x = -Math.PI / 2; earthTop.position.z = -D / 2;
  const floodMat = new THREE.MeshStandardMaterial({ color: '#4a9ad0', transparent: true, opacity: 0.8, roughness: 0.15, depthWrite: false });
  const flood = add(new THREE.Mesh(new THREE.BoxGeometry(6.38, 1, D - 0.1), floodMat), false, false);
  flood.position.z = -D / 2;
  const floodTop = add(new THREE.Mesh(new THREE.PlaneGeometry(6.38, 0.05), basic({ color: '#dff4ff' })), false, false);
  floodTop.position.z = 0.005;

  // groundwater in the soil, and the water it pushes toward the hole
  const gwMat = basic({ color: '#3e95e0', transparent: true, opacity: 0, depthWrite: false });
  for (const [a, b] of [[-30, -3.2], [3.2, 30]]) add(new THREE.Mesh(new THREE.PlaneGeometry(b - a, 2.6), gwMat), false, false).position.set((a + b) / 2, -2.9, 0.003);
  const seepI = instanced(ctx, new THREE.SphereGeometry(0.05, 8, 6), basic({ color: '#8fd6ff' }), 46);
  const seeps = Array.from({ length: 46 }, (_, i) => ({ side: i % 2 ? 1 : -1, y: -1.8 - R() * 2.1, ph: R(), len: 2.5 + R() * 3 }));

  // ---------------- concrete walls, footings, floor ----------------
  const conc = lib.std({ map: lib.tex.concrete, roughness: 0.85 });
  const shell = new THREE.Group();
  const sp = (w, h, d, x, y, z, mat = conc) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; shell.add(m); return m; };
  const wallL = sp(0.25, 3.05, D, -3.075, -1.225, -D / 2);
  const wallR = sp(0.25, 3.05, D, 3.075, -1.225, -D / 2);
  sp(6.4, 3.05, 0.25, 0, -1.225, -D + 0.125);
  sp(0.75, 0.25, D + 0.02, -3.075, -2.875, -D / 2 + 0.01);
  sp(0.75, 0.25, D + 0.02, 3.075, -2.875, -D / 2 + 0.01);
  sp(5.9, 0.2, D - 0.25, 0, -2.65, -D / 2 + 0.125, lib.std({ map: lib.tex.concrete, color: '#d8d8d4', roughness: 0.8 }));
  const gravelTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); g.fillStyle = '#8d8a84'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 520; i++) { g.fillStyle = `hsl(30, ${5 + R() * 10}%, ${40 + R() * 35}%)`; g.beginPath(); g.ellipse(R() * 256, R() * 256, 4 + R() * 7, 3 + R() * 5, R() * 3, 0, 7); g.fill(); }
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(3, 0.4); return tx;
  })();
  sp(5.4, 0.25, D - 0.25, 0, -2.875, -D / 2 + 0.13, lib.std({ map: gravelTex }));
  scene.add(shell);
  const shellParts = [...shell.children];
  const bulb = add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshStandardMaterial({ color: '#fff6dc', emissive: '#ffd98a', emissiveIntensity: 0 })), false, false);
  bulb.position.set(-0.6, 0.05, -2.4);
  const bLight = new THREE.PointLight('#ffe7b5', 0, 9, 1.2); bLight.position.set(-0.6, -0.3, -1.6); scene.add(bLight);

  // ---------------- the house on top ----------------
  const house = new THREE.Group();
  const hp = (w, h, d, x, y, z, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; house.add(m); return m; };
  const sid = lib.tex.siding.clone(); sid.repeat.set(3, 1.5); sid.needsUpdate = true;
  const sidMat = lib.std({ map: sid });
  hp(6.4, 0.15, D, 0, 0.375, -D / 2, lib.std({ color: '#b98b5a' }));            // ground floor (the basement ceiling)
  hp(6.4, 2.8, 0.2, 0, 1.85, -D + 0.1, lib.std({ color: '#e9dfcf' }));
  hp(0.2, 2.8, D, -3.1, 1.85, -D / 2, sidMat);
  hp(0.2, 2.8, D, 3.1, 1.85, -D / 2, sidMat);
  hp(1.6, 1.1, 0.06, 0.8, 1.9, -D + 0.22, lib.mat.trim);
  hp(1.4, 0.9, 0.07, 0.8, 1.9, -D + 0.24, lib.std({ color: '#30506f', roughness: 0.2 }));   // its own glass, so it stays dark in the power cut
  hp(2.2, 0.5, 0.9, -0.9, 0.7, -D + 0.75, lib.std({ color: '#4a6fa5' }));     // sofa
  hp(2.2, 0.7, 0.25, -0.9, 1.05, -D + 0.35, lib.std({ color: '#4a6fa5' }));
  hp(0.06, 1.4, 0.06, 1.9, 1.15, -D + 0.8, lib.std({ color: '#333333' }));
  const shadeMat = new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffd98a', emissiveIntensity: 0.9 });
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.3, 16, 1, true), shadeMat);
  shade.position.set(1.9, 1.9, -D + 0.8); house.add(shade);
  const roofTex = lib.tex.shingles.clone(); roofTex.repeat.set(3, 2); roofTex.needsUpdate = true;
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(shapeOf([[-3.75, 0], [3.75, 0], [0, 2.2]]), { depth: D + 0.4, bevelEnabled: false }), lib.std({ map: roofTex }));
  roof.position.set(0, 3.25, -D - 0.2); roof.castShadow = true; house.add(roof);
  const gutter = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, D + 0.4), lib.std({ color: '#e8e8e8' }));
  gutter.position.set(3.75, 3.2, -D / 2); house.add(gutter);
  const roomLight = new THREE.PointLight('#ffe2a8', 0, 7, 1.3); roomLight.position.set(1.9, 2.0, -D + 1.3); house.add(roomLight);
  scene.add(house);
  const spout = makePipe(ctx, [[3.75, 3.15, -0.35], [3.75, 0.25, -0.35], [3.95, 0.08, -0.35]], { r: 0.075, color: '#e8e8e8', opacity: 1, dots: 14, dotColor: '#9fdcff' });
  const extension = makePipe(ctx, [[3.95, 0.08, -0.35], [7.2, 0.06, -0.35]], { r: 0.08, color: '#cfd3d7', opacity: 1, dots: 10, dotColor: '#9fdcff' });

  // ---------------- damp, membrane, pressure, crack ----------------
  const dampI = instanced(ctx, new THREE.CircleGeometry(1, 18), basic({ color: '#4d4a44', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }), 34);
  const damp = Array.from({ length: 34 }, (_, i) => {
    const side = i % 2 ? 1 : -1, onFace = i < 10;
    return { side, onFace, y: -2.4 + R() * 2.0, z: onFace ? 0.012 : -0.6 - R() * 4.8, x: onFace ? side * (3.0 + R() * 0.15) : side * 2.94, r: 0.12 + R() * 0.22, f: R() * 0.5 };
  });
  const moistI = instanced(ctx, new THREE.SphereGeometry(0.035, 6, 5), basic({ color: '#bfe6ff' }), 24);
  const moist = Array.from({ length: 24 }, (_, i) => ({ side: i % 2 ? 1 : -1, y: -2.4 + R() * 2.1, ph: R() }));
  const membrane = [-1, 1].map(s => add(new THREE.Mesh(new THREE.PlaneGeometry(0.08, 2.95).translate(0, -1.475, 0), basic({ color: '#151515' })), false, false));
  membrane.forEach((m, i) => m.position.set((i ? 1 : -1) * 3.24, 0.2, 0.014));
  const pushMat = basic({ color: '#3e95e0', transparent: true, opacity: 0.7, depthWrite: false });
  const push = [-1, 1].map(s => { const m = add(new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1).translate(0, 0.5, 0), pushMat), false, false); m.position.set(s * 3.98, -3.0, 0.008); return m; });
  const arrowI = instanced(ctx, new THREE.ConeGeometry(0.09, 0.28, 10), basic({ color: '#ffffff' }), 8);
  const crackG = new THREE.BufferGeometry().setFromPoints([[3.2, -1.62], [3.13, -1.7], [3.08, -1.66], [3.02, -1.78], [2.95, -1.74]].map(([x, y]) => new THREE.Vector3(x, y, 0.016)));
  const crackLine = new THREE.Line(crackG, new THREE.LineBasicMaterial({ color: '#111111' }));
  scene.add(crackLine);
  const jetI = instanced(ctx, new THREE.SphereGeometry(0.05, 8, 6), basic({ color: '#9fdcff' }), 26);
  const jet = Array.from({ length: 26 }, () => ({ ph: R(), dy: (R() - 0.5) * 0.25, dz: -R() * 0.6 }));

  // ---------------- footing drains, the sump pit and pumps ----------------
  const drains = [-1, 1].map(s => {
    const g = new THREE.Group();
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.55), lib.std({ map: gravelTex.clone() }));
    bed.material.map.repeat.set(0.6, 0.5); bed.material.map.needsUpdate = true;
    bed.position.set(0, 0.0, 0.02); g.add(bed);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.14, 24), basic({ color: '#f2f2f2' })); ring.position.z = 0.04; g.add(ring);
    const inner = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), basic({ color: '#2a2a2a' })); inner.position.z = 0.035; g.add(inner);
    const fill = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), basic({ color: '#4fb0f0' })); fill.position.z = 0.038; g.add(fill);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; const h = new THREE.Mesh(new THREE.CircleGeometry(0.018, 8), basic({ color: '#222222' })); h.position.set(0.12 * Math.cos(a), 0.12 * Math.sin(a), 0.045); g.add(h); }
    g.position.set(s * 3.6, -2.75, 0); scene.add(g);
    return { g, bed, fill };
  });
  const gatherI = instanced(ctx, new THREE.SphereGeometry(0.045, 8, 6), basic({ color: '#8fd6ff' }), 20);
  const gather = Array.from({ length: 20 }, (_, i) => ({ side: i % 2 ? 1 : -1, y: -0.8 - R() * 1.6, ph: R() }));
  const PITX0 = 1.3, PITX1 = 2.1, PIT_BOT = -3.6;
  const pitBack = add(new THREE.Mesh(new THREE.PlaneGeometry(PITX1 - PITX0, FLOOR - PIT_BOT), basic({ color: '#3a3f45' })), false, false);
  pitBack.position.set((PITX0 + PITX1) / 2, (FLOOR + PIT_BOT) / 2, 0.022);
  const pitWalls = [PITX0, PITX1].map(x => { const m = add(new THREE.Mesh(new THREE.PlaneGeometry(0.06, FLOOR - PIT_BOT + 0.02), basic({ color: '#9aa0a6' })), false, false); m.position.set(x, (FLOOR + PIT_BOT) / 2, 0.026); return m; });
  const pitFloor = add(new THREE.Mesh(new THREE.PlaneGeometry(PITX1 - PITX0 + 0.06, 0.06), basic({ color: '#9aa0a6' })), false, false);
  pitFloor.position.set((PITX0 + PITX1) / 2, PIT_BOT, 0.026);
  const pitOpen = add(new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), basic({ color: '#26292d' })), false, false);
  pitOpen.rotation.x = -Math.PI / 2; pitOpen.position.set(1.7, FLOOR + 0.003, -0.4);
  const pitWaterMat = basic({ color: '#4fb0f0', transparent: true, opacity: 0.85 });
  const pitWater = add(new THREE.Mesh(new THREE.PlaneGeometry(PITX1 - PITX0 - 0.04, 1).translate(0, 0.5, 0), pitWaterMat), false, false);
  pitWater.position.set((PITX0 + PITX1) / 2, PIT_BOT, 0.03);
  const pump1 = add(new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.34), basic({ color: '#2b6cb3' })), false, false);
  pump1.position.set(1.5, PIT_BOT + 0.2, 0.034);
  const pump1Led = add(new THREE.Mesh(new THREE.CircleGeometry(0.035, 12), basic({ color: '#333333' })), false, false);
  pump1Led.position.set(1.5, PIT_BOT + 0.3, 0.036);
  const pump2 = add(new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.26), basic({ color: '#d1452c' })), false, false);
  pump2.position.set(1.76, PIT_BOT + 0.16, 0.034);
  const rod = add(new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.9), basic({ color: '#cfcfcf' })), false, false);
  rod.position.set(1.95, PIT_BOT + 0.45, 0.033);
  const floatBall = add(new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), basic({ color: '#ffb020' })), false, false);
  const battery = new THREE.Group();
  const bat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.34), lib.std({ color: '#2a2d33' }));
  const batTop = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.34), lib.std({ color: '#ff9a1f' }));
  batTop.position.y = 0.24;
  const batLed = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: '#2bd94a' }));
  batLed.position.set(0.12, 0.12, 0.18);
  battery.add(bat, batTop, batLed); battery.position.set(2.55, FLOOR + 0.21, -0.55);
  battery.traverse(o => { o.castShadow = true; }); scene.add(battery);
  const toPitL = makePipe(ctx, [[-3.6, -2.88, Z], [PITX0, -2.88, Z]], { r: 0.055, color: '#e9ecef', opacity: 1, dots: 16, dotColor: '#4fb0f0' });
  const toPitR = makePipe(ctx, [[3.6, -2.88, Z], [PITX1, -2.88, Z]], { r: 0.055, color: '#e9ecef', opacity: 1, dots: 6, dotColor: '#4fb0f0' });
  const discharge = makePipe(ctx, [[1.5, PIT_BOT + 0.35, Z], [1.5, -0.25, Z], [3.6, -0.25, Z], [3.6, 0.12, Z], [3.6, 0.12, -1.5], [6.6, 0.12, -1.5]], { r: 0.06, color: '#e9ecef', opacity: 1, dots: 26, dotColor: '#4fb0f0' });
  const outI = instanced(ctx, new THREE.SphereGeometry(0.05, 8, 6), basic({ color: '#9fdcff' }), 14);

  // ---------------- the storm ----------------
  const rainI = instanced(ctx, new THREE.BoxGeometry(0.014, 0.36, 0.014), basic({ color: '#d9efff', transparent: true, opacity: 0.7 }), 150);
  const rain = Array.from({ length: 150 }, () => ({ x: -6 + R() * 15, z: -7 + R() * 7.5, o: R() * 9 }));
  const splashI = instanced(ctx, new THREE.SphereGeometry(0.045, 6, 5), basic({ color: '#bfe6ff' }), 16);
  const splash = Array.from({ length: 16 }, () => ({ a: R() * Math.PI, ph: R(), v: 0.6 + R() * 0.8 }));
  const soakMat = basic({ color: '#3e95e0', transparent: true, opacity: 0, depthWrite: false });
  const soak = add(new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1).translate(0, -0.5, 0), soakMat), false, false);
  soak.position.set(3.85, 0, 0.009);
  const soak2 = add(new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1).translate(0, -0.5, 0), soakMat.clone()), false, false);
  soak2.position.set(7.2, 0, 0.009);

  // ---------------- the duck ----------------
  const duck = makeDuck(ctx);
  const ring = add(new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.14, 14, 36), lib.std({ color: '#ff6fa8', roughness: 0.35 })), true, false);
  ring.rotation.x = Math.PI / 2;

  // ---------------- camera ----------------
  ctx.shots([
    { at: 0, offset: 0, pos: [0, 5.5, 22], look: [0, -1.5, -3], push: 0.06 },
    { at: 'why', pos: [0, 2.4, 24], look: [0, -2.4, -1] },
    { at: 'walls', pos: [0, 5.6, 21], look: [0, -1.0, -3] },
    { at: 'sponge', pos: [2.2, 0.0, 12], look: [2.6, -1.6, -0.5] },
    { at: 'membrane', pos: [0, 1.5, 21], look: [0, -1.4, -1] },
    { at: 'pressure', pos: [2.4, 0.2, 13], look: [2.5, -1.8, -0.5] },
    { at: 'drain', pos: [2.9, -0.5, 10.5], look: [3.3, -2.6, -0.3] },
    { at: 'sump', pos: [1.8, 0.2, 13], look: [1.9, -2.8, -0.5] },
    { at: 'pump', offset: 2.4, pos: [3.0, 1.6, 18], look: [3.4, -1.2, -1], blend: 1.2 },
    { at: 'power', pos: [0, 2.6, 23], look: [0, -0.6, -2] },
    { at: 'battery', pos: [1.8, 0.2, 13], look: [1.9, -2.8, -0.5] },
    { at: 'roof', pos: [3.2, 3.6, 20], look: [3.2, 0.9, -1] },
    { at: 'spouts', pos: [5.0, 2.2, 19], look: [5.2, -0.4, -1] },
    { at: 'end', pos: [1.0, 4.2, 27], look: [1.0, -0.8, -2.5], push: 0.08 },
  ]);

  const UP = new THREE.Vector3(0, 1, 0);
  return t => {
    // ---- hook: dig, then the hole floods
    const dig = lerp(0.02, -3.0, tl.p('hook', 0.0, 0.5));
    digPlane.constant = dig;
    earth.visible = earthTop.visible = dig > -2.98;
    earthTop.position.y = dig - 0.002;
    let fl = lerp(-3.0, -1.7, tl.p('hook', 0.45, 1));
    fl = lerp(fl, -1.15, tl.p('why', 0, 0.8));
    fl = lerp(fl, -3.0, tl.p('walls', 0, 0.3));
    const flooded = fl > -2.97 && tl.p('hook', 0.45, 0.5) > 0;
    flood.visible = floodTop.visible = flooded;
    if (flooded) { flood.scale.y = fl + 3.0; flood.position.y = (fl - 3.0) / 2; floodTop.position.y = fl; }
    const gw = tl.p('why', 0, 0.3) * (1 - 0.55 * tl.p('walls', 0.2, 0.8)) + 0.35 * tl.p('pressure', 0, 0.4) * (1 - tl.p('catch', 0, 0.8));
    gwMat.opacity = 0.42 * gw;
    const seepK = tl.p('why', 0.1, 0.3) * (1 - tl.p('walls', 0, 0.3));
    seeps.forEach((s, i) => {
      if (seepK < 0.01) return seepI.hide(i);
      const q = (t * 0.5 + s.ph) % 1;
      seepI.set(i, s.side * (3.2 + s.len * (1 - q)), s.y + 0.2 * q, 0.02, seepK * (0.6 + 0.4 * q));
    });
    seepI.done();

    // ---- walls rise, then the house lands on top
    const rise = tl.p('walls', 0.15, 0.7);
    shell.visible = rise > 0.001;
    shellParts.forEach((m, i) => { const base = m.userData.y ?? (m.userData.y = m.position.y); const h = m.geometry.parameters.height; m.scale.y = Math.max(0.001, rise); m.position.y = -3.0 + (base + h / 2 + 3.0) * rise - h * rise / 2; });
    const hK = easeOutBack(tl.lin('walls', 0.65, 1));
    house.visible = hK > 0.001; house.scale.set(1, Math.max(0.001, hK), 1);
    house.position.y = 0;

    // ---- damp coming through the concrete
    const dampK = tl.p('sponge', 0.15, 0.85) * (1 - tl.p('membrane', 0.3, 0.9));
    damp.forEach((d, i) => {
      const k = clamp01((dampK - d.f) / (1 - d.f));
      if (k < 0.01) return dampI.hide(i);
      if (d.onFace) dampI.set(i, d.x, d.y, d.z, d.r * k * 0.5, 0, 0, 0, d.r * k);
      else dampI.set(i, d.x, d.y, d.z, d.r * k, 0, Math.PI / 2, 0);
    });
    dampI.done();
    const moistK = tl.p('sponge', 0.1, 0.25) * (1 - tl.p('membrane', 0.25, 0.6));
    moist.forEach((m, i) => {
      if (moistK < 0.01) return moistI.hide(i);
      const q = (t * 0.6 + m.ph) % 1;
      moistI.set(i, m.side * lerp(3.5, 2.92, q), m.y, 0.02, moistK);
    });
    moistI.done();

    // ---- membrane sweeps down the outside of the walls
    const memK = tl.p('membrane', 0.05, 0.75);
    membrane.forEach(m => { m.visible = memK > 0.001; m.scale.y = Math.max(0.001, memK); });

    // ---- water piles up against the walls and finds a crack
    let pres = tl.p('pressure', 0.0, 0.7);
    pres = pres * (1 - tl.p('catch', 0.1, 0.9));
    pres = Math.max(pres, 0.6 * tl.p('nowhere', 0.2, 0.9) * (1 - tl.p('sump', 0.3, 0.9)));
    push.forEach(m => { m.visible = pres > 0.01; m.scale.y = Math.max(0.001, 2.7 * pres); });
    for (let i = 0; i < 8; i++) {
      const s = i < 4 ? -1 : 1, y = -2.7 + (i % 4) * 0.55;
      if (pres < 0.05 || y > -3.0 + 2.7 * pres - 0.1) { arrowI.hide(i); continue; }
      const k = 0.6 + 0.4 * Math.sin(t * 6 + i) * pres;
      arrowI.set(i, s * (3.55 + 0.05 * Math.sin(t * 6 + i)), y, 0.03, pres * k, 0, 0, s > 0 ? Math.PI / 2 : -Math.PI / 2);
    }
    arrowI.done();
    const cracked = tl.p('pressure', 0.62, 0.66);
    crackLine.visible = cracked > 0 && !tl.on('drain');
    const leak = tl.p('pressure', 0.68, 0.75) * (1 - tl.p('drain', 0.0, 0.2));
    jet.forEach((j, i) => {
      if (leak < 0.01) return jetI.hide(i);
      const q = (t * 1.6 + j.ph) % 1;
      jetI.set(i, 2.93 - q * 1.7, -1.72 + j.dy * q - 0.5 * q * q, 0.02 + j.dz * q, leak * (1 - 0.5 * q));
    });
    jetI.done();

    // ---- footing drains in gravel, then they fill up
    const dK = tl.p('drain', 0.15, 0.6);
    drains.forEach(d => { d.g.visible = dK > 0.001; d.g.scale.setScalar(Math.max(0.001, 1.45 * easeOutBack(tl.lin('drain', 0.15, 0.5)))); });
    const gatherK = tl.p('catch', 0, 0.2) * (1 - tl.p('sump', 0.5, 0.8)) + tl.p('roof', 0.3, 0.5) * (1 - tl.p('spouts', 0.3, 0.6));
    gather.forEach((g, i) => {
      if (gatherK < 0.01) return gatherI.hide(i);
      const q = (t * 0.7 + g.ph) % 1;
      gatherI.set(i, g.side * lerp(4.6, 3.62, q), lerp(g.y, -2.75, q), 0.03, gatherK);
    });
    gatherI.done();
    const pipeFull = tl.p('nowhere', 0.15, 0.7) * (1 - tl.p('sump', 0.4, 0.8));
    drains.forEach(d => { d.fill.scale.setScalar(Math.max(0.001, 0.3 + 0.7 * pipeFull)); d.bed.material.color.copy(mixColor('#ffffff', '#7fb7ff', pipeFull * 0.8)); });

    // ---- the sump pit
    const pitK = tl.p('sump', 0.0, 0.3);
    [pitBack, ...pitWalls, pitFloor, pitOpen].forEach(m => { m.visible = pitK > 0; });
    pitBack.scale.y = Math.max(0.001, pitK);
    pitBack.position.y = FLOOR - (FLOOR - PIT_BOT) * pitK / 2;
    toPitL.grow(tl.p('sump', 0.2, 0.55)); toPitR.grow(tl.p('sump', 0.2, 0.45));
    const inflow = tl.p('sump', 0.5, 0.65) * (1 - 0.7 * tl.p('spouts', 0.4, 0.9));
    toPitL.flow(t, inflow, 1.2); toPitR.flow(t, inflow, 1.2);
    let lv = lerp(PIT_BOT + 0.02, -2.92, tl.p('sump', 0.55, 1));
    lv = lerp(lv, -3.3, tl.p('pump', 0.45, 0.85));
    lv = lerp(lv, -2.62, tl.p('power', 0.25, 1));
    lv = lerp(lv, -3.3, tl.p('battery', 0.4, 1));
    pitWater.visible = pitK >= 1 && lv > PIT_BOT + 0.03;
    pitWater.scale.y = Math.max(0.001, lv - PIT_BOT);
    const devK = tl.p('pump', 0.0, 0.15);
    [pump1, pump1Led, rod, floatBall].forEach(m => { m.visible = devK > 0; });
    floatBall.position.set(1.95, Math.max(PIT_BOT + 0.15, lv - 0.02), 0.036);
    const outage = tl.p('power', 0.1, 0.2) * (1 - tl.p('spouts', 0.5, 0.9));
    const run1 = tl.p('pump', 0.35, 0.45) * (1 - outage);
    pump1Led.material.color.copy(mixColor('#333333', '#2bd94a', run1));
    discharge.grow(tl.p('pump', 0.3, 0.75));
    const backupK = easeOutBack(tl.lin('battery', 0.0, 0.3));
    pump2.visible = battery.visible = backupK > 0;
    battery.scale.setScalar(Math.max(0.001, backupK));
    const run2 = tl.p('battery', 0.3, 0.45) * (1 - tl.p('end', 0.3, 0.8));
    const pumping = Math.max(run1, run2);
    discharge.flow(t, tl.p('pump', 0.7, 0.8) > 0 ? clamp01(pumping) : 0, 1.6);
    const outK = tl.p('pump', 0.75, 0.85) * clamp01(pumping);
    for (let i = 0; i < 14; i++) {
      if (outK < 0.01) { outI.hide(i); continue; }
      const q = (t * 1.4 + i / 14) % 1;
      outI.set(i, 6.65 + q * 0.6, 0.12 - 0.6 * q * q, -1.5 + (i % 3 - 1) * 0.08, outK * (1 - q * 0.5));
    }
    outI.done();

    // ---- power cut, storm, roof water, downspout extension
    const storm = tl.p('power', 0, 0.25) * (1 - tl.p('spouts', 0.55, 1));
    ctx.setNight(0.62 * storm);
    const flash = Math.max(smooth(tl.at('power', 0.12), tl.at('power', 0.14), t) * (1 - smooth(tl.at('power', 0.15), tl.at('power', 0.22), t)),
      smooth(tl.at('roof', 0.2), tl.at('roof', 0.22), t) * (1 - smooth(tl.at('roof', 0.23), tl.at('roof', 0.3), t)));
    ctx.lights.hemi.intensity += 2.2 * flash;
    const lightsOn = tl.p('walls', 0.9, 1) * (1 - outage);
    bulb.material.emissiveIntensity = 1.6 * lightsOn; bLight.intensity = 7 * lightsOn;
    shadeMat.emissiveIntensity = 0.9 * lightsOn; roomLight.intensity = 5 * lightsOn;
    rain.forEach((r, i) => {
      if (storm < 0.02) return rainI.hide(i);
      const y = 8 - ((t * 9 + r.o) % 9);
      rainI.set(i, r.x - 0.06 * y, y, r.z, 1, 0, 0, 0.08, storm);
    });
    rainI.done();
    const roofK = tl.p('roof', 0.15, 0.35) * (1 - tl.p('end', 0, 0.4));
    spout.grow(tl.p('walls', 0.97, 1) > 0 ? 1 : 0);
    spout.flow(t, roofK, 1.8);
    const onExt = tl.p('spouts', 0.2, 0.6);
    extension.grow(tl.p('spouts', 0.05, 0.45));
    extension.flow(t, roofK * onExt, 1.6);
    splash.forEach((s, i) => {
      if (roofK < 0.02) return splashI.hide(i);
      const q = (t * 1.5 + s.ph) % 1, x0 = onExt > 0.5 ? 7.25 : 4.0;
      splashI.set(i, x0 + Math.cos(s.a) * q * 0.35 * s.v, 0.05 + Math.sin(s.a) * q * 0.4 * s.v - 0.5 * q * q, -0.35 + (Math.cos(s.a * 3)) * 0.15, roofK * (1 - q));
    });
    splashI.done();
    const soakNear = tl.p('roof', 0.3, 0.9) * (1 - tl.p('spouts', 0.4, 0.9));
    soakMat.opacity = 0.55 * soakNear; soak.scale.y = Math.max(0.001, 2.2 * tl.p('roof', 0.3, 0.9));
    soak2.material.opacity = 0.4 * tl.p('spouts', 0.5, 0.9) * (1 - tl.p('end', 0.3, 1)); soak2.scale.y = 0.9;

    // ---- the duck: floats in the flooded hole, rides the new floor up, gets sprayed, ends in a float on a dry floor
    const dk = duck.group;
    dk.scale.setScalar(0.8);
    duck.tint('#ffffff', 0);
    const floorTop = shell.visible ? -3.0 + (FLOOR + 3.0) * rise : -3.0;
    if (t < tl.at('hook', 0.55)) {
      dk.position.set(-3.75, 0.02, -1.2); dk.rotation.set(0, -0.6, 0);
      ring.visible = false;
    } else if (t < tl.at('walls', 0.75)) {
      const jump = clamp01((t - tl.at('hook', 0.55)) / 0.6);
      const ringY = flooded ? fl + 0.03 * Math.sin(t * 2.3) : floorTop + 0.14;
      dk.position.set(lerp(-3.75, -0.6, jump), jump < 1 ? lerp(0.02, ringY, jump) + 1.2 * Math.sin(Math.PI * jump) : ringY + 0.02, -2.0);
      dk.rotation.set(0, -0.5 + 0.1 * Math.sin(t * 0.6), 0.06 * Math.sin(t * 1.7));
      ring.visible = jump >= 1; ring.scale.setScalar(1); ring.position.set(-0.6, ringY, -2.0);
    } else if (!tl.on('end')) {
      const shrink = 1 - tl.p('walls', 0.75, 0.95);
      ring.visible = shrink > 0.01; ring.scale.setScalar(Math.max(0.001, shrink)); ring.position.set(-0.6, FLOOR + 0.14, -2.0);
      const walk = tl.p('sponge', 0, 0.5);
      const hit = tl.p('pressure', 0.72, 0.8) * (1 - tl.p('drain', 0.0, 0.25));
      dk.position.set(lerp(-0.6, 0.9, walk) - 0.25 * hit, FLOOR + 0.03 * Math.abs(Math.sin(t * 8)) * (walk > 0 && walk < 1 ? 1 : 0), lerp(-2.0, -0.8, walk));
      dk.rotation.set(0, -0.4, 0.35 * hit + 0.05 * Math.sin(t * 9) * hit);
      duck.tint('#9fdcff', 0.5 * hit);
    } else {
      const k = easeOutBack(tl.lin('end', 0.1, 0.45));
      ring.visible = true; ring.scale.setScalar(Math.max(0.001, k)); ring.position.set(-0.9, FLOOR + 0.14, -1.6);
      dk.position.set(-0.9, FLOOR + 0.14 * k, -1.6); dk.rotation.set(0, -0.45, -0.18 * k);
    }
  };
}

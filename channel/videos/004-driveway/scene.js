// 004 - How an asphalt driveway is built. Each block below is keyed to a beat in script.json.
import {
  THREE, smooth, lerp, clamp01, rng, easeOutBack, mixColor,
  makeDuck, makeLabel, instanced, extrude, shapeOf,
} from '../../engine/engine.js';

export function build(ctx) {
  const { scene, tl, lib } = ctx;
  const R = rng(44);
  const D = 10, HW = 2.3;                                               // driveway length (into the screen) and half-width
  const P = [[-HW, 0], [-HW, -1.0], [HW, -1.0], [HW, 0]];
  const yard = ctx.buildYard({ profile: P, depth: D, rockTop: -4.6 });
  const add = (m, cast = false, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; scene.add(m); return m; };
  const basic = o => new THREE.MeshBasicMaterial(o);
  const G_BOT = -1.0, B_BOT = -0.34, T_BOT = -0.15, TOP = 0.015;

  // ---------------- textures ----------------
  const speckle = (base, n, cols, size) => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < n; i++) { g.fillStyle = cols[Math.floor(R() * cols.length)]; g.beginPath(); g.ellipse(R() * 256, R() * 256, size * (0.5 + R()), size * (0.4 + R() * 0.7), R() * 3, 0, 7); g.fill(); }
    return c;
  };
  const texFrom = (canvas, rx, ry) => { const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; };
  const gravelC = speckle('#8a867f', 650, ['#a8a29a', '#6f6a63', '#c2bcb2', '#59544e'], 6);
  const binderC = speckle('#262626', 420, ['#6b6b6b', '#8a8a86', '#4a4a48'], 4.5);
  const topC = speckle('#77756f', 1400, ['#8f8d86', '#a4a29b', '#5f5d58'], 1.6);
  const faceMats = (canvas, front, top, base = {}) => {
    const side = lib.std({ map: texFrom(canvas, ...front), ...base });
    const up = lib.std({ map: texFrom(canvas, ...top), ...base });
    return [side, side, up, side, side, side];
  };

  // ---------------- the lawn before, and the ruts ----------------
  const lawnCover = add(new THREE.Mesh(new THREE.PlaneGeometry(2 * HW, D), lib.mat.grass), false, true);
  lawnCover.rotation.x = -Math.PI / 2; lawnCover.position.set(0, 0.024, -D / 2);
  const rutMat = lib.std({ color: '#4a2e17', roughness: 0.35 });
  const ruts = [-0.85, 0.85].map(x => { const m = add(new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1).translate(0, -0.5, 0), rutMat), false, true); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, 0); return m; });
  const mudI = instanced(ctx, new THREE.SphereGeometry(0.05, 6, 5), lib.std({ color: '#4a2e17' }), 30);
  const muds = Array.from({ length: 30 }, () => ({ ph: R(), side: R() < 0.5 ? -1 : 1, vx: 0.6 + R() * 2.0, vy: 1.2 + R() * 1.4 }));

  // ---------------- digging out the topsoil ----------------
  const digPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.02);
  const earth = add(new THREE.Mesh(extrude(P, D - 0.02), lib.soil({ side: THREE.DoubleSide, clippingPlanes: [digPlane] })));
  earth.position.z = -D + 0.01;
  const earthTop = add(new THREE.Mesh(new THREE.PlaneGeometry(2 * HW, D - 0.02), lib.soil({ color: '#9a6238' })));
  earthTop.rotation.x = -Math.PI / 2; earthTop.position.z = -D / 2;
  const pile = add(new THREE.Mesh(new THREE.SphereGeometry(1.5, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), lib.soil()), true, true);
  pile.position.set(-4.6, 0, -6.5);
  const mudFloor = add(new THREE.Mesh(new THREE.PlaneGeometry(2 * HW - 0.05, D - 0.1), lib.std({ color: '#3d2412', roughness: 0.25, transparent: true, opacity: 0 })), false, true);
  mudFloor.rotation.x = -Math.PI / 2; mudFloor.position.set(0, G_BOT + 0.01, -D / 2);
  const puddleI = instanced(ctx, new THREE.CircleGeometry(1, 24), lib.std({ color: '#6aa6c8', roughness: 0.05, transparent: true, opacity: 0.75 }), 14);
  const floorPuddles = Array.from({ length: 8 }, () => ({ x: -1.8 + R() * 3.6, z: -0.8 - R() * 8.4, r: 0.25 + R() * 0.35 }));

  // ---------------- gravel base ----------------
  const gravel = add(new THREE.Mesh(new THREE.BoxGeometry(2 * HW, 1, D).translate(0, 0.5, -D / 2), faceMats(gravelC, [2.4, 0.35], [2.4, 5])), true, true);
  gravel.position.set(0, G_BOT, 0.002);
  const fallI = instanced(ctx, new THREE.DodecahedronGeometry(0.07, 0), lib.std({ color: '#8a867f', flatShading: true }), 50);
  const falls = Array.from({ length: 50 }, () => ({ x: -2.1 + R() * 4.2, z: -0.4 - R() * 9.2, ph: R() }));
  const kickI = instanced(ctx, new THREE.DodecahedronGeometry(0.06, 0), lib.std({ color: '#9a958c', flatShading: true }), 40);
  const kicks = Array.from({ length: 40 }, () => ({ side: R() < 0.5 ? -1 : 1, ph: R(), vx: 1.0 + R() * 2.0, vy: 1.4 + R() * 1.6, land: 2.6 + R() * 1.6 }));
  const grooveMat = lib.std({ color: '#55524c', roughness: 0.4, transparent: true, opacity: 0 });
  const grooves = [-0.85, 0.85].map(x => { const m = add(new THREE.Mesh(new THREE.PlaneGeometry(0.4, D - 0.4), grooveMat), false, true); m.rotation.x = -Math.PI / 2; m.position.set(x, 0, -D / 2); return m; });

  // ---------------- asphalt: binder coat, top coat, tilted as a group ----------------
  const pave = new THREE.Group();
  pave.position.set(0, B_BOT, 0);
  scene.add(pave);
  const binder = new THREE.Mesh(new THREE.BoxGeometry(2 * HW, T_BOT - B_BOT, 1).translate(0, (T_BOT - B_BOT) / 2, 0.5), faceMats(binderC, [3, 0.25], [3, 6]));
  binder.position.set(0, 0, -D); binder.castShadow = binder.receiveShadow = true; pave.add(binder);
  const topMats = faceMats(topC, [4, 0.2], [4, 8], { roughness: 0.75, color: '#2c2c2c' });
  const topCoat = new THREE.Mesh(new THREE.BoxGeometry(2 * HW, TOP - T_BOT, 1).translate(0, (TOP - T_BOT) / 2, 0.5), topMats);
  topCoat.position.set(0, T_BOT - B_BOT, -D); topCoat.castShadow = topCoat.receiveShadow = true; pave.add(topCoat);
  const sealPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), -D);
  const seal = new THREE.Mesh(new THREE.PlaneGeometry(2 * HW, D), new THREE.MeshStandardMaterial({ color: '#0e0e0e', roughness: 0.18, metalness: 0.1, clippingPlanes: [sealPlane] }));
  seal.rotation.x = -Math.PI / 2; seal.position.set(0, TOP - B_BOT + 0.003, -D / 2); seal.receiveShadow = true; pave.add(seal);
  const wedge = add(new THREE.Mesh(new THREE.ExtrudeGeometry(shapeOf([[-HW, 0], [0, 0], [-HW, 1]]), { depth: D, bevelEnabled: false }), faceMats(gravelC, [2, 0.3], [2, 4])[0]), false, true);
  wedge.position.set(0, B_BOT, -D + 0.003);
  const pavePuddles = Array.from({ length: 6 }, () => ({ x: -1.6 + R() * 2.8, z: -1.2 - R() * 7.5, r: 0.3 + R() * 0.35 }));
  const pPuddleMat = lib.std({ color: '#7fb6d6', roughness: 0.05, transparent: true, opacity: 0.8 });
  const pPuddles = pavePuddles.map(() => { const m = new THREE.Mesh(new THREE.CircleGeometry(1, 24), pPuddleMat); m.rotation.x = -Math.PI / 2; pave.add(m); return m; });
  const runI = instanced(ctx, new THREE.SphereGeometry(0.045, 8, 6), basic({ color: '#a9dcff' }), 30);
  const runs = Array.from({ length: 30 }, () => ({ z: -0.2 - R() * 9, ph: R() }));
  const crackMat = new THREE.LineBasicMaterial({ color: '#0a0a0a', transparent: true, opacity: 0 });
  for (let k = 0; k < 7; k++) {
    let x = -1.8 + R() * 3.6, z = -1 - R() * 8;
    const pts = [];
    for (let s = 0; s < 6; s++) { pts.push(new THREE.Vector3(x, TOP - B_BOT + 0.004, z)); x += (R() - 0.5) * 0.35; z -= 0.12 + R() * 0.2; }
    pave.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), crackMat));
  }
  const vcrackMat = basic({ color: '#0b0b0b' });
  const vcrack = new THREE.Mesh(new THREE.ShapeGeometry(shapeOf([[-0.5, 0], [0.5, 0], [0, -1]])), vcrackMat);
  vcrack.position.set(0.7, TOP - B_BOT, 0.011); pave.add(vcrack);
  const iceMat = basic({ color: '#cfefff' });
  const ice = new THREE.Mesh(new THREE.ShapeGeometry(shapeOf([[-0.5, 0], [0.5, 0], [0, -1]])), iceMat);
  ice.position.set(0.7, TOP - B_BOT, 0.012); pave.add(ice);
  const holeMat = lib.std({ color: '#151515', roughness: 0.9 });
  const pothole = new THREE.Mesh(new THREE.CircleGeometry(0.42, 9), holeMat);
  pothole.rotation.x = -Math.PI / 2; pothole.position.set(-0.9, TOP - B_BOT + 0.004, -2.2); pothole.scale.set(1.2, 0.8, 1); pave.add(pothole);
  const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), lib.std({ color: '#5d5d5a', flatShading: true }));
  chunk.scale.set(1.2, 0.45, 0.9); pave.add(chunk);
  const patchMat = lib.std({ color: '#0f0f0f', roughness: 0.2 });
  const patch = new THREE.Mesh(new THREE.CircleGeometry(0.46, 9), patchMat);
  patch.rotation.x = -Math.PI / 2; patch.position.set(-0.9, TOP - B_BOT + 0.006, -2.2); patch.scale.set(1.2, 0.8, 1); pave.add(patch);

  // ---------------- machines: roller and paver ----------------
  const yellow = lib.std({ color: '#f2b705', roughness: 0.45 }), dark = lib.std({ color: '#2b2b2b' });
  const roller = new THREE.Group();
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.1, 24), lib.std({ color: '#7a7f86', metalness: 0.5, roughness: 0.4 }));
  drum.rotation.z = Math.PI / 2; drum.position.y = 0.42; roller.add(drum);
  const rb = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 1.2), yellow); rb.position.set(0, 0.85, 0.9); roller.add(rb);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), dark); seat.position.set(0, 1.4, 1.0); roller.add(seat);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.9), yellow); roof.position.set(0, 2.0, 1.0); roller.add(roof);
  for (const x of [-0.45, 0.45]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.05), dark); post.position.set(x, 1.7, 1.3); roller.add(post); }
  const rwheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.5, 20), dark); rwheel.rotation.z = Math.PI / 2; rwheel.position.set(0, 0.35, 1.5); roller.add(rwheel);
  roller.traverse(o => { o.castShadow = true; }); scene.add(roller);
  const paver = new THREE.Group();
  const pbody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 2.0), yellow); pbody.position.set(0, 0.75, -0.2); paver.add(pbody);
  const hopper = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 1.0), yellow); hopper.position.set(0, 0.6, -1.6); paver.add(hopper);
  const hfill = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 0.8), lib.std({ color: '#1e1e1e' })); hfill.position.set(0, 0.86, -1.6); paver.add(hfill);
  const screed = new THREE.Mesh(new THREE.BoxGeometry(2 * HW - 0.1, 0.25, 0.4), dark); screed.position.set(0, 0.2, 1.0); paver.add(screed);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.8), dark); cab.position.set(0.6, 1.55, 0.2); paver.add(cab);
  for (const x of [-1.0, 1.0]) { const tr = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 1.8), dark); tr.position.set(x, 0.18, -0.4); paver.add(tr); }
  paver.traverse(o => { o.castShadow = true; }); scene.add(paver);
  const steam = Array.from({ length: 20 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: lib.tex.glow, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); scene.add(s); return { s, x: -2 + R() * 4, z: -0.5 - R() * 8.5, ph: R() }; });
  const heatLabel = makeLabel(ctx, { height: 0.7, color: '#ffd23f' });

  // ---------------- the car and the garage ----------------
  const car = new THREE.Group();
  const red = lib.std({ color: '#d64541', roughness: 0.35, metalness: 0.2 });
  const cbody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 4.0), red); cbody.position.y = 0.6; car.add(cbody);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.1), red); cabin.position.set(0, 1.15, 0.25); car.add(cabin);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.4, 1.7), lib.std({ color: '#26384a', roughness: 0.15 })); glass.position.set(0, 1.18, 0.25); car.add(glass);
  for (const x of [-0.55, 0.55]) { const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.05), basic({ color: '#fff7d6' })); hl.position.set(x, 0.65, -2.01); car.add(hl); }
  const wheels = [];
  for (const [x, z] of [[-0.88, -1.35], [0.88, -1.35], [-0.88, 1.35], [0.88, 1.35]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 18), dark); w.rotation.z = Math.PI / 2; w.position.set(x, 0.38, z); car.add(w); wheels.push(w); }
  car.traverse(o => { o.castShadow = true; }); scene.add(car);
  const garage = new THREE.Group();
  const sid = lib.tex.siding.clone(); sid.repeat.set(3, 1.5); sid.needsUpdate = true;
  const gMat = lib.std({ map: sid });
  const gp = (w, h, d, x, y, z, m = gMat) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; garage.add(b); return b; };
  gp(1.0, 2.9, 0.2, -2.3, 1.45, 0); gp(1.0, 2.9, 0.2, 2.3, 1.45, 0); gp(5.6, 0.6, 0.2, 0, 2.6, 0);
  gp(0.2, 2.9, 5, -2.7, 1.45, -2.5); gp(0.2, 2.9, 5, 2.7, 1.45, -2.5); gp(5.6, 2.9, 0.2, 0, 1.45, -5);
  gp(3.6, 0.05, 5, 0, 0.02, -2.5, lib.mat.concrete);
  const gr = lib.tex.shingles.clone(); gr.repeat.set(3, 2); gr.needsUpdate = true;
  const groof = new THREE.Mesh(new THREE.ExtrudeGeometry(shapeOf([[-3.1, 0], [3.1, 0], [0, 1.6]]), { depth: 5.6, bevelEnabled: false }), lib.std({ map: gr }));
  groof.position.set(0, 2.9, -5.3); groof.castShadow = true; garage.add(groof);
  const door = gp(3.6, 2.3, 0.08, 0, 1.15, -0.12, lib.std({ color: '#f3f1ec' }));
  for (let i = 1; i < 4; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.03, 0.02), lib.std({ color: '#c9c5bc' })); l.position.set(0, -1.15 + i * 0.575, 0.05); door.add(l); }
  garage.position.set(0, 0, -D); scene.add(garage);

  // ---------------- weather, sun ----------------
  const rainI = instanced(ctx, new THREE.BoxGeometry(0.014, 0.34, 0.014), basic({ color: '#d9efff', transparent: true, opacity: 0.7 }), 140);
  const rain = Array.from({ length: 140 }, () => ({ x: -5 + R() * 10, z: -11 + R() * 12, o: R() * 8 }));
  const snowI = instanced(ctx, new THREE.SphereGeometry(0.035, 6, 5), basic({ color: '#ffffff' }), 120);
  const snow = Array.from({ length: 120 }, () => ({ x: -5 + R() * 10, z: -11 + R() * 12, o: R() * 7, w: R() * 6 }));
  const sun = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), basic({ color: '#ffe066', fog: false, transparent: true }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: lib.tex.glow, color: '#ffcf40', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.scale.set(3.6, 3.6, 1); sun.add(core, halo); scene.add(sun);

  // ---------------- the duck ----------------
  const duck = makeDuck(ctx);

  // ---------------- camera ----------------
  ctx.shots([
    { at: 0, offset: 0, pos: [2.6, 3.2, 8.5], look: [-0.8, 0.3, -3.4], push: 0.05 },
    { at: 'topsoil', pos: [0, 5.0, 12], look: [0, -0.6, -3] },
    { at: 'weak', pos: [1.0, 2.2, 8.5], look: [0.4, -0.9, -2.0] },
    { at: 'stone', pos: [0, 4.6, 12], look: [0, -0.5, -3.5] },
    { at: 'gravel', pos: [0, 7.0, 13], look: [0, -0.3, -5.5] },
    { at: 'kicked', pos: [3.4, 3.0, 7.5], look: [0.4, -0.1, -3.5] },
    { at: 'asphalt', pos: [0, 5.0, 11], look: [0, -0.3, -4.5] },
    { at: 'asphalt', offset: 5.4, pos: [0.4, 0.35, 5.8], look: [0.2, -0.45, -0.3], blend: 0.9 },
    { at: 'layers', pos: [0, 5.0, 11], look: [0, -0.3, -4.5] },
    { at: 'layers', offset: 2.5, pos: [0.4, 0.3, 5.5], look: [0.2, -0.45, -0.3], blend: 0.9 },
    { at: 'hot', pos: [1.8, 2.6, 8.5], look: [0.1, 0.2, -2.6] },
    { at: 'flat', pos: [0, 5.5, 11], look: [0, -0.2, -4] },
    { at: 'tilt', pos: [1.3, 0.6, 9], look: [1.4, -0.35, -0.5] },
    { at: 'sun', pos: [0, 2.6, 12], look: [0, 1.3, -4] },
    { at: 'winter', pos: [1.2, 0.5, 5.0], look: [0.8, -0.3, -0.4] },
    { at: 'pries', offset: 1.9, pos: [0.4, 3.2, 6.5], look: [-0.6, -0.1, -2.2], blend: 0.9 },
    { at: 'sealcoat', pos: [0, 4.8, 11], look: [0, -0.2, -4.5] },
    { at: 'end', pos: [4.0, 4.6, 13], look: [0, 0.2, -4.5], push: 0.08 },
  ]);

  const SUN = new THREE.Vector3(2.4, 5.2, -6);
  return t => {
    // ---- the car: ruts in the lawn, gravel ruts, then parked on the finished driveway
    let carZ = -13.5, carY = 0, carOn = true;
    if (!tl.on('topsoil')) carZ = lerp(-2.2, -13.5, tl.p('hook', 0.05, 0.95));                       // ruts across the lawn, into the garage
    else if (tl.on('kicked') && !tl.on('asphalt')) { carZ = -13.5 + 10.8 * Math.sin(Math.PI * tl.p('kicked', 0.0, 0.95)); carY = gravel.position.y + gravel.scale.y; }
    else if (tl.on('end')) { carZ = lerp(-13.5, -5.2, tl.p('end', 0.0, 0.7)); carY = TOP; }
    else carOn = false;
    car.visible = carOn && carZ > -13.0;
    car.position.set(0, carY, carZ);
    wheels.forEach(w => { w.rotation.x = -carZ / 0.38; });
    const doorUp = Math.max(tl.p('hook', 0, 0.05) * (1 - tl.p('topsoil', 0, 0.3)), tl.p('kicked', 0, 0.1) * (1 - tl.p('asphalt', 0, 0.2)), tl.p('end', 0, 0.15));
    door.position.y = 1.15 + 1.3 * doorUp;
    lawnCover.visible = !tl.on('topsoil');
    ruts.forEach(r => { const back = Math.min(0, carZ + 1.35); r.visible = lawnCover.visible && back < -0.05; r.scale.y = Math.max(0.001, -back); });
    rutMat.color.copy(mixColor('#5a3a1e', '#3a2412', tl.p('hook', 0.2, 0.9)));
    muds.forEach((m, i) => {
      if (tl.on('topsoil') || !tl.on('hook') || carZ < -9.5) return mudI.hide(i);
      const q = (t * 2.2 + m.ph) % 1;
      mudI.set(i, m.side * (0.85 + m.vx * q * 0.9), Math.max(0.03, 0.05 + m.vy * q - 3 * q * q), carZ + 1.6 + q * 0.6, 1);
    });
    mudI.done();

    // ---- dig out the topsoil
    const dig = lerp(0.02, G_BOT, tl.p('topsoil', 0.05, 0.75));
    digPlane.constant = dig;
    earth.visible = earthTop.visible = dig > G_BOT + 0.02;
    earthTop.position.y = dig - 0.002;
    pile.scale.set(0.3 + 0.7 * tl.p('topsoil', 0.1, 0.8), 0.05 + 0.95 * tl.p('topsoil', 0.1, 0.8), 0.3 + 0.7 * tl.p('topsoil', 0.1, 0.8));

    // ---- rain turns the bare dirt to mud
    const wet = tl.p('weak', 0.1, 0.6) * (1 - tl.p('stone', 0.1, 0.4));
    mudFloor.material.opacity = 0.75 * wet;
    yard.pitMat.color.copy(mixColor('#ffffff', '#8a6a52', wet));
    for (let i = 0; i < 14; i++) {
      if (i < floorPuddles.length && wet > 0.05) { const p = floorPuddles[i]; puddleI.set(i, p.x, G_BOT + 0.015, p.z, p.r * wet, -Math.PI / 2, 0, 0); }
      else puddleI.hide(i);
    }
    puddleI.done();

    // ---- crushed stone, then the roller
    const fill = tl.p('stone', 0.02, 0.5), pack = tl.p('stone', 0.5, 0.95);
    const gTop = lerp(G_BOT, -0.28, fill) - 0.06 * pack;
    gravel.visible = fill > 0.001;
    gravel.scale.y = Math.max(0.001, gTop - G_BOT);
    falls.forEach((f, i) => {
      if (fill <= 0 || fill >= 1) return fallI.hide(i);
      const q = (t * 1.3 + f.ph) % 1;
      fallI.set(i, f.x, lerp(2.2, gTop, q), f.z, 1, t * 3, t * 2, 0);
    });
    fallI.done();
    const rollStone = tl.p('stone', 0.45, 0.98), rollHot = tl.p('hot', 0.1, 0.9);
    roller.visible = (rollStone > 0 && rollStone < 1) || (rollHot > 0 && rollHot < 1);
    if (rollHot > 0) roller.position.set(0.6, TOP, lerp(-1.2, -8.5, rollHot)); else roller.position.set(0, gTop, lerp(-1.0, -9.0, rollStone));
    roller.rotation.y = Math.PI;
    drum.rotation.x = (rollHot > 0 ? rollHot : rollStone) * 14;

    // ---- gravel gets kicked around, rain cuts ruts
    kicks.forEach((k, i) => {
      if (!tl.on('kicked') || tl.on('asphalt') || carZ < -9.5 || !car.visible) return kickI.hide(i);
      const q = (t * 1.8 + k.ph) % 1;
      kickI.set(i, k.side * Math.min(k.land, 0.9 + k.vx * q), Math.max(0.02, carY + k.vy * q - 4 * q * q), carZ + 1.5, 1, t * 5, t * 3, 0);
    });
    kickI.done();
    const storm1 = tl.p('kicked', 0.5, 0.7) * (1 - tl.p('asphalt', 0, 0.15));
    grooveMat.opacity = 0.85 * tl.p('kicked', 0.4, 0.95) * (1 - tl.p('asphalt', 0.1, 0.4));
    grooves.forEach(g => { g.position.y = gTop + 0.004; });

    // ---- the paver lays the bottom coat, then the top coat
    const pass1 = tl.p('asphalt', 0.12, 0.88), pass2 = tl.p('layers', 0.04, 0.6);
    binder.visible = pass1 > 0.001; binder.scale.z = Math.max(0.001, pass1 * D);
    topCoat.visible = pass2 > 0.001; topCoat.scale.z = Math.max(0.001, pass2 * D);
    const paving = (pass1 > 0 && pass1 < 1) ? pass1 : (pass2 > 0 && pass2 < 1) ? pass2 : -1;
    paver.visible = paving >= 0 && paving < 0.82;
    if (paving >= 0) paver.position.set(0, pass2 > 0 ? T_BOT : B_BOT, -D + paving * D + 1.0);
    paver.rotation.y = Math.PI;

    // ---- hot asphalt: steam, glow, the label
    const heat = tl.p('layers', 0.1, 0.4) * (1 - tl.p('flat', 0, 0.8));
    topMats[2].emissive = topMats[2].emissive || new THREE.Color();
    topMats[2].emissive.copy(new THREE.Color('#ff6a2a')); topMats[2].emissiveIntensity = tl.on('hot') ? 0.03 * heat * (0.8 + 0.2 * Math.sin(t * 6)) : 0;
    steam.forEach(s => {
      const q = (t * 0.35 + s.ph) % 1;
      s.s.visible = heat > 0.02;
      s.s.position.set(s.x + 0.2 * Math.sin(t + s.ph * 6), TOP + 0.1 + q * 1.6, s.z);
      s.s.scale.setScalar(0.5 + 1.0 * q);
      s.s.material.opacity = (1 - q) * 0.35 * heat;
    });
    heatLabel.set(tl.on('hot') && tl.p('hot', 0.05, 0.1) > 0 && !tl.on('flat') ? '300°F' : '');
    heatLabel.sprite.position.set(0.3, 1.9, -3.2);

    // ---- flat: puddles; tilt: they run off into the grass
    const tilt = tl.p('tilt', 0.05, 0.5);
    pave.rotation.z = -0.045 * tilt;
    wedge.visible = tilt > 0.001; wedge.scale.y = Math.max(0.001, HW * 0.045 * tilt);
    const pud = tl.p('flat', 0.15, 0.8) * (1 - tl.p('tilt', 0.35, 0.9));
    pPuddles.forEach((m, i) => {
      const p = pavePuddles[i];
      m.visible = pud > 0.02;
      m.position.set(p.x + 1.5 * tl.p('tilt', 0.3, 0.9), TOP - B_BOT + 0.005, p.z);
      m.scale.setScalar(Math.max(0.001, p.r * pud));
    });
    const runK = tl.p('tilt', 0.35, 0.5) * (1 - tl.p('sun', 0, 0.3));
    runs.forEach((r, i) => {
      if (runK < 0.01) return runI.hide(i);
      const q = (t * 0.9 + r.ph) % 1;
      runI.set(i, HW + q * 0.9, Math.max(0.02, TOP - 0.05 - q * 0.08), r.z, runK);
    });
    runI.done();

    // ---- the sun bakes it gray; winter cracks it; a chunk breaks loose
    const sunV = tl.p('sun', 0, 0.2) * (1 - tl.p('winter', 0, 0.4));
    sun.visible = sunV > 0.01; sun.position.set(SUN.x, SUN.y + (1 - sunV) * 1.5, SUN.z);
    core.material.opacity = halo.material.opacity = sunV;
    const gray = tl.p('sun', 0.2, 0.9);
    topMats.forEach(m => m.color.copy(mixColor('#2c2c2c', '#bdbab2', gray)));
    const cold = tl.p('winter', 0, 0.3) * (1 - tl.p('sealcoat', 0.0, 0.3));
    ctx.setNight(0.28 * cold);
    crackMat.opacity = tl.p('winter', 0.15, 0.5);
    const widen = tl.p('pries', 0.0, 0.6);
    const vk = tl.p('winter', 0.15, 0.4);
    vcrack.visible = vk > 0.01;
    vcrack.scale.set(Math.max(0.001, (0.12 + 0.3 * widen) * vk), Math.max(0.001, (0.16 + 0.16 * widen) * vk), 1);
    const freeze = tl.p('winter', 0.6, 0.9);
    ice.visible = vk > 0.01 && freeze > 0.01;
    ice.scale.set(Math.max(0.001, (0.08 + 0.26 * widen) * freeze), Math.max(0.001, (0.11 + 0.15 * widen) * freeze), 1);
    iceMat.color.copy(mixColor('#5fb6ff', '#e6f7ff', freeze));
    const pop = tl.p('pries', 0.55, 0.85);
    pothole.visible = pop > 0.05;
    chunk.visible = pop > 0 && pop < 0.999;
    chunk.position.set(-0.9 + 0.8 * pop, TOP - B_BOT + 0.05 + 1.2 * Math.sin(Math.PI * pop), -2.2 + 0.4 * pop);
    chunk.rotation.set(pop * 4, pop * 2, pop * 3);

    // ---- fill the cracks and sealcoat
    const fixK = tl.p('sealcoat', 0.05, 0.3);
    vcrackMat.color.copy(mixColor('#0b0b0b', '#050505', fixK));
    ice.visible = ice.visible && fixK < 0.5;
    patch.visible = fixK > 0.3;
    crackMat.opacity *= 1 - tl.p('sealcoat', 0.3, 0.9);
    sealPlane.constant = tl.on('sealcoat') ? lerp(-D, 0.5, tl.p('sealcoat', 0.3, 0.95)) : -D;
    seal.visible = tl.on('sealcoat');

    // ---- weather
    const rainK = Math.max(tl.p('weak', 0.05, 0.25) * (1 - tl.p('stone', 0, 0.15)), storm1, tl.p('flat', 0.05, 0.25) * (1 - tl.p('tilt', 0.6, 0.9)));
    rain.forEach((r, i) => {
      if (rainK < 0.02) return rainI.hide(i);
      const y = 7 - ((t * 9 + r.o) % 8);
      rainI.set(i, r.x - 0.05 * y, y, r.z, 1, 0, 0, 0.06, rainK);
    });
    rainI.done();
    snow.forEach((s, i) => {
      if (cold < 0.02) return snowI.hide(i);
      const y = 6 - ((t * 1.1 + s.o) % 6.5);
      snowI.set(i, s.x + 0.3 * Math.sin(t + s.w), y, s.z, cold);
    });
    snowI.done();

    // ---- the duck: splashed with mud, rinsed by the rain, hops on the hot asphalt
    const dk = duck.group;
    dk.scale.setScalar(0.85);
    const muddy = tl.p('hook', 0.45, 0.7) * (1 - tl.p('weak', 0.3, 0.8));
    duck.tint('#6b4423', 0.85 * muddy);
    if (tl.on('hot') && !tl.on('tilt')) {
      const hop = Math.abs(Math.sin(t * 9)) * (1 - tl.p('flat', 0.5, 1));
      dk.position.set(-1.0, TOP + 0.5 * hop, -1.6); dk.rotation.set(0, -0.6 + 0.3 * Math.sin(t * 4.5), 0.15 * Math.sin(t * 9));
    } else if (tl.on('end')) {
      dk.position.set(1.6, TOP, -1.2); dk.rotation.set(0, -0.9, 0);
    } else {
      dk.position.set(-2.85, 0.02, -3.0); dk.rotation.set(0, -0.2, 0);
    }
    if (cold > 0.02) duck.body.color.lerp(new THREE.Color('#c4e8ff'), 0.5 * cold);
  };
}

// 001 - How a pool is built. Each block below is keyed to a beat in script.json.
import {
  THREE, smooth, lerp, clamp01, rng, easeOutBack, easeOutBounce, mixColor,
  makePipe, makeDuck, instanced, insetProfile, xSpanAt, bottomAt, samplePolyline,
  extrude, wallGeometry, shapeOf, roundedPath,
} from '../../engine/engine.js';

export function build(ctx) {
  const { scene, tl, lib } = ctx;
  const R = rng(7);
  const D = 6;                                                                   // pool length, into the screen
  const P = [[-3, 0], [-3, -1.2], [-0.7, -1.2], [1.1, -2.5], [3, -2.5], [3, 0]];  // the dug hole
  const SH = insetProfile(P, 0.16);                                              // inner face of the gunite
  const PL = insetProfile(P, 0.2);                                               // inner face of the plaster
  const REB = insetProfile(P, 0.08);                                             // where the rebar sits
  const yard = ctx.buildYard({ profile: P, depth: D, rockTop: -5.4 });
  const add = (m, cast = false, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; scene.add(m); return m; };
  const pAt = (id, a, b, tt) => smooth(tl.at(id, a), tl.at(id, b), tt);
  const basic = o => new THREE.MeshBasicMaterial(o);

  // ---------------- dig ----------------
  const digPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const earth = add(new THREE.Mesh(extrude(P, D - 0.02), lib.soil({ side: THREE.DoubleSide, clippingPlanes: [digPlane] })));
  earth.position.z = -D + 0.01;
  const earthTop = add(new THREE.Mesh(new THREE.PlaneGeometry(1, D - 0.02), lib.soil({ color: '#9a6238' })));
  earthTop.rotation.x = -Math.PI / 2; earthTop.position.z = -D / 2;
  const digAt = tt => lerp(0.02, -2.52, pAt('dig', 0.04, 0.96, tt));
  const pile = add(new THREE.Mesh(new THREE.SphereGeometry(1.8, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), lib.soil()), true, true);
  pile.position.set(-4.5, 0, -9.5);
  const clodI = instanced(ctx, new THREE.DodecahedronGeometry(0.12, 0), lib.std({ color: '#8a522b' }), 44);
  clodI.mesh.castShadow = true;
  const clods = Array.from({ length: 44 }, () => ({ f: 0.04 + R() * 0.82, x0: -2.5 + R() * 5, z: -0.7 - R() * 4.6, vx: -(1.0 + R() * 1.9), vy: 4.4 + R() * 2.4, vz: -(0.5 + R() * 1.2), spin: (R() - 0.5) * 12, s: 0.7 + R() * 1.0 }));

  // ---------------- cave-in ----------------
  const rainI = instanced(ctx, new THREE.BoxGeometry(0.014, 0.34, 0.014), basic({ color: '#d9efff', transparent: true, opacity: 0.75 }), 110);
  const rain = Array.from({ length: 110 }, () => ({ x: -4.8 + R() * 7.5, z: -6.2 + R() * 6.8, o: R() * 7 }));
  const chunkI = instanced(ctx, new THREE.DodecahedronGeometry(1, 0), lib.soil({ color: '#c98a5a' }), 16);
  chunkI.mesh.castShadow = true;
  const chunks = Array.from({ length: 16 }, (_, i) => {
    const left = i < 8, r = 0.2 + R() * 0.2;
    const x0 = left ? -3 + 0.12 + R() * 0.15 : 3 - 0.12 - R() * 0.15;
    const x1 = left ? -2.7 + R() * 1.1 : 2.0 + R() * 0.8;
    return { r, x0, y0: -0.12 - R() * 0.5, x1, y1: bottomAt(P, x1) + r * 0.6, z: -0.5 - R() * 5, f: 0.3 + (i % 8) * 0.035 + (left ? 0 : 0.02), spin: (R() - 0.5) * 6 };
  });

  // ---------------- rebar ----------------
  const rebarMat = lib.std({ color: '#7d4a2e', roughness: 0.55, metalness: 0.35 });
  const rodPts = samplePolyline(REB, 0.36);
  const rods = rodPts.map(q => {
    const m = add(new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, D - 0.3, 6), rebarMat), true, false);
    m.rotation.x = Math.PI / 2;
    return { m, q };
  });
  const hoopGeo = new THREE.TubeGeometry(roundedPath(REB.map(([x, y]) => [x, y, 0]), 0.06), 90, 0.024, 6, false);
  const hoops = [];
  for (let z = -0.35; z > -D + 0.3; z -= 0.48) hoops.push(add(new THREE.Mesh(hoopGeo, rebarMat), true, false));
  hoops.forEach((m, j) => { m.userData.z = -0.35 - j * 0.48; });

  // ---------------- gunite shell ----------------
  const shellPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), -3.3);
  const shellMat = lib.std({ map: lib.tex.concrete, roughness: 0.85, side: THREE.DoubleSide, clippingPlanes: [shellPlane] });
  add(new THREE.Mesh(wallGeometry(SH, -0.02, -D + 0.16), shellMat));
  add(new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(SH)), shellMat)).position.z = -D + 0.16;
  add(new THREE.Mesh(new THREE.ShapeGeometry(shapeOf([...P, ...[...SH].reverse()])), shellMat), false, false).position.z = 0.012;
  for (const [x, w, z, d] of [[-2.92, 0.16, -D / 2, D], [2.92, 0.16, -D / 2, D], [0, 6, -D + 0.08, 0.16]]) {
    add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d), shellMat)).position.set(x, 0.006, z);
  }
  const nozzle = new THREE.Group();
  const noz1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.6, 12), lib.std({ color: '#4a4f57', metalness: 0.4, roughness: 0.4 }));
  const noz2 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.12, 12), lib.std({ color: '#d14b2a' }));
  noz2.position.y = -0.34; nozzle.add(noz1, noz2); nozzle.scale.setScalar(1.6); scene.add(nozzle);
  const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8).translate(0, 0.5, 0), lib.std({ color: '#222222' }));
  scene.add(hose);
  const sprayI = instanced(ctx, new THREE.SphereGeometry(0.06, 6, 5), lib.std({ color: '#a8acb2' }), 72);
  const spray = Array.from({ length: 72 }, () => ({ ph: R(), dx: (R() - 0.5) * 0.7, dz: (R() - 0.5) * 1.2 }));

  // ---------------- leaks ----------------
  const leakPts = samplePolyline(P, 0.28).filter(q => q.y < -0.35);
  const dropI = instanced(ctx, new THREE.SphereGeometry(0.05, 8, 6), basic({ color: '#5fc6ff' }), 40);
  const drops = Array.from({ length: 40 }, (_, i) => ({ q: leakPts[Math.floor(R() * leakPts.length)], ph: R(), d: 0.5 + R() * 0.5 }));
  const stainI = instanced(ctx, new THREE.CircleGeometry(1, 20), basic({ color: '#3a1b08', transparent: true, opacity: 0.32, depthWrite: false }), 28);
  const stains = Array.from({ length: 28 }, () => { const q = leakPts[Math.floor(R() * leakPts.length)]; const o = 0.08 + R() * 0.45; return { x: q.x - q.nx * o, y: q.y - q.ny * o, r: 0.18 + R() * 0.32, f: R() * 0.4 }; });

  // ---------------- plaster ----------------
  const plasterPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), -3.3);
  const plasterMat = lib.std({ map: lib.tex.plaster, roughness: 0.5, side: THREE.DoubleSide, clippingPlanes: [plasterPlane] });
  add(new THREE.Mesh(wallGeometry(PL, -0.03, -D + 0.2), plasterMat));
  add(new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(PL)), plasterMat)).position.z = -D + 0.2;
  add(new THREE.Mesh(new THREE.ShapeGeometry(shapeOf([...SH, ...[...PL].reverse()])), plasterMat), false, false).position.z = 0.014;
  const trowelLine = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 3, 0.02), basic({ color: '#ffffff', transparent: true, opacity: 0.9 })), false, false);

  // ---------------- coping ----------------
  const blocks = [];
  for (let i = 0; i < 12; i++) blocks.push({ x: -2.9, z: -0.25 - i * 0.5, o: i }, { x: 2.9, z: -0.25 - i * 0.5, o: i + 0.5 });
  for (let i = 0; i < 12; i++) blocks.push({ x: -2.75 + i * 0.5, z: -D + 0.1, o: 12 + Math.abs(i - 5.5) * 0.4 });
  const copeI = instanced(ctx, new THREE.BoxGeometry(0.5, 0.12, 0.5), lib.std({ color: '#d9cdb4', roughness: 0.8 }), blocks.length);
  copeI.mesh.castShadow = copeI.mesh.receiveShadow = true;

  // ---------------- water ----------------
  const waterPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), -2.3);
  const waterMat = new THREE.MeshStandardMaterial({ color: '#2fa9e6', transparent: true, opacity: 0.8, roughness: 0.12, clippingPlanes: [waterPlane], depthWrite: false, emissive: '#2fd0ff', emissiveIntensity: 0 });
  const water = add(new THREE.Mesh(extrude(PL, D - 0.27), waterMat), false, false);
  water.position.z = -D + 0.22;
  const surfMat = new THREE.MeshStandardMaterial({ color: '#8fdcff', transparent: true, opacity: 0.85, roughness: 0.05, depthWrite: false, emissive: '#7fe8ff', emissiveIntensity: 0 });
  const surf = add(new THREE.Mesh(new THREE.PlaneGeometry(1, D - 0.27), surfMat), false, false);
  surf.rotation.x = -Math.PI / 2; surf.position.z = (-D + 0.22 - 0.05) / 2;
  const lip = add(new THREE.Mesh(new THREE.PlaneGeometry(1, 0.05), basic({ color: '#e9fbff' })), false, false);
  lip.position.z = -0.04;
  const hoseStream = add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1, 10).translate(0, -0.5, 0), new THREE.MeshStandardMaterial({ color: '#9fe2ff', transparent: true, opacity: 0.8 })), false, false);
  const hoseEnd = add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 10), lib.std({ color: '#2f8f3a' })), true, false);
  const levelFn = t => {
    if (t >= tl.start('fill')) return lerp(-2.28, -0.2, smooth(tl.start('fill'), tl.at('green', 0.3), t));
    if (t >= tl.start('seep') && t < tl.start('plaster')) return lerp(lerp(-2.28, -1.6, tl.p('seep', 0, 0.22)), -2.12, tl.p('seep', 0.4, 1));
    return null;
  };
  const algaeI = instanced(ctx, new THREE.SphereGeometry(0.035, 6, 5), basic({ color: '#4a7d14' }), 70);
  const algae = Array.from({ length: 70 }, (_, i) => { const x = -2.7 + R() * 5.4; return { x, y: bottomAt(PL, x) + 0.06 + R() * (Math.abs(bottomAt(PL, x)) - 0.45), z: i < 40 ? -0.1 - R() * 0.25 : -0.4 - R() * 5.2, ph: R() * 6.28 }; });

  // ---------------- pump, filter, pipes ----------------
  const Z = 0.07, ZB = -0.6;
  const pad = add(new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.08, 1.5), lib.mat.concrete), false, true);
  pad.position.set(6.25, 0.04, -0.95);
  const pump = new THREE.Group();
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.55, 20), lib.std({ color: '#3b4350', metalness: 0.3, roughness: 0.5 }));
  motor.rotation.z = Math.PI / 2; motor.position.set(0.3, 0, 0);
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.42, 20), lib.std({ color: '#2a6cb3', roughness: 0.4 }));
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.06, 20), lib.std({ color: '#cfd8e3', roughness: 0.4, transparent: true, opacity: 0.9 }));
  lid.position.y = 0.24;
  pump.add(motor, housing, lid); pump.position.set(5.1, 0.32, ZB);
  pump.traverse(o => { o.castShadow = true; }); scene.add(pump);
  const filter = new THREE.Group();
  const tankMat = lib.std({ color: '#e7dcc2', roughness: 0.5, side: THREE.DoubleSide });
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.15, 32, 1, true, Math.PI / 2, Math.PI), tankMat);
  tank.position.y = 0.58;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 12, Math.PI / 2, Math.PI, 0, Math.PI / 2), tankMat);
  dome.position.y = 1.155;
  const sand = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.46, 32, 1, false, Math.PI / 2, Math.PI), lib.std({ color: '#d8b77c' }));
  sand.position.y = 0.25;
  const sandFace = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.46), lib.std({ color: '#cfa967' }));
  sandFace.position.set(0, 0.25, 0.001);
  const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16), lib.std({ color: '#ffffff' }));
  gauge.position.set(0, 1.6, 0); gauge.rotation.x = Math.PI / 2;
  const gStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 8), lib.std({ color: '#999999' }));
  gStem.position.set(0, 1.55, 0);
  filter.add(tank, dome, sand, sandFace, gauge, gStem); filter.position.set(6.55, 0.08, ZB);
  filter.traverse(o => { o.castShadow = true; }); scene.add(filter);
  const heater = new THREE.Group();
  const hbox = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.85, 0.62), lib.std({ color: '#9aa4ae', metalness: 0.2, roughness: 0.5 }));
  const flameMat = new THREE.MeshStandardMaterial({ color: '#331100', emissive: '#ff7a1a', emissiveIntensity: 0 });
  const flame = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.22), flameMat);
  flame.position.set(0, -0.1, 0.312);
  const vent = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.06, 0.66), lib.std({ color: '#6c757e' }));
  vent.position.y = 0.45;
  heater.add(hbox, flame, vent); heater.position.set(7.3, 0.5, ZB);
  heater.traverse(o => { o.castShadow = true; }); scene.add(heater);

  const drain = makePipe(ctx, [[2.0, -2.3, Z], [2.0, -3.05, Z], [5.3, -3.05, Z], [5.3, 0.32, Z], [5.3, 0.32, ZB + 0.24]], { dots: 24 });
  const skim = makePipe(ctx, [[3.0, -0.24, Z], [4.92, -0.24, Z], [4.92, 0.32, Z], [4.92, 0.32, ZB + 0.24]], { dots: 12 });
  const toFilter = makePipe(ctx, [[5.62, 0.32, ZB], [6.16, 0.32, ZB]], { dots: 4 });
  const ret = makePipe(ctx, [[6.97, 0.98, ZB], [7.3, 0.98, ZB], [7.3, -0.75, ZB], [7.3, -0.75, Z], [2.86, -0.75, Z]], { dots: 26 });
  const fittings = [
    add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.3), lib.std({ color: '#2b2f35' }))),                 // drain grate
    add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.34), lib.std({ color: '#f4f4f0' }))),               // skimmer
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.12, 12), lib.std({ color: '#f4f4f0' }))),      // return jet
  ];
  fittings[0].position.set(2.0, -2.3, -0.12);
  fittings[1].position.set(2.93, -0.24, -0.14);
  fittings[2].position.set(2.8, -0.75, Z); fittings[2].rotation.z = Math.PI / 2;
  const leafPath = roundedPath([[2.35, -0.2, -0.55], [3.0, -0.24, Z], [4.92, -0.24, Z], [4.92, 0.32, Z], [4.92, 0.32, ZB], [6.2, 0.32, ZB], [6.5, 0.8, ZB + 0.15]], 0.15);
  const leafI = instanced(ctx, new THREE.CircleGeometry(0.085, 10), lib.std({ color: '#ffffff', side: THREE.DoubleSide }), 7);
  const leafCols = ['#6b8e23', '#8a6a2a', '#7da13a', '#9b5a24', '#5f8a2b', '#a07a35', '#6f9a33'];
  leafCols.forEach((c, i) => leafI.mesh.setColorAt(i, new THREE.Color(c)));
  const jetI = instanced(ctx, new THREE.SphereGeometry(0.04, 6, 5), basic({ color: '#ffffff', transparent: true, opacity: 0.85 }), 22);
  const jets = Array.from({ length: 22 }, () => ({ ph: R(), dy: (R() - 0.5) * 0.5, dz: R() }));

  // ---------------- chlorine, sun, stabilizer ----------------
  const puck = add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.07, 20), lib.std({ color: '#f7fbff' })), true, false);
  const sparkI = instanced(ctx, new THREE.OctahedronGeometry(0.04, 0), basic({ color: '#eafcff' }), 48);
  const sparks = Array.from({ length: 48 }, (_, i) => { const x = -2.6 + R() * 5.2; return { x, y: bottomAt(PL, x) + 0.1 + R() * (Math.abs(bottomAt(PL, x)) - 0.5), z: i < 30 ? -0.1 - R() * 0.2 : -0.4 - R() * 5, ph: R() * 6.28 }; });
  const sun = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), basic({ color: '#ffe066', fog: false, transparent: true }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: lib.tex.glow, color: '#ffcf40', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.scale.set(3.6, 3.6, 1);
  sun.add(core, halo); scene.add(sun);
  const SUN = new THREE.Vector3(2.6, 5.4, -3.5);
  const rays = [[-1.8, -1.2], [-0.6, -2.4], [0.5, -1.0], [1.4, -3.2], [2.2, -1.8]].map(([x, z]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1, 0.02).translate(0, 0.5, 0), basic({ color: '#ffe680', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(m);
    return { m, x, z };
  });
  const hexTex = lib.tex.hex;
  const shield = add(new THREE.Mesh(new THREE.PlaneGeometry(5.7, 5.8), basic({ map: hexTex, color: '#7ff3ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })), false, false);
  shield.rotation.x = -Math.PI / 2; shield.position.set(0, 0.3, -D / 2);

  // ---------------- cold, heat, night ----------------
  const frostI = instanced(ctx, new THREE.OctahedronGeometry(0.055, 0), basic({ color: '#ffffff' }), 44);
  const frost = Array.from({ length: 44 }, () => ({ x: -2.6 + R() * 5.2, z: -0.2 - R() * 5.4, r: R() * 3 }));
  const steam = Array.from({ length: 18 }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: lib.tex.glow, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    scene.add(s);
    return { s, x: -2.4 + R() * 4.8, z: -0.5 - R() * 5, ph: R() };
  });
  const lampMat = new THREE.MeshBasicMaterial({ color: '#7a8a90' });
  const lamp = add(new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), lampMat), false, false);
  lamp.position.set(2.0, -1.55, -D + 0.215);
  const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: lib.tex.glow, color: '#8ff4ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  lampGlow.position.set(2.0, -1.55, -D + 0.3); lampGlow.scale.set(2.4, 2.4, 1); scene.add(lampGlow);
  const poolLight = new THREE.PointLight('#6fe8ff', 0, 11, 1.4);
  poolLight.position.set(2.0, -1.4, -D + 1.4); scene.add(poolLight);

  // ---------------- the duck ----------------
  const duck = makeDuck(ctx);
  duck.group.scale.setScalar(0.85);
  const ring = add(new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.14, 14, 36), lib.std({ color: '#ff6fa8', roughness: 0.35 })), true, false);
  ring.rotation.x = Math.PI / 2;

  // ---------------- camera ----------------
  ctx.shots([
    { at: 0, offset: 0, pos: [-0.4, 5.5, 21], look: [-0.3, -1.2, -2.5], push: 0.07 },
    { at: 'cavein', pos: [-1.6, 2.6, 14], look: [-1.6, -1.0, -2] },
    { at: 'rebar', pos: [0.2, 5.8, 17.5], look: [0.1, -1.3, -2.6] },
    { at: 'spray', pos: [-0.4, 4.0, 15.5], look: [-0.2, -1.4, -2.2] },
    { at: 'gunite', pos: [0.4, 5.5, 17.5], look: [0.3, -1.3, -2.6] },
    { at: 'seep', pos: [1.0, 1.0, 15], look: [1.1, -1.8, -1] },
    { at: 'plaster', pos: [0.0, 5.2, 17.5], look: [0.0, -1.3, -2.6] },
    { at: 'coping', pos: [0.0, 7.5, 17], look: [0.0, -0.5, -3], fov: 36 },
    { at: 'fill', pos: [0.0, 5.0, 18], look: [0.0, -1.1, -2.6] },
    { at: 'green', pos: [0.5, 3.6, 14.5], look: [0.5, -1.2, -2.4] },
    { at: 'pipes', pos: [3.3, 3.6, 25], look: [3.4, -1.3, -1] },
    { at: 'filter', pos: [5.9, 2.4, 12], look: [6.0, 0.3, -0.6], blend: 1.0 },
    { at: 'filter', offset: 3.2, pos: [3.6, 3.4, 23], look: [3.6, -1.1, -1], blend: 1.2 },
    { at: 'nokill', pos: [1.2, 3.4, 16], look: [1.0, -1.2, -2] },
    { at: 'chlorine', pos: [-0.4, 3.8, 14.5], look: [-0.2, -1.1, -2.2] },
    { at: 'sun', pos: [0.6, 2.6, 21], look: [0.8, 0.9, -2.5], blend: 0.9 },
    { at: 'stabilizer', pos: [0.4, 3.4, 20], look: [0.5, 0.0, -2.8] },
    { at: 'cold', pos: [0.1, 2.0, 8.5], look: [0.4, -0.3, -1.6] },
    { at: 'heater', pos: [4.4, 3.4, 17], look: [4.3, -0.5, -1] },
    { at: 'light', pos: [0.0, 5.0, 20], look: [0.0, -1.2, -2.6] },
    { at: 'end', pos: [0.0, 6.5, 23], look: [0.0, -1.0, -2.8], push: 0.08 },
  ]);

  const tmpV = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);

  return t => {
    // ---- dig
    const dig = digAt(t);
    digPlane.constant = dig;
    const digging = dig > -2.5;
    earth.visible = earthTop.visible = digging;
    const sp = xSpanAt(P, Math.min(dig, -0.0001));
    if (sp) { earthTop.scale.x = sp[1] - sp[0]; earthTop.position.x = (sp[0] + sp[1]) / 2; }
    earthTop.position.y = dig - 0.002;
    const g = tl.p('dig', 0.05, 1);
    pile.scale.set(0.25 + 0.75 * g, 0.04 + 0.96 * g, 0.25 + 0.75 * g);
    clods.forEach((c, i) => {
      const t0 = tl.at('dig', c.f), k = t - t0;
      if (k <= 0 || k > 1.2) return clodI.hide(i);
      const y = Math.max(digAt(t0), -2.4) + 0.15 + c.vy * k - 4.9 * k * k;
      if (k > 0.5 && y < 0.05) return clodI.hide(i);
      clodI.set(i, c.x0 + c.vx * k, y, c.z + c.vz * k, c.s, k * c.spin, k * c.spin * 0.7, 0);
    });
    clodI.done();

    // ---- cave-in
    const rainK = tl.p('cavein', 0, 0.08) * (1 - tl.p('cavein', 0.45, 0.6));
    rain.forEach((r, i) => {
      if (rainK < 0.01) return rainI.hide(i);
      rainI.set(i, r.x - 0.6 * ((t * 9 + r.o) % 7) * 0.08, 6.5 - ((t * 9 + r.o) % 7), r.z, 1, 0, 0, 0.08, rainK);
    });
    rainI.done();
    const wet = tl.p('cavein', 0.05, 0.4) * (1 - tl.p('rebar', 0, 0.3));
    yard.pitMat.color.copy(mixColor('#ffffff', '#a08672', wet));
    const clear = 1 - tl.p('rebar', 0.02, 0.22);
    chunks.forEach((c, i) => {
      const k = clamp01((t - tl.at('cavein', c.f)) / 0.55);
      if (!tl.on('cavein') || t < tl.at('cavein', c.f) || clear <= 0.01) return chunkI.hide(i);
      const e = k * k;
      chunkI.set(i, lerp(c.x0, c.x1, k), lerp(c.y0, c.y1, e), c.z, c.r * clear, k * c.spin, k * c.spin * 0.5, k * 0.8, c.r * 0.7 * clear, c.r * clear);
    });
    chunkI.done();

    // ---- rebar
    const reb = tl.on('rebar');
    rods.forEach(({ m, q }, i) => {
      const f = 0.06 + 0.5 * (i / rods.length), e = tl.p('rebar', f, f + 0.14);
      m.visible = reb && e > 0.001;
      m.position.set(q.x, q.y + (1 - e) * 0.9, -D / 2 - 0.02);
    });
    hoops.forEach((m, j) => {
      const f = 0.32 + 0.55 * (j / hoops.length), e = tl.p('rebar', f, f + 0.12);
      m.visible = reb && e > 0.001;
      m.position.set(0, (1 - e) * 0.9, m.userData.z);
    });

    // ---- gunite
    const sweep = lerp(-3.3, 3.3, tl.p('spray', 0.04, 0.96));
    shellPlane.constant = tl.on('spray') ? sweep : -3.3;
    shellMat.color.copy(mixColor('#6e737a', '#ffffff', tl.p('gunite', 0.15, 0.85)));
    const spraying = tl.on('spray') && t < tl.at('spray', 1) + 0.15;
    nozzle.visible = hose.visible = spraying;
    sprayI.mesh.visible = spraying;
    if (spraying) {
      const nx = Math.max(-2.8, Math.min(2.8, sweep));
      const floor = bottomAt(SH, Math.max(-2.83, Math.min(2.83, nx)));
      const ny = floor + 1.0, nz = -1.4;
      nozzle.position.set(nx, ny, nz); nozzle.rotation.z = 0.25;
      tmpV.set(-2.6, 0.3, -2.2);
      const dir = new THREE.Vector3(nx - tmpV.x, ny + 0.3 - tmpV.y, nz - tmpV.z);
      hose.position.copy(tmpV); hose.quaternion.setFromUnitVectors(UP, dir.clone().normalize()); hose.scale.set(1, dir.length(), 1);
      spray.forEach((s, i) => {
        const q = (t * 3.2 + s.ph) % 1;
        const tx = Math.max(-2.83, Math.min(2.83, nx + s.dx));
        sprayI.set(i, lerp(nx - 0.08, tx, q), lerp(ny - 0.62, bottomAt(SH, tx) + 0.03, q), lerp(nz, nz + s.dz, q), 1 - q * 0.4);
      });
      sprayI.done();
    }

    // ---- water level (leak test, then the real fill)
    const level = levelFn(t);
    const hasWater = level !== null;
    water.visible = surf.visible = lip.visible = hasWater;
    if (hasWater) {
      waterPlane.constant = level;
      const ws = xSpanAt(PL, level) || [-2.8, 2.8];
      surf.scale.x = lip.scale.x = ws[1] - ws[0];
      surf.position.x = lip.position.x = (ws[0] + ws[1]) / 2;
      surf.position.y = level; lip.position.y = level;
    }
    const filling = tl.on('fill') && t < tl.at('green', 0.3);
    hoseStream.visible = hoseEnd.visible = filling;
    if (filling) {
      hoseEnd.position.set(-1.6, 1.9, -2.6); hoseEnd.rotation.z = 0.5;
      hoseStream.position.set(-1.55, 1.75, -2.6); hoseStream.scale.y = 1.75 - level;
    }

    // ---- leaks
    const leaking = tl.on('seep') && !tl.on('plaster') && tl.p('seep', 0.3, 0.45) > 0;
    drops.forEach((d, i) => {
      if (!leaking || d.q.y > (level ?? -9)) return dropI.hide(i);
      const q = ((t - tl.start('seep')) * 0.7 + d.ph) % 1;
      dropI.set(i, d.q.x - d.q.nx * (0.05 + q * d.d), d.q.y - d.q.ny * (0.05 + q * d.d), 0.05, (1 - q) * tl.p('seep', 0.3, 0.45));
    });
    dropI.done();
    const stainK = tl.p('seep', 0.32, 1) * (1 - tl.p('plaster', 0.2, 0.8));
    stains.forEach((s, i) => {
      const k = clamp01((stainK - s.f) / (1 - s.f));
      if (k < 0.01) return stainI.hide(i);
      stainI.set(i, s.x, s.y, 0.006, s.r * k, 0, 0, 0, s.r * k * 0.8);
    });
    stainI.done();

    // ---- plaster
    const psweep = lerp(-3.3, 3.3, tl.p('plaster', 0.04, 0.85));
    plasterPlane.constant = tl.on('plaster') ? psweep : -3.3;
    trowelLine.visible = tl.on('plaster') && tl.p('plaster', 0.04, 0.85) < 1 && tl.p('plaster', 0.04, 0.85) > 0;
    trowelLine.position.set(psweep, -1.2, 0.03);

    // ---- coping
    const maxO = Math.max(...blocks.map(b => b.o));
    blocks.forEach((b, i) => {
      const f = 0.04 + 0.62 * (b.o / maxO), k = tl.lin('coping', f, f + 0.13);
      if (!tl.on('coping') || k <= 0) return copeI.hide(i);
      copeI.set(i, b.x, lerp(1.6, 0.06, easeOutBounce(k)), b.z);
    });
    copeI.done();

    // ---- water colour story: clear -> green -> clear -> cold -> warm -> lit at night
    const greenK = tl.p('green', 0.15, 0.8) * (1 - tl.p('chlorine', 0.1, 0.95));
    const sunK = 0.45 * tl.p('sun', 0.25, 1) * (1 - tl.p('stabilizer', 0.1, 0.7));
    const coldK = tl.p('cold', 0, 0.8) * (1 - tl.p('heater', 0.15, 1));
    const nightK = tl.p('light', 0.05, 0.45);
    const lightOn = tl.p('light', 0.5, 0.66);
    waterMat.color.copy(mixColor('#2fa9e6', '#7b9e2b', greenK + sunK).lerp(new THREE.Color('#a8e2f5'), coldK));
    surfMat.color.copy(mixColor('#8fdcff', '#a8c45a', greenK + sunK).lerp(new THREE.Color('#e6f8ff'), coldK));
    waterMat.opacity = 0.78 + 0.14 * greenK;
    waterMat.emissiveIntensity = 0.75 * lightOn; surfMat.emissiveIntensity = 0.45 * lightOn;
    algae.forEach((a, i) => {
      if (!hasWater || greenK < 0.02 || a.y > level - 0.04) return algaeI.hide(i);
      algaeI.set(i, a.x + 0.05 * Math.sin(t * 0.8 + a.ph), a.y + 0.05 * Math.sin(t * 1.1 + a.ph), a.z, greenK);
    });
    algaeI.done();

    // ---- pipes and equipment
    const pumpK = easeOutBack(tl.lin('pipes', 0.38, 0.6));
    pump.visible = pad.visible = tl.p('pipes', 0.3, 0.45) > 0;
    pump.scale.setScalar(Math.max(0.001, pumpK));
    pad.scale.set(1, Math.max(0.001, tl.p('pipes', 0.3, 0.45)), 1);
    drain.grow(tl.p('pipes', 0.06, 0.55));
    skim.grow(tl.p('pipes', 0.48, 0.85));
    fittings[0].visible = tl.p('pipes', 0.02, 0.1) > 0;
    fittings[1].visible = tl.p('pipes', 0.45, 0.5) > 0;
    const fK = easeOutBack(tl.lin('filter', 0, 0.14));
    filter.visible = fK > 0; filter.scale.setScalar(Math.max(0.001, fK));
    toFilter.grow(tl.p('filter', 0.06, 0.2));
    ret.grow(tl.p('filter', 0.16, 0.48));
    fittings[2].visible = tl.p('filter', 0.44, 0.48) > 0;
    const flowOn = tl.p('filter', 0.3, 0.42);
    drain.flow(t, flowOn); skim.flow(t, flowOn); toFilter.flow(t, flowOn, 0.8); ret.flow(t, flowOn);
    const heatK = tl.p('heater', 0.2, 0.7);
    ret.mat.color.copy(mixColor('#62bdf5', '#ff8a3d', heatK));
    const hK = easeOutBack(tl.lin('heater', 0, 0.3));
    heater.visible = hK > 0; heater.scale.setScalar(Math.max(0.001, hK));
    flameMat.emissiveIntensity = 2.2 * heatK * (0.85 + 0.15 * Math.sin(t * 13));
    for (let i = 0; i < 7; i++) {
      if (!tl.on('green')) { leafI.hide(i); continue; }
      const ts = tl.at('filter', 0.14 + i * 0.07), u = clamp01((t - ts) / 1.7);
      if (t < ts) leafI.set(i, 2.3 - i * 0.28, (level ?? -0.2) + 0.01, -0.5 - (i % 3) * 0.45, 1, -Math.PI / 2, 0, i, 0.55);
      else if (u < 1) { const q = leafPath.getPointAt(u); leafI.set(i, q.x, q.y, q.z, 1, t * 3 + i, t * 2, i); }
      else leafI.set(i, 6.42 + (i % 3) * 0.09, 0.74 + i * 0.02, ZB + 0.2, 1, -Math.PI / 2.3, 0.2 * i, i);
    }
    leafI.done();
    jetI.mesh.material.color.copy(mixColor('#ffffff', '#86c23a', greenK));
    jets.forEach((j, i) => {
      if (flowOn < 0.5 || !tl.p('filter', 0.47, 0.5)) return jetI.hide(i);
      const q = (t * 1.2 + j.ph) % 1;
      jetI.set(i, 2.78 - q * 1.5, -0.75 + j.dy * q, -0.06 - q * j.dz * 0.6, 1 - q);
    });
    jetI.done();

    // ---- chlorine, sun, stabilizer
    const drop = tl.p('chlorine', 0, 0.45), sink = tl.p('chlorine', 0.45, 1) + tl.p('sun', 0, 0.3);
    puck.visible = tl.on('chlorine') && sink < 1.9;
    puck.position.set(-1.2, lerp(2.4, (level ?? -0.2) - 0.03, drop * drop) - sink * 0.6, -1.0);
    puck.scale.setScalar(Math.max(0.001, 1 - sink / 2));
    let chl = tl.p('chlorine', 0.2, 0.9) * (1 - 0.85 * tl.p('sun', 0.25, 0.95));
    if (tl.on('stabilizer')) chl = Math.max(chl, tl.p('stabilizer', 0.25, 0.8));
    const nSpark = Math.floor(chl * sparks.length);
    sparks.forEach((s, i) => {
      if (i >= nSpark || !hasWater) return sparkI.hide(i);
      sparkI.set(i, s.x, s.y + 0.04 * Math.sin(t + s.ph), s.z, 0.6 + 0.4 * Math.sin(t * 6 + s.ph), t + s.ph, t * 0.7, 0);
    });
    sparkI.done();
    const sunVis = tl.p('sun', 0, 0.22) * (1 - tl.p('cold', 0, 0.5));
    sun.visible = sunVis > 0.01;
    sun.position.set(SUN.x, SUN.y + (1 - sunVis) * 1.5, SUN.z);
    core.material.opacity = sunVis; halo.material.opacity = sunVis;
    const shieldK = tl.p('stabilizer', 0.05, 0.35) * (1 - tl.p('cold', 0, 0.6));
    shield.material.opacity = 0.9 * shieldK * (0.85 + 0.15 * Math.sin(t * 5));
    shield.position.y = (level ?? -0.2) + 0.5;
    hexTex.offset.set(t * 0.05, t * 0.03);
    const rayK = tl.p('sun', 0.12, 0.35) * (1 - tl.p('stabilizer', 0.75, 1));
    rays.forEach((r, i) => {
      r.m.visible = rayK > 0.01;
      if (!r.m.visible) return;
      const endY = shieldK > 0.3 ? shield.position.y : (level ?? -0.2);
      const dir = new THREE.Vector3(r.x - SUN.x, endY - SUN.y, r.z - SUN.z);
      r.m.position.copy(SUN);
      r.m.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
      r.m.scale.set(1, dir.length(), 1);
      r.m.material.opacity = rayK * (0.45 + 0.25 * Math.sin(t * 7 + i * 1.7));
    });

    // ---- cold and heat
    frost.forEach((f, i) => {
      if (coldK < 0.02 || !hasWater) return frostI.hide(i);
      frostI.set(i, f.x, level + 0.02, f.z, coldK, 0, f.r, 0, coldK * 0.4);
    });
    frostI.done();
    const steamK = tl.p('heater', 0.35, 0.8);
    steam.forEach(s => {
      const q = (t * 0.32 + s.ph) % 1;
      s.s.visible = steamK > 0.01 && hasWater;
      s.s.position.set(s.x + 0.2 * Math.sin(t + s.ph * 6), (level ?? -0.2) + 0.1 + q * 1.8, s.z);
      s.s.scale.setScalar(0.4 + 0.9 * q);
      s.s.material.opacity = (1 - q) * 0.4 * steamK * (1 - 0.5 * nightK);
    });

    // ---- night and the pool light
    ctx.setNight(nightK);
    ctx.renderer.toneMappingExposure = lerp(1.05, 1.22, nightK);
    lamp.visible = lampGlow.visible = tl.on('coping');
    lampMat.color.copy(mixColor('#7a8a90', '#e6fdff', lightOn));
    lampGlow.material.opacity = lightOn;
    poolLight.intensity = 28 * lightOn;

    // ---- the duck
    const dk = duck.group;
    const fallStart = tl.at('cavein', 0.28), fall = clamp01((t - fallStart) / 0.7);
    const buried = 1 - tl.p('rebar', 0.05, 0.22);
    if (!tl.on('cavein') || t < fallStart) {
      dk.visible = true;
      dk.position.set(-3.55, 0.02 + 0.03 * Math.abs(Math.sin(t * 2.4)), -0.9);
      dk.rotation.set(0, -0.55, 0);
    } else if (!tl.on('fill')) {
      dk.visible = buried > 0.01;
      dk.position.set(lerp(-3.55, -2.35, fall), lerp(0.02, -1.18, fall * fall) + 0.7 * Math.sin(Math.PI * fall) * (1 - fall), -0.9);
      dk.rotation.set(0, -0.55, -1.7 * fall);
      dk.scale.setScalar(0.85 * Math.max(0.001, buried));
    } else {
      const lv = level ?? -0.2;
      const dropK = clamp01((t - tl.at('fill', 0.15)) / 0.6);
      const floatY = lv - 0.1 + 0.03 * Math.sin(t * 2.3);
      dk.visible = true;
      dk.scale.setScalar(0.85);
      const shiver = 0.03 * Math.sin(t * 70) * coldK;
      dk.position.set(0.4 + 0.15 * Math.sin(t * 0.3) + shiver, dropK < 1 ? lerp(3.4, floatY, dropK * dropK) : floatY, -1.6);
      dk.rotation.set(0, -0.5 + 0.1 * Math.sin(t * 0.4), 0.06 * Math.sin(t * 1.7));
    }
    duck.tint('#a9b93a', greenK * 0.8);
    if (coldK > 0) duck.body.color.lerp(new THREE.Color('#c4e8ff'), coldK * 0.7);
    const ringK = easeOutBack(tl.lin('heater', 0.35, 0.75));
    ring.visible = tl.on('heater') && ringK > 0;
    ring.scale.setScalar(Math.max(0.001, ringK));
    ring.position.set(dk.position.x, (level ?? -0.2) + 0.02, dk.position.z);
    if (ring.visible) dk.position.y += 0.14 * ringK;
  };
}

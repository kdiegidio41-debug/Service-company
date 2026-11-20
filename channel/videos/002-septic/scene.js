// 002 - How a septic tank works. Each block below is keyed to a beat in script.json.
import {
  THREE, smooth, lerp, clamp01, rng, easeOutBack, easeOutBounce, mixColor,
  makePipe, makeDuck, makeLabel, instanced, extrude, wallGeometry,
} from '../../engine/engine.js';

export function build(ctx) {
  const { scene, tl, lib } = ctx;
  const R = rng(21);
  const D = 5;                                                        // excavation length, into the screen
  const P = [[-2.4, 0], [-2.4, -2.6], [2.4, -2.6], [2.4, 0]];          // the hole the tank goes in
  ctx.buildYard({ profile: P, depth: D, rockTop: -5.3 });
  const add = (m, cast = false, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; scene.add(m); return m; };
  const basic = o => new THREE.MeshBasicMaterial(o);
  const Z = 0.07;
  const GW_TOP = -3.85, GW_BOT = -4.85;                                // groundwater band

  // ---------------- groundwater and the well ----------------
  const gwMat = basic({ color: '#2f8fe8', transparent: true, opacity: 0.62, depthWrite: false });
  add(new THREE.Mesh(new THREE.PlaneGeometry(60, GW_TOP - GW_BOT), gwMat), false, false).position.set(0, (GW_TOP + GW_BOT) / 2, 0.003);
  const gwLine = add(new THREE.Mesh(new THREE.PlaneGeometry(60, 0.04), basic({ color: '#bfe6ff' })), false, false);
  gwLine.position.set(0, GW_TOP, 0.004);
  const WX = 8.6;
  add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 5.3, 0.06), lib.std({ color: '#8f969d', metalness: 0.3 })), false, false).position.set(WX, -2.05, 0.04);
  const wellAir = add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 4.1, 0.06), basic({ color: '#2b3440' })), false, false);
  wellAir.position.set(WX, -1.55, 0.05);
  const wellWaterMat = basic({ color: '#4fb0f0' });
  add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.1, 0.06), wellWaterMat), false, false).position.set(WX, -4.15, 0.05);
  const cap = add(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.32, 20), lib.std({ color: '#7d858c', metalness: 0.4 })), true, true);
  cap.position.set(WX, 0.16, -0.25);
  const spigot = add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), lib.std({ color: '#9aa0a6' })), true, false);
  spigot.rotation.z = Math.PI / 2; spigot.position.set(WX - 0.25, 0.24, -0.25);

  // ---------------- the bathroom (a corner of the house) ----------------
  const room = new THREE.Group();
  const tile = lib.std({ color: '#d4e6f0', roughness: 0.5 });
  const floorMat = lib.std({ color: '#ebe4d6', roughness: 0.6 });
  const roomPart = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; room.add(m); return m; };
  roomPart(new THREE.BoxGeometry(2.9, 0.14, 2.7), floorMat, 0, 0.07, -1.35);
  roomPart(new THREE.BoxGeometry(2.9, 2.6, 0.12), tile, 0, 1.3, -2.64);
  roomPart(new THREE.BoxGeometry(0.12, 2.6, 2.7), tile, -1.39, 1.3, -1.35);
  roomPart(new THREE.BoxGeometry(2.9, 0.12, 2.7), lib.std({ color: '#f4f1ea' }), 0, 2.66, -1.35);
  roomPart(new THREE.BoxGeometry(0.9, 0.8, 0.04), lib.mat.trim, 0.2, 1.7, -2.57);
  roomPart(new THREE.BoxGeometry(0.76, 0.66, 0.05), lib.mat.window, 0.2, 1.7, -2.55);
  const white = lib.std({ color: '#fbfbfb', roughness: 0.25 });
  const toilet = new THREE.Group();
  const tPart = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; toilet.add(m); return m; };
  tPart(new THREE.CylinderGeometry(0.17, 0.23, 0.42, 20), white, 0.05, 0.35, 0);
  const bowl = tPart(new THREE.SphereGeometry(0.3, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), white, 0.12, 0.66, 0);
  bowl.scale.set(1.3, 0.8, 1); bowl.material = white.clone(); bowl.material.side = THREE.DoubleSide;
  tPart(new THREE.TorusGeometry(0.3, 0.045, 10, 28), white, 0.12, 0.67, 0).rotation.x = Math.PI / 2;
  toilet.children[toilet.children.length - 1].scale.set(1.3, 1, 1);
  tPart(new THREE.BoxGeometry(0.24, 0.55, 0.58), white, -0.32, 0.98, 0);
  tPart(new THREE.BoxGeometry(0.28, 0.05, 0.62), white, -0.32, 1.28, 0);
  const handle = tPart(new THREE.BoxGeometry(0.14, 0.035, 0.035), lib.std({ color: '#c0c4c8', metalness: 0.7, roughness: 0.3 }), -0.18, 1.16, 0.27);
  const swirlTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); g.fillStyle = '#5ab8ee'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 9;
    for (let a = 0; a < 3; a++) { g.beginPath(); for (let k = 0; k < 120; k++) { const t = k / 120, r = 120 * t, th = a * 2.09 + t * 7; g[k ? 'lineTo' : 'moveTo'](128 + r * Math.cos(th), 128 + r * Math.sin(th)); } g.stroke(); }
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
  })();
  const bowlWaterMat = new THREE.MeshStandardMaterial({ map: swirlTex, roughness: 0.1 });
  const bowlWater = tPart(new THREE.CircleGeometry(0.26, 28), bowlWaterMat, 0.12, 0.55, 0);
  bowlWater.rotation.x = -Math.PI / 2; bowlWater.scale.set(1.3, 1, 1);
  toilet.position.set(-0.05, 0, -1.3); room.add(toilet);
  const puddleMat = basic({ color: '#6e5432', transparent: true, opacity: 0.9 });
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 32), puddleMat);
  puddle.rotation.x = -Math.PI / 2; puddle.position.set(0.2, 0.15, -1.2); room.add(puddle);
  const RX = -5.8;
  room.position.set(RX, 0, 0); scene.add(room);
  const TOILET_X = RX + 0.07;

  // ---------------- house drain, the pit, and the plume ----------------
  const sewer = makePipe(ctx, [[TOILET_X, 0.1, -1.3], [TOILET_X, -0.75, -1.3], [TOILET_X, -0.75, Z], [-2.3, -1.05, Z]], { r: 0.085, color: '#d3d8dd', opacity: 0.95, dots: 22, dotColor: '#6b4a2b' });
  const digPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.02);
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 100);      // once the tank is in, backfill only sits above it
  const earth = add(new THREE.Mesh(extrude(P, D - 0.02), lib.soil({ side: THREE.DoubleSide, clippingPlanes: [digPlane, floorPlane] })));
  earth.position.z = -D + 0.01;
  const earthTop = add(new THREE.Mesh(new THREE.PlaneGeometry(4.8, D - 0.02), lib.soil({ color: '#9a6238' })));
  earthTop.rotation.x = -Math.PI / 2; earthTop.position.z = -D / 2;
  const sewage = add(new THREE.Mesh(new THREE.BoxGeometry(4.78, 1, D - 0.1), lib.std({ color: '#6a5b25', roughness: 0.15 })), false, false);
  sewage.position.z = -D / 2;
  const stainPath = [[0, -2.0], [0.4, -2.8], [1.2, -3.6], [2.4, -4.1], [5, -4.25], [8.6, -4.3]];
  const along = u => { const seg = u * (stainPath.length - 1), i = Math.min(stainPath.length - 2, Math.floor(seg)), f = seg - i; return [lerp(stainPath[i][0], stainPath[i + 1][0], f), lerp(stainPath[i][1], stainPath[i + 1][1], f)]; };
  const plumeI = instanced(ctx, new THREE.CircleGeometry(1, 20), basic({ color: '#2e1f08', transparent: true, opacity: 0.58, depthWrite: false }), 44);
  const plume = Array.from({ length: 44 }, (_, i) => { const u = i / 43, [x, y] = along(u); return { u, x: x + (R() - 0.5) * 0.7, y: y + (R() - 0.5) * 0.5, r: 0.36 + R() * 0.38 }; });

  // ---------------- the tank ----------------
  const tank = new THREE.Group();
  const conc = lib.std({ map: lib.tex.concrete, roughness: 0.85 });
  const slab = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), conc); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; tank.add(m); return m; };
  const TL = 4.62, TZ = 0.02 - TL / 2;
  slab(4.4, 0.15, TL, 0, -0.775, TZ); slab(4.4, 0.15, TL, 0, -2.425, TZ);
  slab(0.15, 1.5, TL, -2.125, -1.6, TZ); slab(0.15, 1.5, TL, 2.125, -1.6, TZ);
  slab(4.1, 1.5, 0.15, 0, -1.6, 0.02 - TL + 0.075);
  const IN_X0 = -2.05, IN_X1 = 2.05, IN_Y0 = -2.35, IN_Y1 = -0.85, IN_D = TL - 0.17;
  const layer = (color, opacity = 1) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(IN_X1 - IN_X0, 1, IN_D), new THREE.MeshStandardMaterial({ color, roughness: 0.4, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }));
    m.position.z = 0.01 - IN_D / 2; tank.add(m); return m;
  };
  const sludge = layer('#4e3418'), liquid = layer('#7a6a45', 0.85), scum = layer('#c9b25c');
  const setLayer = (m, y0, y1) => { const h = Math.max(0.001, y1 - y0); m.visible = y1 - y0 > 0.004; m.scale.y = h; m.position.y = (y0 + y1) / 2; };
  const inletTee = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.55, 12), lib.std({ color: '#d3d8dd' }));
  inletTee.position.set(-1.88, -1.25, Z - 0.02); tank.add(inletTee);
  const baffle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.85, IN_D - 0.1), lib.std({ color: '#9aa0a6' }));
  baffle.position.set(1.72, -1.28, 0.01 - IN_D / 2); tank.add(baffle);
  const lids = [-1.3, 1.3].map(x => add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 24), lib.std({ color: '#2f7d3a', roughness: 0.6 })), true, true));
  lids.forEach((m, i) => m.position.set(i ? 1.3 : -1.3, 0.03, -1.7));
  scene.add(tank);
  const mixI = instanced(ctx, new THREE.DodecahedronGeometry(0.06, 0), lib.std({ color: '#5a3c1c' }), 30);
  const fatI = instanced(ctx, new THREE.SphereGeometry(0.05, 8, 6), lib.std({ color: '#e7cf6a', roughness: 0.3 }), 26);
  const mix = Array.from({ length: 30 }, () => ({ x: -1.8 + R() * 3.6, y: -2.1 + R() * 0.8, z: -0.08 - R() * 0.3, ph: R() * 6.28, f: R() * 0.6 }));
  const fat = Array.from({ length: 26 }, () => ({ x: -1.8 + R() * 3.4, y: -2.1 + R() * 0.8, z: -0.08 - R() * 0.3, ph: R() * 6.28, f: R() * 0.6 }));
  const bugI = instanced(ctx, new THREE.CapsuleGeometry(0.035, 0.07, 4, 8), basic({ color: '#ffffff' }), 24);
  for (let i = 0; i < 24; i++) bugI.mesh.setColorAt(i, new THREE.Color(i % 2 ? '#b863ff' : '#5fe07a'));
  const bugs = Array.from({ length: 24 }, () => ({ x: -1.9 + R() * 3.8, z: -0.06 - R() * 0.12, ph: R() * 6.28 }));
  const dayLabel = makeLabel(ctx, { height: 0.75 });

  // ---------------- outlet, distribution box, drain field ----------------
  const outlet = makePipe(ctx, [[1.94, -1.62, Z], [1.94, -1.3, Z], [3.3, -1.3, Z]], { r: 0.075, color: '#d3d8dd', opacity: 0.95, dots: 8, dotColor: '#c8d6b0' });
  const dbox = add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.6), conc), true, true);
  dbox.position.set(3.55, -1.3, -0.26);
  const gravelTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); g.fillStyle = '#8d8a84'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 520; i++) { g.fillStyle = `hsl(30, ${5 + R() * 10}%, ${40 + R() * 35}%)`; g.beginPath(); g.ellipse(R() * 256, R() * 256, 4 + R() * 7, 3 + R() * 5, R() * 3, 0, 7); g.fill(); }
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(4, 1); return tx;
  })();
  const gravel = add(new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.8, 0.3), lib.std({ map: gravelTex })), false, true);
  gravel.position.set(5.95, -1.35, -0.13);
  const header = makePipe(ctx, [[3.8, -1.3, Z], [8.1, -1.3, Z]], { r: 0.075, color: '#e9ecef', opacity: 1, dots: 14, dotColor: '#c8d6b0' });
  const holeI = instanced(ctx, new THREE.CircleGeometry(0.03, 10), basic({ color: '#2a2a2a' }), 16);
  for (let i = 0; i < 16; i++) holeI.set(i, 4.0 + i * 0.26, -1.33, Z + 0.077);
  holeI.done();
  const dropI = instanced(ctx, new THREE.SphereGeometry(0.045, 8, 6), basic({ color: '#8a7a55' }), 40);
  const cleanI = instanced(ctx, new THREE.SphereGeometry(0.045, 8, 6), basic({ color: '#6fd0ff' }), 40);
  const germI = instanced(ctx, new THREE.OctahedronGeometry(0.05, 0), basic({ color: '#ff4f6d' }), 22);
  const drips = Array.from({ length: 40 }, () => ({ x: 4.0 + R() * 4.0, ph: R(), sway: (R() - 0.5) * 0.4 }));
  const germs = Array.from({ length: 22 }, () => ({ x: 4.0 + R() * 4.0, y: -1.85 - R() * 0.45, f: R() * 0.6 }));

  // ---------------- the greener grass ----------------
  const lushMat = lib.std({ color: '#62b53a' });
  const lush = add(new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.6), lushMat), false, true);
  lush.rotation.x = -Math.PI / 2; lush.position.set(5.95, 0.012, -2.6);
  const tuftI = instanced(ctx, new THREE.ConeGeometry(0.07, 0.32, 5), lib.std({ color: '#2fb844', flatShading: true }), 70);
  tuftI.mesh.castShadow = true;
  const tufts = Array.from({ length: 70 }, () => ({ x: 3.9 + R() * 4.1, z: -0.4 - R() * 4.3, s: 0.7 + R() * 0.8, f: R() * 0.6 }));
  const flowerI = instanced(ctx, new THREE.SphereGeometry(0.07, 10, 8), basic({ color: '#ffffff' }), 14);
  ['#ff6fa8', '#ffd23f', '#ffffff', '#b06bff'].forEach((c, k) => { for (let i = k; i < 14; i += 4) flowerI.mesh.setColorAt(i, new THREE.Color(c)); });
  const flowers = Array.from({ length: 14 }, () => ({ x: 4.0 + R() * 3.9, z: -0.5 - R() * 4.1, f: 0.3 + R() * 0.6 }));

  // ---------------- the pump truck ----------------
  const truck = new THREE.Group();
  const tp = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; truck.add(m); return m; };
  tp(new THREE.BoxGeometry(3.4, 0.3, 1.2), lib.std({ color: '#3a3d42' }), 0.2, 0.55, 0);
  tp(new THREE.BoxGeometry(1.0, 1.05, 1.2), lib.std({ color: '#f1ede4' }), -1.05, 1.2, 0);
  tp(new THREE.BoxGeometry(0.04, 0.42, 1.0), lib.mat.window, -1.56, 1.38, 0);
  tp(new THREE.BoxGeometry(1.02, 0.12, 1.22), lib.std({ color: '#d1452c' }), -1.05, 0.88, 0);
  const tankBody = tp(new THREE.CylinderGeometry(0.58, 0.58, 2.2, 24), lib.std({ color: '#c9ced4', metalness: 0.5, roughness: 0.35 }), 0.75, 1.28, 0);
  tankBody.rotation.z = Math.PI / 2;
  for (const [x, z] of [[-1.0, 0.62], [-1.0, -0.62], [1.2, 0.62], [1.2, -0.62]]) {
    const w = tp(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16), lib.std({ color: '#151515' }), x, 0.3, z);
    w.rotation.x = Math.PI / 2;
  }
  scene.add(truck);
  const hose = makePipe(ctx, [[1.3, 0.08, -1.7], [1.6, 0.5, -1.9], [2.8, 0.75, -2.3], [4.05, 1.0, -2.45]], { r: 0.06, color: '#1c1c1c', opacity: 1, dots: 10, dotColor: '#6b4a2b' });

  // ---------------- the duck ----------------
  const duck = makeDuck(ctx);
  const shades = new THREE.Group();
  for (const s of [-1, 1]) { const g = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.12), basic({ color: '#0d0d0d' })); g.position.set(0.405, 0.77, 0.1 * s); shades.add(g); }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.1), basic({ color: '#0d0d0d' })); bridge.position.set(0.41, 0.79, 0); shades.add(bridge);
  duck.group.add(shades);

  // ---------------- camera ----------------
  ctx.shots([
    { at: 0, offset: 0, pos: [-5.2, 1.9, 6.6], look: [-5.6, 0.75, -1.3], push: 0.05 },
    { at: 'hook', offset: 3.2, pos: [-3.6, 3.0, 15], look: [-3.4, -0.6, -1], blend: 1.1 },
    { at: 'pit', pos: [-1.2, 2.8, 14.5], look: [-1.0, -1.0, -1.2] },
    { at: 'poison', pos: [3.6, 3.2, 30], look: [3.7, -1.7, -1], blend: 1.0 },
    { at: 'tank', pos: [0, 4.4, 17], look: [0, -1.3, -1.5] },
    { at: 'still', pos: [0, 1.2, 14], look: [0, -1.55, -0.6] },
    { at: 'full', pos: [-2.4, 2.6, 27], look: [-2.4, -1.0, -1.2] },
    { at: 'outlet', pos: [1.8, 1.2, 12.5], look: [2.2, -1.4, -0.5] },
    { at: 'field', pos: [5.6, 3.2, 19], look: [5.8, -1.4, -1.0] },
    { at: 'soil', pos: [5.8, 1.0, 22], look: [5.9, -2.7, -0.5] },
    { at: 'greener', pos: [6.0, 4.8, 13], look: [6.0, 0.0, -2.4] },
    { at: 'never', pos: [0, 1.2, 14], look: [0, -1.55, -0.6] },
    { at: 'pumpout', pos: [3.4, 4.6, 20], look: [3.0, -0.2, -2.3] },
    { at: 'end', pos: [2.2, 7.5, 28], look: [2.2, -0.6, -2.4], push: 0.08 },
  ]);

  return t => {
    // ---- hook: the flush
    handle.rotation.z = -0.5 * (tl.p('hook', 0.38, 0.44) - tl.p('hook', 0.5, 0.56));
    const flush = tl.p('hook', 0.42, 0.78);
    bowlWater.rotation.z = -t * 14 * flush * (1 - tl.p('hook', 0.85, 1));
    const sewerOn = tl.p('hook', 0.6, 0.7) * (1 - tl.p('tank', 0, 0.1)) + tl.p('still', 0, 0.1) * (1 - tl.p('outlet', 0.3, 0.5));
    sewer.grow(1);
    sewer.flow(t, clamp01(sewerOn), 1.4);

    // ---- toilet backs up when the tank is full
    const backup = tl.p('full', 0.45, 0.85) * (1 - tl.p('outlet', 0.25, 0.5));
    bowlWaterMat.color.copy(mixColor('#ffffff', '#8a6a3a', backup));
    bowlWater.position.y = 0.55 + 0.1 * backup;
    puddle.visible = backup > 0.6;
    puddle.scale.setScalar(Math.max(0.001, (backup - 0.6) / 0.4 * 0.75));
    sewer.mat.color.copy(mixColor('#d3d8dd', '#8a6a3a', tl.p('full', 0.3, 0.7) * (1 - tl.p('outlet', 0.25, 0.5))));

    // ---- the pit, then the tank's excavation and backfill
    let dig = 0.02;
    if (tl.on('pit') && !tl.on('tank')) dig = lerp(0.02, -1.85, tl.p('pit', 0, 0.35));
    if (tl.on('tank')) {
      const down = tl.p('tank', 0, 0.25), back = tl.p('tank', 0.62, 0.95);
      dig = back > 0 ? lerp(-2.62, 0.02, back) : lerp(-1.85, -2.62, down);
    }
    digPlane.constant = dig;
    const landed = tl.on('tank') && tl.p('tank', 0.6, 0.61) > 0;
    floorPlane.constant = landed ? 0.7 : 100;
    earth.visible = dig > -2.6;
    earthTop.visible = dig > -2.6 && (!landed || dig > -0.72);
    earthTop.position.y = dig - 0.002;
    const sewageLv = tl.on('tank') ? -2.6 + (-1.4 + 2.6) * (1 - tl.p('tank', 0, 0.15)) : lerp(-2.6, -1.4, tl.p('pit', 0.4, 1));
    const showSewage = tl.on('pit') && sewageLv > -2.58;
    sewage.visible = showSewage;
    if (showSewage) { const lo = Math.max(-2.6, dig - 0.01); sewage.scale.y = Math.max(0.001, sewageLv - lo); sewage.position.y = (sewageLv + lo) / 2; }
    const spread = tl.lin('poison', 0.05, 0.85), fade = 1 - tl.p('tank', 0, 0.3);
    plume.forEach((s, i) => {
      const k = clamp01((spread - s.u * 0.9) / 0.12) * fade;
      if (!tl.on('poison') || k < 0.01) return plumeI.hide(i);
      plumeI.set(i, s.x, s.y, 0.006, s.r * k, 0, 0, 0, s.r * k * 0.75);
    });
    plumeI.done();
    wellWaterMat.color.copy(mixColor('#4fb0f0', '#5d4422', tl.p('poison', 0.75, 0.95) * fade));

    // ---- the tank goes in
    const lower = tl.p('tank', 0.22, 0.62);
    tank.visible = tl.on('tank');
    tank.position.y = (1 - lower) * 3.6;
    lids.forEach(m => { m.visible = tl.p('tank', 0.9, 1) > 0; });

    // ---- what happens inside the tank
    let liqTop = IN_Y0;
    liqTop = lerp(liqTop, -1.35, tl.p('still', 0.0, 0.75));
    liqTop = lerp(liqTop, -0.88, tl.p('full', 0.15, 0.6));
    liqTop = lerp(liqTop, -1.35, tl.p('outlet', 0.35, 0.65));
    let sl = 0.42 * tl.p('sludge', 0.1, 0.9);
    sl = lerp(sl, 0.31, tl.p('bacteria', 0.2, 1));
    sl = lerp(sl, 0.62, tl.p('never', 0.1, 0.9));
    sl = lerp(sl, 0.03, tl.p('pumpout', 0.45, 0.95));
    let sc = 0.16 * tl.p('scum', 0.1, 0.9);
    sc = lerp(sc, 0.02, tl.p('pumpout', 0.45, 0.95));
    const sTop = IN_Y0 + sl;
    setLayer(sludge, IN_Y0, Math.min(sTop, liqTop));
    setLayer(liquid, Math.min(sTop, liqTop), liqTop - Math.min(sc, liqTop - sTop));
    setLayer(scum, liqTop - Math.min(sc, Math.max(0, liqTop - sTop)), liqTop);
    const clearK = tl.p('middle', 0.05, 0.7) * (1 - 0.6 * tl.p('full', 0.2, 0.6) * (1 - tl.p('outlet', 0.4, 0.8)));
    liquid.material.color.copy(mixColor('#7a6a45', '#9db3a4', clearK));
    liquid.material.opacity = lerp(0.88, 0.7, clearK);
    const mixing = tl.on('still');
    mix.forEach((m, i) => {
      const sink = tl.p('sludge', m.f * 0.5, m.f * 0.5 + 0.45);
      if (!mixing || sink >= 1 || liqTop < IN_Y0 + 0.2) return mixI.hide(i);
      const y = Math.min(liqTop - 0.08, lerp(m.y + 0.08 * Math.sin(t * 1.7 + m.ph), IN_Y0 + 0.05, sink));
      mixI.set(i, m.x + 0.1 * Math.sin(t + m.ph), y, m.z, 1, t + m.ph, t * 0.6, 0);
    });
    mixI.done();
    fat.forEach((m, i) => {
      const rise = tl.p('scum', m.f * 0.5, m.f * 0.5 + 0.45);
      if (!mixing || rise >= 1 || liqTop < IN_Y0 + 0.2) return fatI.hide(i);
      const y = Math.min(liqTop - 0.05, lerp(m.y + 0.08 * Math.sin(t * 1.3 + m.ph), liqTop - 0.05, rise));
      fatI.set(i, m.x + 0.1 * Math.sin(t * 0.8 + m.ph), y, m.z, 1);
    });
    fatI.done();
    const bugK = tl.p('bacteria', 0, 0.2) * (1 - tl.p('full', 0, 0.3));
    bugs.forEach((b, i) => {
      if (bugK < 0.01) return bugI.hide(i);
      bugI.set(i, b.x + 0.12 * Math.sin(t * 3 + b.ph), sTop + 0.05 + 0.04 * Math.sin(t * 5 + b.ph), b.z, bugK, 0, 0, Math.sin(t * 4 + b.ph) * 0.8 + 1.57);
    });
    bugI.done();
    const fullK = tl.lin('full', 0.1, 0.75);
    dayLabel.set(tl.on('full') && !tl.on('outlet') && fullK > 0 ? `DAY ${Math.min(5, 1 + Math.floor(fullK * 5))}` : '');
    dayLabel.sprite.position.set(0, 0.9, 0.3);

    // ---- outlet and baffle
    const bK = clamp01(tl.lin('outlet', 0.08, 0.3));
    baffle.visible = bK > 0;
    baffle.position.y = -1.28 + (1 - easeOutBounce(bK)) * 1.6;
    outlet.grow(tl.p('outlet', 0.3, 0.55));
    const fieldFlow = tl.p('outlet', 0.55, 0.7);
    outlet.flow(t, fieldFlow, 0.9);
    const dK = easeOutBack(tl.lin('field', 0, 0.15));
    dbox.visible = dK > 0; dbox.scale.setScalar(Math.max(0.001, dK));
    const gK = tl.p('field', 0.1, 0.35);
    gravel.visible = gK > 0; gravel.scale.set(1, Math.max(0.001, gK), 1);
    header.grow(tl.p('field', 0.25, 0.6));
    header.flow(t, tl.p('field', 0.55, 0.7), 0.9);
    holeI.mesh.visible = tl.p('field', 0.55, 0.6) > 0;

    // ---- trickle down through the soil; germs get caught
    const trickle = tl.p('field', 0.7, 0.9);
    drips.forEach((d, i) => {
      const q = (t * 0.42 + d.ph) % 1, y = lerp(-1.4, GW_TOP - 0.05, q), x = d.x + d.sway * q;
      if (trickle < 0.01) { dropI.hide(i); cleanI.hide(i); return; }
      if (y > -2.15) { dropI.set(i, x, y, 0.05, trickle); cleanI.hide(i); } else { cleanI.set(i, x, y, 0.05, trickle); dropI.hide(i); }
    });
    dropI.done(); cleanI.done();
    germs.forEach((g, i) => {
      const k = tl.p('soil', 0.1 + g.f * 0.5, 0.25 + g.f * 0.5);
      if (k <= 0) return germI.hide(i);
      germI.set(i, g.x, lerp(-1.45, g.y, k), 0.06, 1 - 0.4 * tl.p('soil', 0.85, 1), t * 2, t, 0);
    });
    germI.done();
    gwMat.opacity = 0.62 + 0.12 * Math.sin(t * 2) * tl.p('soil', 0.3, 0.6);

    // ---- greener grass
    const lushK = tl.p('greener', 0.05, 0.6);
    lush.visible = lushK > 0.001;
    lushMat.color.copy(mixColor('#62b53a', '#36d94b', lushK));
    tufts.forEach((f, i) => {
      const k = easeOutBack(clamp01((tl.lin('greener', 0.05, 0.7) - f.f * 0.6) / 0.4));
      if (k <= 0) return tuftI.hide(i);
      tuftI.set(i, f.x, 0.16 * f.s * k, f.z, f.s * k, 0, i, 0);
    });
    tuftI.done();
    flowers.forEach((f, i) => {
      const k = easeOutBack(clamp01((tl.lin('greener', 0.3, 1) - f.f * 0.5) / 0.5));
      if (k <= 0) return flowerI.hide(i);
      flowerI.set(i, f.x, 0.32, f.z, k);
    });
    flowerI.done();

    // ---- pump-out truck
    const arrive = tl.p('pumpout', 0, 0.32);
    truck.visible = tl.on('pumpout');
    truck.position.set(lerp(15, 4.4, arrive), 0, -2.6);
    hose.grow(tl.p('pumpout', 0.3, 0.45));
    hose.flow(t, tl.p('pumpout', 0.45, 0.55) * (1 - tl.p('pumpout', 0.95, 1)), 1.2);

    // ---- the duck: sits on the toilet, gets flushed, turns up sunbathing on the drain field
    const dk = duck.group;
    const swirl = tl.p('hook', 0.48, 0.8);
    if (!tl.on('greener')) {
      dk.visible = swirl < 0.98;
      dk.scale.setScalar(0.62 * Math.max(0.001, 1 - swirl));
      dk.position.set(TOILET_X + 0.12, 0.62 - 0.25 * swirl, -1.3);
      dk.rotation.set(0, -0.8 + swirl * 18, 0);
      shades.visible = false;
    } else {
      const pop = easeOutBack(tl.lin('greener', 0.45, 0.7));
      dk.visible = pop > 0;
      dk.scale.setScalar(0.8 * Math.max(0.001, pop));
      dk.position.set(6.2, 0.05, -1.4);
      dk.rotation.set(0, -0.6, 0.45 + 0.04 * Math.sin(t * 1.5));
      shades.visible = true;
    }
  };
}

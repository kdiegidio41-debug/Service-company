// 006 - How a toilet flushes. An indoor side cutaway: the toilet sliced down its middle,
// the floor drains, a sink beside it, and the vent stack in the wall. Keyed to script.json.
import {
  THREE, smooth, lerp, clamp01, rng, easeOutBack, easeOutBounce, mixColor,
  makePipe, makeDuck, instanced, shapeOf,
} from '../../engine/engine.js';

export function build(ctx) {
  const { scene, tl, lib } = ctx;
  const R = rng(66);
  const add = (m, cast = false, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; scene.add(m); return m; };
  const basic = o => new THREE.MeshBasicMaterial(o);
  const V2 = (x, y) => new THREE.Vector2(x, y);
  const curve = pts => new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal');
  // a ribbon either side of a curve, built segment by segment so drawRange can grow it
  const stripGeo = (c, a, b, n = 90) => {
    const pos = [];
    const at = i => { const u = i / n, p = c.getPointAt(u), tg = c.getTangentAt(u), nx = -tg.y, ny = tg.x; return [p.x + nx * a, p.y + ny * a, p.x + nx * b, p.y + ny * b]; };
    for (let i = 0; i < n; i++) { const [ax, ay, bx, by] = at(i), [cx, cy, dx, dy] = at(i + 1); pos.push(ax, ay, 0, bx, by, 0, dx, dy, 0, ax, ay, 0, dx, dy, 0, cx, cy, 0); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.userData.n = n; return g;
  };
  const showStrip = (mesh, u0, u1) => { const n = mesh.geometry.userData.n, a = Math.floor(clamp01(u0) * n), b = Math.ceil(clamp01(u1) * n); mesh.visible = b > a; mesh.geometry.setDrawRange(a * 6, Math.max(0, b - a) * 6); };
  const tileTex = (base, line, size, rx, ry) => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = line; g.lineWidth = 3;
    for (let p = 0; p <= 256; p += size) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 256); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(256, p); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t;
  };

  // ---------------- the room ----------------
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(160, 80), basic({ map: lib.tex.skyDay, fog: false, depthWrite: false }));
  sky.position.set(0, 14, -40); scene.add(sky);
  add(new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.6), lib.std({ map: tileTex('#dfeaf0', '#b9c9d3', 32, 8, 4.5) })), false, true).position.set(1.9, 1.8, -2.2);
  add(new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.25, 2.3), lib.std({ map: tileTex('#efe6d8', '#cdbfa9', 64, 7, 2.4) })), false, true).position.set(1.8, -0.125, -1.15);
  add(new THREE.Mesh(new THREE.PlaneGeometry(6.8, 1.2), basic({ color: '#2f241c' })), false, false).position.set(1.8, -0.85, -1.6);
  add(new THREE.Mesh(new THREE.PlaneGeometry(14, 4), lib.soil()), false, true).position.set(1.8, -3.45, 0);
  add(new THREE.Mesh(new THREE.PlaneGeometry(14, 0.06), basic({ color: '#5a4636' })), false, false).position.set(1.8, -1.43, 0.002);
  const drywall = lib.std({ color: '#f1ede6' });
  add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.7, 2.3), drywall), true, true).position.set(-1.23, 1.6, -1.15);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.7, 2.3), lib.std({ map: lib.tex.siding })), true, true).position.set(-1.57, 1.6, -1.15);
  add(new THREE.Mesh(new THREE.PlaneGeometry(0.28, 3.7), basic({ color: '#3b3128' })), false, false).position.set(-1.4, 1.6, -1.0);
  for (const y of [0.2, 3.0]) add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 2.2), lib.std({ color: '#c8a06a' })), false, true).position.set(-1.4, y, -1.15);
  add(new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.15, 2.4), lib.std({ color: '#ece6da' })), true, true).position.set(0.1, 3.47, -1.1);
  const shTex = lib.tex.shingles.clone(); shTex.repeat.set(2, 1); shTex.needsUpdate = true;
  const roofSlab = add(new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.16, 2.6), lib.std({ map: shTex })), true, true);
  roofSlab.rotation.z = 0.25; roofSlab.position.set(-0.1, 4.2, -1.0);
  const roofY = x => 4.2 + (x + 0.1) * Math.tan(0.25) + 0.08;
  const roomLight = new THREE.PointLight('#fff1d8', 9, 12, 1.2); roomLight.position.set(1.5, 3.0, 1.2); scene.add(roomLight);

  // ---------------- the toilet ----------------
  const ceramic = lib.std({ color: '#f8f8f5', roughness: 0.25 });
  const inside = basic({ color: '#c9d3da' });
  const waterMat = basic({ color: '#58b4ec', transparent: true, opacity: 0.88, side: THREE.DoubleSide });
  const sil = new THREE.Shape();
  sil.moveTo(-0.55, 0); sil.lineTo(0.62, 0); sil.quadraticCurveTo(0.7, 0.55, 1.05, 0.72); sil.quadraticCurveTo(1.5, 0.85, 1.55, 1.2);
  sil.lineTo(1.56, 1.28); sil.lineTo(-0.2, 1.28); sil.lineTo(-0.3, 1.2); sil.quadraticCurveTo(-0.56, 1.0, -0.55, 0.5); sil.lineTo(-0.55, 0);
  const body = add(new THREE.Mesh(new THREE.ExtrudeGeometry(sil, { depth: 0.9, bevelEnabled: false }), ceramic), true, true);
  body.position.z = -0.9;
  add(new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.05, 0.85), lib.std({ color: '#fbfbfb', roughness: 0.3 })), true, true).position.set(0.68, 1.305, -0.45);
  const bowlShape = new THREE.Shape();
  bowlShape.moveTo(1.38, 1.2);
  bowlShape.splineThru([V2(1.2, 1.02), V2(0.9, 0.82), V2(0.55, 0.68), V2(0.33, 0.64), V2(0.16, 0.68), V2(0.06, 0.86), V2(0.0, 1.0), V2(-0.04, 1.2)]);
  bowlShape.lineTo(1.38, 1.2);
  add(new THREE.Mesh(new THREE.ShapeGeometry(bowlShape, 24), inside), false, false).position.z = 0.003;
  const levelPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.92);
  const bowlWater = add(new THREE.Mesh(new THREE.ShapeGeometry(bowlShape, 24), basic({ color: '#58b4ec', transparent: true, opacity: 0.88, clippingPlanes: [levelPlane] })), false, false);
  bowlWater.position.z = 0.006;
  const trap = curve([[0.2, 0.7], [0.02, 0.78], [-0.12, 0.92], [-0.22, 1.02], [-0.32, 0.92], [-0.34, 0.6], [-0.22, 0.25], [-0.05, 0.06], [0.05, -0.06]]);
  let uW = 0, best = -9;
  for (let i = 0; i <= 200; i++) { const p = trap.getPointAt(i / 200); if (p.y > best) { best = p.y; uW = i / 200; } }
  const trapInside = add(new THREE.Mesh(stripGeo(trap, -0.1, 0.1), basic({ color: '#c9d3da', side: THREE.DoubleSide })), false, false);
  trapInside.position.z = 0.003;
  const sealPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.92);
  const trapSeal = add(new THREE.Mesh(stripGeo(trap, -0.095, 0.095), basic({ color: '#58b4ec', transparent: true, opacity: 0.88, side: THREE.DoubleSide, clippingPlanes: [sealPlane] })), false, false);
  trapSeal.position.z = 0.006;
  const trapFull = add(new THREE.Mesh(stripGeo(trap, -0.095, 0.095), waterMat.clone()), false, false);
  trapFull.position.z = 0.007;
  const straight = curve([[0.35, 0.66], [0.35, 0.3], [0.35, -0.06]]);
  const straightInside = add(new THREE.Mesh(stripGeo(straight, -0.1, 0.1, 20), basic({ color: '#c9d3da', side: THREE.DoubleSide })), false, false);
  straightInside.position.z = 0.004;
  const flowI = instanced(ctx, new THREE.CircleGeometry(0.03, 10), basic({ color: '#ffffff' }), 26);
  const bubbleI = instanced(ctx, new THREE.RingGeometry(0.025, 0.04, 14), basic({ color: '#ffffff' }), 14);

  // tank
  const tankSh = new THREE.Shape();
  tankSh.moveTo(-1.08, 1.3); tankSh.lineTo(-0.12, 1.3); tankSh.lineTo(-0.12, 2.72); tankSh.lineTo(-1.08, 2.72); tankSh.lineTo(-1.08, 1.3);
  const tankGroup = new THREE.Group(); scene.add(tankGroup);
  const tankBody = new THREE.Mesh(new THREE.ExtrudeGeometry(tankSh, { depth: 0.9, bevelEnabled: false }), ceramic);
  tankBody.position.z = -0.9; tankBody.castShadow = tankBody.receiveShadow = true; tankGroup.add(tankBody);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.1, 0.95), ceramic); lid.position.set(-0.6, 2.77, -0.45); lid.castShadow = true; tankGroup.add(lid);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.8), ceramic); neck.position.set(-0.45, 1.25, -0.45); tankGroup.add(neck);
  const tIn = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 1.3), inside); tIn.position.set(-0.6, 2.01, 0.003); tankGroup.add(tIn);
  const tankLevel = new THREE.Plane(new THREE.Vector3(0, -1, 0), 2.35);
  const tankWater = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 1.5), basic({ color: '#58b4ec', transparent: true, opacity: 0.85, clippingPlanes: [tankLevel] }));
  tankWater.position.set(-0.6, 2.11, 0.006); tankGroup.add(tankWater);
  const passage = curve([[-0.6, 1.37], [-0.55, 1.27], [-0.35, 1.2], [-0.14, 1.12], [0.0, 1.04]]);
  const passageIn = new THREE.Mesh(stripGeo(passage, -0.055, 0.055, 30), basic({ color: '#c9d3da', side: THREE.DoubleSide })); passageIn.position.z = 0.004; tankGroup.add(passageIn);
  const seat = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.05), basic({ color: '#8f969d' })); seat.position.set(-0.6, 1.39, 0.007); tankGroup.add(seat);
  const flapPivot = new THREE.Group(); flapPivot.position.set(-0.44, 1.43, 0.009); tankGroup.add(flapPivot);
  const flap = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.06), basic({ color: '#d1452c' })); flap.position.set(-0.15, 0, 0); flapPivot.add(flap);
  const overflowTube = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 1.0).translate(0, 0.5, 0), basic({ color: '#eef1f3' })); overflowTube.position.set(-0.38, 1.43, 0.008); tankGroup.add(overflowTube);
  const overflowBore = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 1.0).translate(0, 0.5, 0), basic({ color: '#7d8a94' })); overflowBore.position.set(-0.38, 1.43, 0.0085); tankGroup.add(overflowBore);
  const leverPivot = new THREE.Group(); leverPivot.position.set(-0.19, 2.5, 0.01); tankGroup.add(leverPivot);
  const lever = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.035), basic({ color: '#9aa0a6' })); lever.position.set(-0.25, 0, 0); leverPivot.add(lever);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.05), lib.std({ color: '#c0c4c8', metalness: 0.7, roughness: 0.3 })); handle.position.set(-0.06, 2.5, 0.02); tankGroup.add(handle);
  const chain = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 1).translate(0, -0.5, 0), basic({ color: '#6c757e' })); chain.position.z = 0.01; tankGroup.add(chain);
  const fillTube = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 1.2).translate(0, 0.6, 0), basic({ color: '#7f8b95' })); fillTube.position.set(-0.94, 1.36, 0.008); tankGroup.add(fillTube);
  const valveHead = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.1), basic({ color: '#3f4a54' })); valveHead.position.set(-0.94, 2.6, 0.009); tankGroup.add(valveHead);
    const cup = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.13), basic({ color: '#f2b705' })); cup.position.z = 0.0095; tankGroup.add(cup);
  const sprayI = instanced(ctx, new THREE.CircleGeometry(0.02, 8), basic({ color: '#bfe6ff' }), 18);
  const spillMat = basic({ color: '#58b4ec', transparent: true, opacity: 0.8 });
  const spill = add(new THREE.Mesh(new THREE.PlaneGeometry(0.05, 1).translate(0, -0.5, 0), spillMat), false, false);
  const puddle = add(new THREE.Mesh(new THREE.CircleGeometry(1, 32), lib.std({ color: '#7cc6f0', roughness: 0.05, transparent: true, opacity: 0.8 })), false, false);
  puddle.rotation.x = -Math.PI / 2; puddle.position.set(-0.75, 0.012, -0.5);
  const supply = makePipe(ctx, [[-1.2, 0.5, -0.5], [-0.94, 0.5, -0.5], [-0.94, 1.3, -0.5]], { r: 0.03, color: '#c0c4c8', opacity: 1, dots: 6, dotColor: '#58b4ec' });

  // ---------------- waste, the bucket, the stink ----------------
  const tp = add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 1), lib.std({ color: '#ffffff', flatShading: true })), false, false);
  const blob = add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), lib.std({ color: '#6b4423', roughness: 0.6 })), false, false);
  blob.scale.set(1.5, 0.8, 1);
  const bucket = new THREE.Group();
  const bk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.32, 20, 1, true), lib.std({ color: '#8f969d', metalness: 0.4, side: THREE.DoubleSide }));
  bucket.add(bk); scene.add(bucket);
  const pour = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1, 10).translate(0, -0.5, 0), waterMat.clone()), false, false);
  const stink = Array.from({ length: 16 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: lib.tex.glow, color: '#9acd32', transparent: true, opacity: 0, depthWrite: false })); scene.add(s); return { s, ph: R(), dx: (R() - 0.5) * 0.6 }; });

  // ---------------- under the floor, the sink, the vent ----------------
  const toiletDrain = makePipe(ctx, [[0.05, -0.06, 0.06], [0.05, -0.75, 0.06], [-1.4, -0.88, 0.06], [-1.4, -1.6, 0.06]], { r: 0.075, color: '#e9ecef', opacity: 1, dots: 20, dotColor: '#6b4a2b' });
  const sinkDrain = makePipe(ctx, [[4.05, -0.1, 0.06], [4.05, -0.68, 0.06], [0.15, -0.79, 0.06]], { r: 0.055, color: '#e9ecef', opacity: 1, dots: 14, dotColor: '#58b4ec' });
  const vent = makePipe(ctx, [[-1.4, -0.88, 0.06], [-1.4, 4.45, 0.06]], { r: 0.075, color: '#e9ecef', opacity: 1, dots: 0 });
  const airI = instanced(ctx, new THREE.ConeGeometry(0.06, 0.15, 10), basic({ color: '#ffffff' }), 6);
  const vanity = lib.std({ color: '#3e5f7d', roughness: 0.6 });
  add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.95, 1.9), vanity), true, true).position.set(2.78, 0.475, -1.05);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.95, 1.9), vanity), true, true).position.set(4.32, 0.475, -1.05);
  add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.95, 0.05), vanity), true, true).position.set(3.55, 0.475, -2.0);
  const counterSh = new THREE.Shape(); counterSh.moveTo(2.7, 0.95); counterSh.lineTo(4.4, 0.95); counterSh.lineTo(4.4, 1.05); counterSh.lineTo(2.7, 1.05); counterSh.lineTo(2.7, 0.95);
  const basinHole = new THREE.Path(); basinHole.moveTo(3.2, 1.05); basinHole.quadraticCurveTo(3.5, 0.62, 3.8, 1.05); basinHole.lineTo(3.2, 1.05);
  add(new THREE.Mesh(new THREE.ExtrudeGeometry(counterSh, { depth: 2.0, bevelEnabled: false }), lib.std({ color: '#e8e4dc', roughness: 0.4 })), true, true).position.z = -2.0;
  const basin = new THREE.Shape(); basin.moveTo(3.16, 1.06); basin.quadraticCurveTo(3.5, 0.55, 3.84, 1.06); basin.lineTo(3.16, 1.06);
  add(new THREE.Mesh(new THREE.ShapeGeometry(basin, 16), ceramic), false, false).position.z = 0.004;
  const basinIn = new THREE.Shape(); basinIn.moveTo(3.22, 1.06); basinIn.quadraticCurveTo(3.5, 0.66, 3.78, 1.06); basinIn.lineTo(3.22, 1.06);
  add(new THREE.Mesh(new THREE.ShapeGeometry(basinIn, 16), inside), false, false).position.z = 0.005;
  add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.06), lib.std({ color: '#c0c4c8', metalness: 0.7 })), true, false).position.set(3.95, 1.22, -0.4);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.06), lib.std({ color: '#c0c4c8', metalness: 0.7 })), true, false).position.set(3.82, 1.38, -0.4);
  const sinkTrap = curve([[3.5, 0.8], [3.5, 0.45], [3.58, 0.31], [3.72, 0.31], [3.8, 0.45], [3.84, 0.5], [4.05, 0.46], [4.05, 0.2], [4.05, -0.1]]);
  let sW = 0, sBest = -9;
  for (let i = 60; i <= 140; i++) { const p = sinkTrap.getPointAt(i / 200); if (p.y > sBest) { sBest = p.y; sW = i / 200; } }
  add(new THREE.Mesh(stripGeo(sinkTrap, -0.07, 0.07, 60), basic({ color: '#e9ecef', side: THREE.DoubleSide })), false, false).position.z = 0.02;
  add(new THREE.Mesh(stripGeo(sinkTrap, -0.045, 0.045, 60), basic({ color: '#7d8a94', side: THREE.DoubleSide })), false, false).position.z = 0.021;
  const sinkLevel = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.44);
  const sinkSeal = add(new THREE.Mesh(stripGeo(sinkTrap, -0.045, 0.045, 60), basic({ color: '#58b4ec', side: THREE.DoubleSide, clippingPlanes: [sinkLevel] })), false, false);
  sinkSeal.position.z = 0.022;

  // ---------------- the duck ----------------
  const duck = makeDuck(ctx);

  // ---------------- camera ----------------
  ctx.shots([
    { at: 0, offset: 0, pos: [0.55, 1.35, 6.2], look: [0.5, 0.75, -0.3], push: 0.05 },
    { at: 'rush', pos: [0.6, 1.55, 6.6], look: [0.5, 0.95, -0.3] },
    { at: 'siphon', pos: [0.35, 1.1, 5.9], look: [0.3, 0.6, -0.3] },
    { at: 'tank', pos: [-0.25, 1.9, 7.5], look: [-0.3, 1.5, -0.3] },
    { at: 'flapper', pos: [-0.55, 2.0, 4.8], look: [-0.58, 1.95, -0.2] },
    { at: 'stuckvalve', offset: 1.4, pos: [-0.3, 1.5, 7.2], look: [-0.3, 1.2, -0.2], blend: 1.0 },
    { at: 'overflow', pos: [-0.55, 2.0, 4.8], look: [-0.58, 1.95, -0.2] },
    { at: 'vent', pos: [1.9, 1.2, 12], look: [1.9, 0.6, -0.3] },
    { at: 'roof', pos: [-0.9, 3.4, 9], look: [-1.0, 2.9, -0.3] },
    { at: 'end', pos: [-0.2, 2.3, 10.5], look: [-0.2, 1.9, -0.3], push: 0.06 },
  ]);

  const UP = new THREE.Vector3(0, 1, 0);
  const tmp = new THREE.Vector3();
  return t => {
    // ---- a plain hole first, then the bent trap
    const bent = tl.p('trap', 0.05, 0.3);
    straightInside.visible = bent < 0.99;
    straightInside.material.opacity = 1 - bent; straightInside.material.transparent = true;
    trapInside.visible = bent > 0.01;
    trapInside.material.transparent = true; trapInside.material.opacity = bent;

    // ---- bowl water level through the flush
    let lv = tl.on('trap') ? lerp(0.66, 0.92, tl.p('trap', 0.25, 0.6)) : 0.66;
    lv = lerp(lv, 1.1, tl.p('rush', 0.25, 0.85));
    lv = lerp(lv, 0.72, tl.p('siphon', 0.25, 0.85));
    lv = lerp(lv, 0.92, tl.p('refill', 0.35, 1));
    // the tank's own flush in the flapper beat
    const tankFlush = tl.p('flapper', 0.5, 0.9);
    lv = lerp(lv, 1.08, tl.p('flapper', 0.55, 0.75)); lv = lerp(lv, 0.75, tl.p('flapper', 0.78, 0.95)); lv = lerp(lv, 0.92, tl.p('empty', 0.2, 1));
    lv = lerp(lv, 1.06, tl.p('vent', 0.08, 0.25)); lv = lerp(lv, 0.75, tl.p('vent', 0.28, 0.5)); lv = lerp(lv, 0.92, tl.p('vent', 0.55, 0.9));
    levelPlane.constant = lv;
    bowlWater.visible = lv > 0.66;
    // trap: the seal, or full during a siphon
    const sealOn = tl.p('trap', 0.25, 0.6);
    const siphoning = Math.max(tl.p('rush', 0.6, 0.9) * (1 - tl.p('refill', 0.0, 0.35)), tl.p('flapper', 0.65, 0.75) * (1 - tl.p('empty', 0.0, 0.3)), tl.p('vent', 0.15, 0.25) * (1 - tl.p('vent', 0.45, 0.6)));
    sealPlane.constant = Math.min(0.92, lv);
    showStrip(trapSeal, 0, uW);
    trapSeal.visible = trapSeal.visible && sealOn > 0.01 && bent > 0.5;
    const fillU = lerp(uW, 1, clamp01(siphoning * 1.2));
    showStrip(trapFull, 0, fillU);
    trapFull.visible = trapFull.visible && siphoning > 0.01;
    trapFull.material.opacity = 0.88 * clamp01(siphoning * 2);
    for (let i = 0; i < 26; i++) {
      if (siphoning < 0.6) { flowI.hide(i); continue; }
      const q = ((t * 1.1 + i / 26) % 1), p = trap.getPointAt(q);
      flowI.set(i, p.x, p.y, 0.01, 1);
    }
    flowI.done();
    const gurgle = tl.p('refill', 0.0, 0.1) * (1 - tl.p('refill', 0.4, 0.55));
    for (let i = 0; i < 14; i++) {
      if (gurgle < 0.01) { bubbleI.hide(i); continue; }
      const q = ((t * 0.8 + i / 14) % 1), p = trap.getPointAt(lerp(1, uW, q));
      bubbleI.set(i, p.x + 0.03 * Math.sin(i), p.y, 0.012, gurgle);
    }
    bubbleI.done();

    // ---- waste: drops in, sits, rides the siphon out
    const dropK = tl.p('stuck', 0.05, 0.45);
    const out = tl.p('siphon', 0.3, 0.9);
    [[tp, 0.55, 0.0], [blob, 0.78, 0.15]].forEach(([m, x, lag]) => {
      const k = clamp01((out - lag) / (1 - lag));
      m.visible = tl.on('stuck') && k < 0.98;
      if (k <= 0) m.position.set(x + 0.03 * Math.sin(t * 2 + x), lerp(1.9, Math.max(0.72, Math.min(lv, 1.05) - 0.06), dropK * dropK) + (tl.on('rush') ? 0.04 * Math.sin(t * 7) : 0), 0.02);
      else { const p = trap.getPointAt(k); m.position.set(p.x, p.y, 0.02); }
      m.rotation.set(t, t * 0.7, 0);
    });

    // ---- the bucket pours a rush of water in
    const tip = tl.p('rush', 0.0, 0.3), pouring = tl.p('rush', 0.15, 0.3) * (1 - tl.p('rush', 0.8, 0.95));
    bucket.visible = tl.on('rush') && !tl.on('siphon');
    bucket.position.set(1.1, 1.95, -0.35); bucket.rotation.z = 1.9 * tip;
    pour.visible = bucket.visible && pouring > 0.02;
    pour.position.set(0.95, 1.86, -0.35); pour.scale.set(pouring, 1.86 - lv, pouring);

    // ---- stink: straight up the open pipe, then stopped by the seal
    stink.forEach((s, i) => {
      const q = (t * 0.35 + s.ph) % 1;
      let vis = 0, x = 0, y = 0;
      if (!tl.on('trap')) { vis = tl.p('hook', 0.1, 0.4); x = 0.35 + s.dx * q; y = lerp(-0.2, 2.4, q); }
      else if (!tl.on('stuck')) { vis = (1 - tl.p('trap', 0.4, 0.7)); const p = trap.getPointAt(lerp(1, uW + 0.05, q)); x = p.x; y = p.y; }
      else if (tl.on('vent') && !tl.on('roof') && tl.p('vent', 0.6, 0.7) > 0) { vis = tl.p('vent', 0.6, 0.75); x = 3.5 + s.dx * q * 0.6; y = lerp(0.8, 2.6, q); }
      else if (tl.on('roof')) { vis = 1 - tl.p('roof', 0.2, 0.5); x = 3.5 + s.dx * q * 0.6; y = lerp(0.8, 2.6, q); }
      s.s.visible = vis > 0.02;
      s.s.position.set(x, y, 0.05);
      s.s.scale.setScalar(0.25 + 0.5 * q);
      s.s.material.opacity = 0.55 * vis * (1 - q * 0.6);
    });

    // ---- the tank drops on; the supply pipe dribbles
    const tankIn = easeOutBounce(tl.lin('tank', 0.45, 0.75));
    tankGroup.visible = tl.on('tank') && tankIn > 0;
    tankGroup.position.y = (1 - tankIn) * 3.2;
    supply.grow(tl.p('tank', 0.05, 0.3));
    supply.flow(t, tl.p('tank', 0.15, 0.3) * (1 - tl.p('end', 0.5, 1)), 0.25);

    // ---- handle, lever, chain, flapper; the tank empties and refills
    const push = tl.p('flapper', 0.4, 0.5) * (1 - tl.p('flapper', 0.85, 0.95));
    handle.rotation.z = -0.5 * push;
    leverPivot.rotation.z = -0.35 * push;
    const flapOpen = tl.p('flapper', 0.45, 0.55) * (1 - tl.p('empty', 0.2, 0.6));
    flapPivot.rotation.z = -1.25 * flapOpen;
    let tlv = 2.35;
    tlv = lerp(tlv, 1.4, tankFlush);
    tlv = lerp(tlv, 2.35, tl.p('float', 0.2, 0.85));
    tlv = lerp(tlv, 2.68, tl.p('stuckvalve', 0.05, 0.4));
    tlv = lerp(tlv, 2.45, tl.p('overflow', 0.15, 0.5));
    tankLevel.constant = tlv;
    tankWater.visible = tlv > 1.42;
    // chain from the lever's end to the flapper's free end
    tankGroup.updateMatrixWorld(true);
    const a = new THREE.Vector3(-0.5, 0, 0).applyMatrix4(leverPivot.matrixWorld);
    const b = new THREE.Vector3(-0.26, 0.0, 0).applyMatrix4(flapPivot.matrixWorld);
    tmp.copy(a).sub(b);
    chain.position.set(a.x, a.y - tankGroup.position.y, 0.01);
    chain.scale.y = Math.max(0.001, tmp.length() + 0.02);
    chain.rotation.z = Math.atan2(b.x - a.x, -(b.y - a.y));
    // the float cup rides the water level on the fill-valve tube
    const cupY = Math.max(1.46, Math.min(2.5, tlv - 0.03));
    cup.position.set(-0.94, cupY, 0.0095);
    const valveOpen = Math.max(tl.p('float', 0.15, 0.25) * (1 - tl.p('float', 0.8, 0.9)), tl.p('stuckvalve', 0.0, 0.1) * (1 - tl.p('overflow', 0.6, 0.9)));
    for (let i = 0; i < 18; i++) {
      if (valveOpen < 0.05 || !tankGroup.visible) { sprayI.hide(i); continue; }
      const q = (t * 2 + i / 18) % 1;
      sprayI.set(i, -0.94 + 0.12 * Math.sin(i * 2.3) * q, 2.62 - q * Math.max(0.1, 2.62 - tlv), 0.012, valveOpen);
    }
    sprayI.done();
    // tank spilling over without an overflow tube, then the tube catching it
    const over = tl.p('stuckvalve', 0.35, 0.5) * (1 - tl.p('overflow', 0.15, 0.4));
    spill.visible = over > 0.02; spill.position.set(-1.1, 2.72, 0.03); spill.scale.set(1, Math.max(0.001, 2.72 * over), 1);
    const pud = tl.p('stuckvalve', 0.45, 1) * (1 - tl.p('overflow', 0.4, 1));
    puddle.visible = pud > 0.01; puddle.scale.setScalar(Math.max(0.001, 0.7 * pud));
    const tubeK = tl.p('overflow', 0.0, 0.2);
    overflowTube.visible = overflowBore.visible = tubeK > 0.01;
    overflowTube.scale.y = overflowBore.scale.y = Math.max(0.001, tubeK);

    // ---- every flush tugs on the drains; without a vent the sink trap gets sucked dry
    const ventFlow = tl.p('vent', 0.2, 0.3) * (1 - tl.p('vent', 0.6, 0.75));
    toiletDrain.grow(1); sinkDrain.grow(1);
    toiletDrain.flow(t, Math.max(ventFlow, siphoning > 0.6 ? 1 : 0), 1.6);
    sinkDrain.flow(t, 0, 1.6);
    let sl = 0.44;
    sl = lerp(sl, 0.31, tl.p('vent', 0.3, 0.6));
    sl = lerp(sl, 0.44, tl.p('roof', 0.3, 0.9));
    sinkLevel.constant = sl;
    showStrip(sinkSeal, 0.12, sW);
    const ventK = tl.p('roof', 0.0, 0.4);
    vent.grow(ventK);
    for (let i = 0; i < 6; i++) {
      if (ventK < 0.9 || tl.on('end')) { airI.hide(i); continue; }
      const q = (t * 0.6 + i / 6) % 1;
      airI.set(i, -1.4, lerp(4.6, 3.0, q), 0.12, 1, 0, 0, Math.PI);
    }
    airI.done();

    // ---- the duck: watches, rides the float, pops out of the vent
    const dk = duck.group;
    if (!tl.on('tank')) {
      dk.visible = true; dk.scale.setScalar(0.45); dk.position.set(1.95, 0.0, -0.7); dk.rotation.set(0, -1.9, 0);
    } else if (!tl.on('float')) dk.visible = false;
    else if (!tl.on('vent')) {
      const pop = easeOutBack(tl.lin('float', 0.0, 0.15));
      dk.visible = pop > 0; dk.scale.setScalar(0.24 * Math.max(0.001, pop));
      dk.position.set(-0.92, cupY + 0.065 + tankGroup.position.y, -0.1); dk.rotation.set(0, -0.6, 0.08 * Math.sin(t * 3));
    } else if (!tl.on('roof') || tl.p('roof', 0.45, 0.5) === 0) dk.visible = false;
    else {
      const up = easeOutBack(tl.lin('roof', 0.45, 0.75));
      dk.visible = true; dk.scale.setScalar(0.34); dk.position.set(-1.4, 4.45 - 0.35 + 0.42 * up, 0.0); dk.rotation.set(0, -0.6, 0.1 * Math.sin(t * 4) * (tl.on('end') ? 1 : 0));
    }
  };
}

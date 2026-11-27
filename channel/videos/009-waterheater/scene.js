// 009 - How a water heater works. A gas tank heater in a basement, cut down its middle (z = 0),
// with the shower it feeds upstairs. Cut faces are flat shapes stacked a hair apart in z
// (jacket, foam, steel, glass, water, then the parts inside), so each layer shows as a band.
import {
  THREE, lerp, clamp01, rng, easeOutBack, mixColor, makePipe, makeDuck, makeLabel, instanced, shapeOf,
} from '../../engine/engine.js';

export function build(ctx) {
  const { scene, tl, lib } = ctx;
  const R = rng(99);
  const add = (m, cast = false, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; scene.add(m); return m; };
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const basic = o => new THREE.MeshBasicMaterial(o);
  const flat = (pts, mat, z) => { const m = add(new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(pts)), mat), false, false); m.position.z = z; return m; };
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const gridTex = (base, line, cw, ch, rx, ry) => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = line; g.lineWidth = 3;
    for (let y = 0, r = 0; y <= 256; y += ch, r++) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke();
      for (let x = (r % 2) * cw / 2; x <= 256; x += cw) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + ch); g.stroke(); }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t;
  };
  // a tank-like outline: domed-up bottom, rounded top corners
  const capsule = (r, y0, y1, rt, dome, n = 12) => {
    const P = [];
    for (let i = 0; i <= 16; i++) { const x = -r + (2 * r * i) / 16; P.push([x, y0 + dome * (1 - (x / r) ** 2)]); }
    for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI / 2; P.push([r - rt + rt * Math.cos(a), y1 - rt + rt * Math.sin(a)]); }
    for (let i = 0; i <= n; i++) { const a = Math.PI / 2 + (i / n) * Math.PI / 2; P.push([-r + rt + rt * Math.cos(a), y1 - rt + rt * Math.sin(a)]); }
    return P;
  };
  const lathe = (r, y0, y1, rt, mat) => {
    const pts = [new THREE.Vector2(r, y0), new THREE.Vector2(r, y1 - rt)];
    for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI / 2; pts.push(new THREE.Vector2(r - rt + rt * Math.cos(a), y1 - rt + rt * Math.sin(a))); }
    pts.push(new THREE.Vector2(0, y1));
    return add(new THREE.Mesh(new THREE.LatheGeometry(pts, 40, Math.PI / 2, Math.PI), mat), true, true);
  };

  // ---------------- the house: basement below, bathroom above ----------------
  const GROUND = 4.4, W = 2.9, FLOOR2 = 5.9;
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(220, 100), basic({ map: lib.tex.skyDay, fog: false, depthWrite: false }));
  sky.position.set(0, 24, -70); scene.add(sky);
  const soilTex = lib.tex.soil.clone(); soilTex.repeat.set(16 / 8, 9 / 8); soilTex.needsUpdate = true;
  const soilMat = lib.std({ map: soilTex });
  for (const s of [-1, 1]) {
    add(new THREE.Mesh(new THREE.PlaneGeometry(16, 9), soilMat)).position.set(s * (W + 8), GROUND - 4.5, 0);
    add(box(16, 0.14, 40, lib.mat.grassDark)).position.set(s * (W + 8), GROUND - 0.07, -20);
  }
  add(new THREE.Mesh(new THREE.PlaneGeometry(2 * W, 3), soilMat)).position.set(0, -1.8, 0);
  const slab = lib.std({ color: '#aaa59c', roughness: 0.9 });
  add(box(2 * W, 0.3, 3.2, slab), false, true).position.set(0, -0.15, -1.0);
  const block = lib.std({ map: gridTex('#bcb7ae', '#8e8981', 64, 32, 3, 6) });
  for (const s of [-1, 1]) add(box(0.25, 5.5, 2.6, block), true, true).position.set(s * (W - 0.125), 2.75, -1.3);
  add(box(2 * W, 5.5, 0.25, lib.std({ map: gridTex('#bcb7ae', '#8e8981', 64, 32, 6, 6) })), false, true).position.set(0, 2.75, -2.475);
  add(box(0.95, 0.6, 0.05, lib.mat.trim)).position.set(-1.5, 4.9, -2.33);
  add(box(0.8, 0.45, 0.06, basic({ color: '#bfe3f7' }))).position.set(-1.5, 4.9, -2.32);
  add(box(2 * W, 0.4, 2.6, lib.std({ color: '#c9a26b' })), true, true).position.set(0, 5.7, -1.3);
  add(new THREE.Mesh(new THREE.PlaneGeometry(2 * W, 0.08), basic({ color: '#6e5232' }))).position.set(0, 5.62, 0.002);
  for (const s of [-1, 1]) add(box(0.2, 3.2, 2.6, lib.std({ map: lib.tex.siding })), true, true).position.set(s * (W - 0.1), FLOOR2 + 1.6, -1.3);
  add(box(2 * W, 3.2, 0.1, lib.std({ map: gridTex('#e3eef3', '#b6c8d2', 32, 32, 6, 3.4) })), false, true).position.set(0, FLOOR2 + 1.6, -2.2);
  add(box(2 * W, 0.2, 2.6, lib.std({ color: '#f2efe9' })), false, true).position.set(0, FLOOR2 + 3.3, -1.3);
  const porcelain = lib.std({ color: '#f8f8f5', roughness: 0.25 });
  add(box(1.9, 0.12, 1.7, porcelain), true, true).position.set(-0.1, FLOOR2 + 0.06, -1.3);
  add(box(1.9, 0.22, 0.08, porcelain), true, true).position.set(-0.1, FLOOR2 + 0.11, -0.45);
  const chrome = lib.std({ color: '#d5dade', metalness: 0.8, roughness: 0.2 });
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 12).rotateX(Math.PI / 2), chrome)).position.set(0.15, 7.85, -1.85);
  const head = add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.09, 0.08, 20), chrome), true, false);
  head.position.set(0.15, 7.8, -1.52); head.rotation.x = 0.5;
  const bulb = add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), basic({ color: '#fff3c4' })));
  bulb.position.set(1.6, 5.38, -1.0);
  const bLight = new THREE.PointLight('#ffe7b5', 7, 10, 1.2); bLight.position.set(1.4, 5.0, 0.6); scene.add(bLight);
  const upLight = new THREE.PointLight('#fff4e0', 6, 8, 1.2); upLight.position.set(0.5, 8.6, 0.4); scene.add(upLight);
  const drainGrate = add(new THREE.Mesh(new THREE.CircleGeometry(0.12, 18).rotateX(-Math.PI / 2), basic({ color: '#2a2a2a' })));
  drainGrate.position.set(1.32, 0.005, -0.2);

  // ---------------- the tank, cut in half ----------------
  const RW = 0.75, YB = 0.95, YT = 4.35;                 // the water inside
  const steelC = '#8f969e';
  const steelMat = lib.std({ color: steelC, metalness: 0.45, roughness: 0.45, side: THREE.DoubleSide });
  const steelFace = basic({ color: '#7d848c' });
  const foamClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const glassClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const jacketMat = lib.std({ color: '#4f7fa6', metalness: 0.3, roughness: 0.45, side: THREE.DoubleSide, clippingPlanes: [foamClip] });
  const steelShell = lathe(0.83, 0.18, 4.43, 0.36, steelMat);
  const jacketShell = lathe(1.0, 0.18, 4.6, 0.45, jacketMat);
  const jacketFace = flat(capsule(1.0, 0.18, 4.6, 0.45, 0), basic({ color: '#3f6a8f', clippingPlanes: [foamClip] }), 0.0);
  const foamFace = flat(capsule(0.975, 0.2, 4.575, 0.43, 0), basic({ color: '#f2c94c', clippingPlanes: [foamClip] }), 0.001);
  const steelCut = new THREE.Group(); scene.add(steelCut);
  const steelBody = new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(capsule(0.83, 0.87, 4.43, 0.36, 0.12))), steelFace); steelBody.position.z = 0.002;
  const skirt = [-1, 1].map(s => { const m = new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(rect(s > 0 ? 0.77 : -0.83, 0.18, s > 0 ? 0.83 : -0.77, 0.9))), steelFace); m.position.z = 0.002; return m; });
  const chamberPts = [[-0.77, 0.2], [0.77, 0.2], [0.77, 0.87]];
  for (let i = 16; i >= 0; i--) { const x = -0.77 + (1.54 * i) / 16; chamberPts.push([x, 0.87 + 0.12 * (1 - (x / 0.83) ** 2) - 0.002]); }
  const chamber = new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(chamberPts)), basic({ color: '#2a2420' })); chamber.position.z = 0.002;
  steelCut.add(steelBody, chamber, ...skirt);
  const glassFace = flat(capsule(0.78, 0.92, 4.38, 0.31, 0.12), basic({ color: '#dff4f8', clippingPlanes: [glassClip] }), 0.003);
  const waterU = {
    cold: { value: new THREE.Color('#2f7fe0') }, mid: { value: new THREE.Color('#f6c28b') }, hot: { value: new THREE.Color('#ff4626') }, rust: { value: new THREE.Color('#9a5a2a') },
    heat: { value: 0 }, strat: { value: 0 }, fill: { value: 0 }, alpha: { value: 0.92 }, rustK: { value: 0 },
    blobK: { value: 0 }, blob: { value: new THREE.Vector3(-0.42, 4.2, 0.5) }, over: { value: 0 },
  };
  const waterMat = new THREE.ShaderMaterial({
    uniforms: waterU, transparent: true, depthWrite: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform vec3 cold, mid, hot, rust, blob; uniform float heat, strat, fill, alpha, rustK, blobK, over; varying vec3 vW;
      void main(){
        if (vW.y > fill) discard;
        float h = clamp((vW.y - 1.0) / 3.3, 0.0, 1.0);
        float k = heat * mix(1.0, smoothstep(0.1, 0.8, h), strat);
        float d = length(vW.xy - blob.xy) / max(blob.z, 0.001);
        k *= 1.0 - blobK * (1.0 - smoothstep(0.55, 1.0, d));
        k = clamp(k, 0.0, 1.0);
        vec3 c = k < 0.5 ? mix(cold, mid, k * 2.0) : mix(mid, hot, k * 2.0 - 1.0);
        c = mix(c, vec3(0.42, 0.02, 0.06), over);
        c = mix(c, rust, rustK);
        gl_FragColor = vec4(c, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const water = flat(capsule(RW, YB, YT, 0.28, 0.12), waterMat, 0.004);
  // sediment: a band on the domed bottom, thickest at the edges (the low points)
  const SN = 24, sedPos = new Float32Array((SN + 1) * 2 * 3), sedIdx = [];
  const sedBottom = x => YB + 0.12 * (1 - (x / RW) ** 2);
  for (let i = 0; i <= SN; i++) { const x = -RW + (2 * RW * i) / SN; sedPos.set([x, sedBottom(x), 0, x, sedBottom(x), 0], i * 6); }
  for (let i = 0; i < SN; i++) { const a = i * 2; sedIdx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const sedGeo = new THREE.BufferGeometry(); sedGeo.setAttribute('position', new THREE.BufferAttribute(sedPos, 3)); sedGeo.setIndex(sedIdx);
  const sediment = add(new THREE.Mesh(sedGeo, basic({ color: '#8a7656', side: THREE.DoubleSide })), false, false); sediment.position.z = 0.0045;
  const setSediment = th => {
    for (let i = 0; i <= SN; i++) { const x = -RW + (2 * RW * i) / SN; sedPos[i * 6 + 4] = sedBottom(x) + th * (0.45 + 0.9 * (x / RW) ** 2); }
    sedGeo.attributes.position.needsUpdate = true; sediment.visible = th > 0.003;
  };

  // the flue up the middle, with its twisted baffle
  const flueGroup = new THREE.Group(); scene.add(flueGroup);
  const flueIn = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 3.75).translate(0, 1.875, 0), basic({ color: '#3a2e28' })); flueIn.position.set(0, 0.87, 0.005);
  const flueWalls = [-1, 1].map(s => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 3.75).translate(0, 1.875, 0), basic({ color: '#6f767e' })); m.position.set(s * 0.115, 0.87, 0.0052); return m; });
  const baffle = [];
  for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.025), basic({ color: '#a7aeb5' })); m.position.set(0, 1.0 + i * 0.13, 0.0055); m.rotation.z = (i % 2 ? 1 : -1) * 0.5; baffle.push(m); }
  flueGroup.add(flueIn, ...flueWalls, ...baffle);
  const flueGlow = add(new THREE.Mesh(new THREE.PlaneGeometry(0.34, 3.6).translate(0, 1.8, 0), basic({ map: lib.tex.glow, color: '#ff8a3a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })), false, false);
  flueGlow.position.set(0, 0.9, 0.0058); flueGlow.scale.x = 2.2;
  const hood = add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 0.22, 20, 1, true), lib.std({ color: '#b8bec4', metalness: 0.5, side: THREE.DoubleSide })), true, false);
  hood.position.set(0, 4.8, 0);
  const vent = makePipe(ctx, [[0, 4.9, 0], [0, 5.42, 0], [0, 5.42, -2.4]], { r: 0.13, color: '#b8bec4', opacity: 1, dots: 10, dotColor: '#ff9a4a' });
  const exhaustI = instanced(ctx, new THREE.CircleGeometry(0.03, 10), basic({ color: '#ffae5a' }), 18);

  // burner and flames
  const burner = flat(rect(-0.5, 0.36, 0.5, 0.43), basic({ color: '#5a5f66' }), 0.0035);
  const flameBlue = instanced(ctx, new THREE.ConeGeometry(0.045, 1, 10).translate(0, 0.5, 0), basic({ color: '#4fa3ff' }), 10);
  const flameOrange = instanced(ctx, new THREE.ConeGeometry(0.06, 1, 10).translate(0, 0.5, 0), basic({ color: '#ff9d2e', transparent: true, opacity: 0.85 }), 10);
  const heatI = instanced(ctx, new THREE.CircleGeometry(0.028, 10), basic({ color: '#ff7a3a' }), 16);

  // gas valve with its thermostat, the burner tube and the gas line
  const valveBox = add(box(0.3, 0.42, 0.26, lib.std({ color: '#3b3f45', roughness: 0.5 })), true, false);
  valveBox.position.set(1.2, 1.3, -0.05);
  const dialMat = lib.std({ color: '#d23b2a', roughness: 0.4 });
  const dial = add(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.04, 20).rotateX(Math.PI / 2), dialMat));
  dial.position.set(1.2, 1.36, 0.1);
  const pointer = add(new THREE.Mesh(new THREE.PlaneGeometry(0.014, 0.07).translate(0, 0.035, 0), basic({ color: '#ffffff' })));
  pointer.position.set(1.2, 1.36, 0.125);
  const probe = add(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.55, 10).rotateZ(Math.PI / 2), lib.std({ color: '#b87333', metalness: 0.6, roughness: 0.3 })));
  probe.position.set(0.8, 1.3, 0.03);
  const burnerTube = makePipe(ctx, [[1.12, 1.08, 0.04], [1.12, 0.52, 0.04], [0.45, 0.47, 0.04]], { r: 0.022, color: '#a2a8ae', opacity: 1 });
  const gasLine = makePipe(ctx, [[W - 0.25, 0.95, -0.05], [1.55, 0.95, -0.05], [1.35, 1.15, -0.05]], { r: 0.04, color: '#2f2f2f', opacity: 1 });
  const thermoLabel = makeLabel(ctx, { height: 0.42 });
  thermoLabel.sprite.position.set(0.72, 1.85, 0.5);

  // cold in (dip tube), hot out, anode, relief valve, drain
  const copper = lib.std({ color: '#c8794a', metalness: 0.6, roughness: 0.3 });
  const coldIn = makePipe(ctx, [[-W + 0.25, 5.15, 0], [-0.42, 5.15, 0], [-0.42, 4.25, 0]], { r: 0.05, color: '#c8794a', opacity: 1, dots: 12, dotColor: '#6fc3ff' });
  const dipTube = add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 14).translate(0, -0.5, 0), lib.std({ color: '#eeece6', roughness: 0.5 })));
  dipTube.position.set(-0.42, 4.3, 0);
  const hotNipple = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 14), copper)); hotNipple.position.set(0.48, 4.35, 0);
  const hotDown = makePipe(ctx, [[0.48, 4.5, 0], [0.48, 5.25, 0], [0.48, 5.25, -1.9], [0.48, FLOOR2, -1.9]], { r: 0.05, color: '#c8794a', opacity: 1 });
  const hotUp = makePipe(ctx, [[0.48, FLOOR2 - 0.01, -1.9], [0.48, 7.85, -1.9], [0.15, 7.85, -1.9]], { r: 0.05, color: '#c8794a', opacity: 1 });
  hotUp.grow(1);
  const hotDots = instanced(ctx, new THREE.SphereGeometry(0.024, 8, 6), basic({ color: '#ff6a3a' }), 26);
  const anodeMat = lib.std({ color: '#b9c0c6', metalness: 0.5, roughness: 0.5 });
  const anode = add(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 3.15, 14).translate(0, -1.575, 0), anodeMat), true, false);
  const anodeHead = add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 6), lib.std({ color: '#9aa1a8', metalness: 0.6 })));
  const pits = Array.from({ length: 10 }, () => add(new THREE.Mesh(new THREE.CircleGeometry(0.012 + R() * 0.012, 8), basic({ color: '#5d5248' }))));
  const pitY = pits.map(() => 1.5 + R() * 2.7);
  const brass = lib.std({ color: '#c9a646', metalness: 0.6, roughness: 0.35 });
  const tpBody = add(box(0.22, 0.2, 0.2, brass), true, false); tpBody.position.set(1.1, 3.95, 0);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 12).rotateZ(Math.PI / 2), brass)).position.set(0.92, 3.95, 0);
  const leverPivot = new THREE.Group(); leverPivot.position.set(1.0, 4.06, 0.06); scene.add(leverPivot);
  const lever = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.05).translate(0.12, 0, 0), brass); leverPivot.add(lever);
  const tpProbe = add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.34, 10).rotateZ(Math.PI / 2), brass)); tpProbe.position.set(0.66, 3.95, 0.03);
  const discharge = makePipe(ctx, [[1.2, 3.92, 0], [1.32, 3.8, 0], [1.32, 0.3, 0]], { r: 0.045, color: '#c8794a', opacity: 1 });
  discharge.grow(1);
  const pressLabel = makeLabel(ctx, { height: 0.42 });
  pressLabel.sprite.position.set(0.5, 3.5, 0.5);
  const sprayI = instanced(ctx, new THREE.SphereGeometry(0.03, 8, 6), basic({ color: '#dff3ff' }), 26);
  const steam = Array.from({ length: 22 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: lib.tex.glow, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); scene.add(s); return { s, ph: R(), dx: (R() - 0.5) }; });
  const drainValve = add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 12).rotateZ(Math.PI / 2), brass)); drainValve.position.set(-0.98, 1.05, 0);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 12), brass)).position.set(-1.12, 0.98, 0);
  const bucket = add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.38, 22, 1, true), lib.std({ color: '#d06a2c', side: THREE.DoubleSide })), true, true);
  bucket.position.set(-1.12, 0.19, 0.05);
  const bucketFill = add(new THREE.Mesh(new THREE.CircleGeometry(0.2, 20).rotateX(-Math.PI / 2), basic({ color: '#8a7656' })));
  const sedI = instanced(ctx, new THREE.CircleGeometry(0.018, 8), basic({ color: '#a8916a' }), 26);
  const brownI = instanced(ctx, new THREE.SphereGeometry(0.03, 8, 6), basic({ color: '#8a6d45' }), 14);

  // rust before the glass, cracks after it, and the cold/hot water flows
  const rustSpots = Array.from({ length: 18 }, (_, i) => {
    const side = i % 2 ? 1 : -1, top = i >= 14;
    return top ? { x: (i % 4 - 1.5) * 0.25, y: YT + 0.015, r: 0.04 + R() * 0.03 } : { x: side * (RW + 0.012), y: 1.3 + R() * 2.8, r: 0.04 + R() * 0.035 };
  });
  const rustI = instanced(ctx, new THREE.CircleGeometry(1, 14), basic({ color: '#a4471c' }), 18);
  const flakeI = instanced(ctx, new THREE.CircleGeometry(0.014, 6), basic({ color: '#b5622c' }), 20);
  const crackSpots = Array.from({ length: 8 }, (_, i) => ({ x: (i % 2 ? 1 : -1) * (RW + 0.015), y: 1.5 + (i / 8) * 2.5 + R() * 0.2 }));
  const crackMat = basic({ color: '#3a3a3a' });
  const cracks = crackSpots.map(c => {
    const g = new THREE.Group(); g.position.set(c.x, c.y, 0.0035); scene.add(g);
    for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.008, 0.07), crackMat); m.position.set((R() - 0.5) * 0.02, (k - 1) * 0.055, 0); m.rotation.z = (k % 2 ? 1 : -1) * 0.6; g.add(m); }
    return g;
  });
  const crackRustI = instanced(ctx, new THREE.CircleGeometry(1, 14), basic({ color: '#a4471c' }), 8);
  const coldI = instanced(ctx, new THREE.CircleGeometry(0.03, 10), basic({ color: '#bfe6ff' }), 18);
  const riseI = instanced(ctx, new THREE.CircleGeometry(0.026, 10), basic({ color: '#ffd0b0' }), 12);
  const bubbleI = instanced(ctx, new THREE.RingGeometry(0.02, 0.034, 12), basic({ color: '#ffffff' }), 24);
  const lossI = instanced(ctx, new THREE.PlaneGeometry(0.22, 0.03), basic({ color: '#ff8a3a', transparent: true, opacity: 0.85 }), 16);
  const showerI = instanced(ctx, new THREE.BoxGeometry(0.02, 0.22, 0.02), basic({ color: '#bfe6ff', transparent: true, opacity: 0.9 }), 60);

  const duck = makeDuck(ctx);

  // ---------------- camera ----------------
  ctx.shots([
    { at: 0, offset: 0, pos: [0.5, 7.2, 4.6], look: [0.0, 6.7, -1.1], push: 0.05 },
    { at: 'tank', pos: [1.2, 3.2, 10.2], look: [-0.15, 2.5, -0.3] },
    { at: 'rust', pos: [1.0, 3.1, 8.6], look: [-0.1, 2.7, -0.3] },
    { at: 'burner', pos: [0.2, 1.4, 5.2], look: [0.0, 0.9, -0.3] },
    { at: 'burner', offset: 3.0, pos: [1.2, 3.2, 10.2], look: [-0.15, 2.6, -0.3] },
    { at: 'mix', pos: [-0.1, 4.9, 6.2], look: [-0.1, 4.1, -0.3] },
    { at: 'dip', pos: [1.2, 3.2, 10.2], look: [-0.15, 2.6, -0.3] },
    { at: 'thermostat', pos: [1.2, 1.7, 5.2], look: [0.75, 1.35, -0.3] },
    { at: 'cracks', pos: [0.1, 3.3, 7.6], look: [0.05, 2.9, -0.3] },
    { at: 'pressure', pos: [1.2, 3.2, 10.2], look: [-0.1, 2.6, -0.3] },
    { at: 'valve', pos: [1.6, 2.6, 7.2], look: [1.0, 2.1, -0.2] },
    { at: 'sediment', pos: [-0.3, 1.9, 6.4], look: [-0.55, 1.15, -0.3] },
    { at: 'foam', pos: [1.2, 3.2, 10.2], look: [-0.1, 2.6, -0.3] },
    { at: 'end', pos: [0.0, 5.0, 17], look: [0.0, 4.3, -1], push: 0.06 },
  ]);

  const hotPath = (u, pipe) => pipe.path.getPointAt(clamp01(u));

  return t => {
    ctx.shake = 0;
    // ---- the tank rises out of the floor and fills with cold water
    const rise = easeOutBack(tl.lin('tank', 0.05, 0.4));
    const tankOn = rise > 0;
    [steelShell, steelCut, glassFace, water].forEach(m => { m.visible = tankOn; });
    [steelShell, steelCut].forEach(m => { m.scale.y = Math.max(0.001, rise); });
    waterU.fill.value = tankOn ? lerp(YB - 0.05, YT + 0.05, tl.p('tank', 0.45, 0.9)) : -1;

    // ---- rust, then the glass lining sweeps over it
    const rustK = tl.p('rust', 0.1, 0.7) * (1 - tl.p('glass', 0.3, 0.8));
    waterU.rustK.value = 0.45 * rustK;
    rustSpots.forEach((s, i) => { const k = clamp01(rustK * 1.4 - i / 30); if (k < 0.02) rustI.hide(i); else rustI.set(i, s.x, s.y, 0.0025, s.r * k); });
    rustI.done();
    for (let i = 0; i < 20; i++) {
      if (rustK < 0.05) { flakeI.hide(i); continue; }
      const q = (t * 0.12 + i / 20) % 1;
      flakeI.set(i, Math.sin(i * 7.1) * 0.6, lerp(4.1, 1.2, q), 0.0047, rustK);
    }
    flakeI.done();
    const gl = tl.p('glass', 0.05, 0.6);
    glassClip.constant = -lerp(4.6, 0.7, gl);
    glassFace.visible = tankOn && gl > 0.001;

    // ---- burner, flue and vent; the water warms
    const burnerOn = tl.p('burner', 0.05, 0.2);
    burner.visible = burnerOn > 0.01; burner.scale.x = Math.max(0.001, burnerOn);
    const flueK = tl.p('burner', 0.0, 0.15);
    flueGroup.visible = flueK > 0.01; flueGroup.scale.y = Math.max(0.001, flueK);
    hood.visible = flueK > 0.5; vent.grow(tl.p('burner', 0.1, 0.3));
    burnerTube.grow(tl.p('burner', 0.0, 0.15)); gasLine.grow(tl.p('burner', 0.0, 0.15));
    [valveBox, dial, pointer, probe].forEach(m => { m.visible = flueK > 0.5; });
    let flame = tl.p('burner', 0.2, 0.3);
    flame *= 1 - 0.85 * tl.p('thermostat', 0.55, 0.7);
    flame = Math.max(flame, 1.5 * tl.p('pressure', 0.05, 0.2) * (1 - tl.p('valve', 0.45, 0.7)));
    flame = Math.max(flame, 0.15 * flueK);
    for (let i = 0; i < 10; i++) {
      if (flame < 0.05) { flameBlue.hide(i); flameOrange.hide(i); continue; }
      const x = -0.45 + i * 0.1, f = 0.85 + 0.15 * Math.sin(t * 23 + i * 1.7);
      flameBlue.set(i, x, 0.43, 0.01, 1, 0, 0, 0, 0.1 * flame * f, 1);
      flameOrange.set(i, x, 0.43, 0.008, 1, 0, 0, 0, (0.2 * flame * f + 0.02), 1);
    }
    flameBlue.done(); flameOrange.done();
    const exhaustK = clamp01((flame - 0.3) / 0.4);
    for (let i = 0; i < 18; i++) {
      if (exhaustK < 0.02) { exhaustI.hide(i); continue; }
      const q = (t * 0.35 + i / 18) % 1;
      exhaustI.set(i, 0.06 * Math.sin(t * 4 + i * 2.3), lerp(0.9, 4.6, q), 0.0065, exhaustK);
    }
    exhaustI.done();
    vent.flow(t, exhaustK, 1.4, 1);
    flueGlow.material.opacity = 0.55 * exhaustK;
    for (let i = 0; i < 16; i++) {
      if (exhaustK < 0.05 || !tl.on('burner')) { heatI.hide(i); continue; }
      const s = i % 2 ? 1 : -1, q = (t * 0.6 + i / 16) % 1;
      heatI.set(i, s * lerp(0.14, 0.55, q), 1.3 + (i >> 1) * 0.38, 0.0062, exhaustK * (1 - q));
    }
    heatI.done();
    const heat = tl.p('burner', 0.25, 1.0) * 0.85 + 0.15 * tl.p('dip', 0.2, 0.8);
    waterU.heat.value = heat;
    waterU.strat.value = 0.35 + 0.65 * tl.p('dip', 0.3, 0.9);

    // ---- cold water comes in at the top and mixes; then the dip tube sends it to the bottom
    coldIn.grow(tl.p('mix', 0.0, 0.2));
    const coldFlow = tl.p('mix', 0.2, 0.3) * (1 - tl.p('thermostat', 0.0, 0.2)) + tl.p('end', 0.1, 0.2);
    coldIn.flow(t, coldFlow, 1.2, 1);
    const blobK = tl.p('mix', 0.25, 0.7) * (1 - tl.p('dip', 0.25, 0.6));
    waterU.blobK.value = blobK; waterU.blob.value.z = lerp(0.3, 1.1, tl.p('mix', 0.25, 0.8));
    const dipLen = tl.p('dip', 0.0, 0.25) * 3.05;
    dipTube.visible = dipLen > 0.01; dipTube.scale.set(1, Math.max(0.001, dipLen), 1);
    for (let i = 0; i < 18; i++) {
      if (coldFlow < 0.05) { coldI.hide(i); continue; }
      const q = (t * 0.5 + i / 18) % 1;
      if (!tl.on('dip') || dipLen < 2.9) {             // spills out at the top
        const a = -0.2 - (i % 6) * 0.5, r = q * 0.8;
        coldI.set(i, -0.42 + r * Math.cos(a) * 0.9, 4.2 + r * Math.sin(a) * 0.5, 0.0066, blobK * (1 - q));
      } else if (q < 0.65) coldI.set(i, -0.42, lerp(4.2, 1.25, q / 0.65), 0.06, coldFlow);
      else { const k = (q - 0.65) / 0.35; coldI.set(i, -0.42 + (i % 2 ? 1 : -0.6) * k * 0.55, 1.18, 0.0066, coldFlow * (1 - k * 0.5)); }
    }
    coldI.done();
    const riseK = tl.p('dip', 0.45, 0.6) * (1 - tl.p('thermostat', 0.0, 0.3));
    for (let i = 0; i < 12; i++) {
      if (riseK < 0.05) { riseI.hide(i); continue; }
      const q = (t * 0.3 + i / 12) % 1, x0 = (i % 2 ? 0.55 : 0.3) - (i % 3) * 0.05;
      riseI.set(i, lerp(x0, 0.48, q * q), lerp(1.4, 4.15, q), 0.0066, riseK);
    }
    riseI.done();
    hotDown.grow(tl.p('mix', 0.0, 0.2));
    hotNipple.visible = tl.p('mix', 0.0, 0.05) > 0;
    const hotFlow = tl.p('mix', 0.25, 0.35) * (1 - tl.p('thermostat', 0.0, 0.2)) + tl.p('end', 0.1, 0.2);
    const hookFlow = 1 - tl.p('hook', 0.85, 1.0);
    const warmth = tl.on('dip') ? tl.p('dip', 0.35, 0.7) : 0;
    hotDots.mesh.material.color.copy(mixColor('#b48cff', '#ff5a32', tl.on('end') ? 1 : warmth));
    for (let i = 0; i < 26; i++) {
      const q = (t * 0.25 + i / 26) % 1;
      if (i < 14) { if (hotFlow < 0.05) { hotDots.hide(i); continue; } const p = hotPath(q, hotDown); hotDots.set(i, p.x, p.y, p.z + 0.06, hotFlow); }
      else { const on = Math.max(hookFlow * (tl.on('tank') ? 0 : 1), tl.p('end', 0.1, 0.2)); if (on < 0.05) { hotDots.hide(i); continue; } const p = hotPath(q, hotUp); hotDots.set(i, p.x, p.y, p.z + 0.06, on); }
    }
    hotDots.done();

    // ---- the thermostat: set to 120°F, the burner shuts off
    const tK = tl.p('thermostat', 0.15, 0.3);
    const broken = tl.p('pressure', 0.05, 0.15) * (1 - tl.p('valve', 0.6, 0.8));
    pointer.rotation.z = -lerp(1.4, -0.6, clamp01(heat)) + 0.35 * broken * Math.sin(t * 30);
    dialMat.color.copy(mixColor('#d23b2a', '#2a2a2a', broken));
    if (tl.on('thermostat') && !tl.on('cracks')) thermoLabel.set(tK > 0.5 ? '120°F' : null);
    else if (tl.on('pressure') && !tl.on('valve')) thermoLabel.set(broken > 0.5 ? 'BROKEN' : null);
    else thermoLabel.set(null);

    // ---- cracks in the glass, rust at them, then the anode rod takes the hit
    const crackK = tl.p('cracks', 0.05, 0.4);
    cracks.forEach((g, i) => { g.visible = crackK > i / 10 + 0.02; });
    const cRust = tl.p('cracks', 0.4, 0.9) * (1 - tl.p('anode', 0.35, 0.7));
    crackSpots.forEach((c, i) => { if (cRust < 0.02) crackRustI.hide(i); else crackRustI.set(i, c.x, c.y, 0.0036, 0.05 * cRust); });
    crackRustI.done();
    const drop = tl.p('anode', 0.02, 0.3), eat = tl.p('anode', 0.35, 1.0);
    const aOn = drop > 0.001;
    anode.visible = anodeHead.visible = aOn;
    const aR = 0.045 * (1 - 0.45 * eat);
    anode.scale.set(aR, 1, aR); anode.position.set(0.25, 4.45 + (1 - drop) * 3, 0);
    anodeHead.position.set(0.25, 4.5 + (1 - drop) * 3, 0);
    anodeMat.color.copy(mixColor('#b9c0c6', '#7d7466', eat));
    pits.forEach((p, i) => { p.visible = aOn && eat > i / 12 + 0.05; p.position.set(0.25 + (i % 2 ? 0.012 : -0.012), pitY[i], aR + 0.002); });

    // ---- the thermostat fails: the burner roars, pressure climbs, the relief valve opens
    const over = tl.p('pressure', 0.15, 0.9) * (1 - tl.p('valve', 0.2, 0.7));
    waterU.over.value = 0.85 * over;
    ctx.shake = 0.035 * tl.p('pressure', 0.4, 0.9) * (1 - tl.p('valve', 0.15, 0.4));
    const psi = Math.round(lerp(60, 150, tl.p('pressure', 0.1, 0.95)) - 90 * tl.p('valve', 0.45, 0.9));
    if (tl.on('pressure') && !tl.on('sediment')) pressLabel.set(`${psi} psi`); else pressLabel.set(null);
    pressLabel.sprite.material.color.copy(mixColor('#ffffff', '#ff8a7a', over));
    for (let i = 0; i < 24; i++) {
      if (over < 0.1) { bubbleI.hide(i); continue; }
      const q = (t * 0.7 + i / 24) % 1;
      bubbleI.set(i, Math.sin(i * 12.9) * 0.62, lerp(1.2, 4.25, q), 0.0068, over * (0.6 + 0.4 * Math.sin(i)));
    }
    bubbleI.done();
    const open = tl.p('valve', 0.05, 0.15) * (1 - tl.p('valve', 0.8, 0.95));
    leverPivot.rotation.z = 0.9 * open;
    for (let i = 0; i < 26; i++) {
      if (open < 0.05) { sprayI.hide(i); continue; }
      const q = (t * 1.6 + i / 26) % 1, a = (i * 2.4) % 6.28;
      sprayI.set(i, 1.32 + Math.cos(a) * 0.25 * q, 0.3 - 0.3 * q * q + 0.05, Math.sin(a) * 0.25 * q, open);
    }
    sprayI.done();

    // ---- sediment settles, then gets drained into the bucket
    const settle = tl.p('sediment', 0.05, 0.45), flush = tl.p('sediment', 0.6, 0.95);
    setSediment(0.09 * settle * (1 - 0.85 * flush) + (tl.on('foam') ? 0 : 0));
    for (let i = 0; i < 26; i++) {
      const on = tl.p('sediment', 0.0, 0.1) * (1 - tl.p('sediment', 0.4, 0.5));
      if (on < 0.05) { sedI.hide(i); continue; }
      const q = (t * 0.22 + i / 26) % 1;
      sedI.set(i, Math.sin(i * 5.3) * 0.65, lerp(4.1, 1.15, q), 0.0047, on);
    }
    sedI.done();
    const pour = tl.p('sediment', 0.58, 0.65) * (1 - tl.p('sediment', 0.95, 1.0));
    for (let i = 0; i < 14; i++) {
      if (pour < 0.05) { brownI.hide(i); continue; }
      const q = (t * 1.2 + i / 14) % 1;
      brownI.set(i, -1.12, lerp(0.92, 0.3, q), 0.0, pour);
    }
    brownI.done();
    bucket.visible = tl.p('sediment', 0.45, 0.5) > 0 && !tl.on('end');
    bucketFill.visible = bucket.visible && flush > 0.05; bucketFill.position.set(-1.12, 0.05 + 0.22 * flush, 0.05);

    // ---- heat leaks out the sides, then foam and the jacket wrap it
    const loss = tl.p('foam', 0.0, 0.15) * (1 - tl.p('foam', 0.35, 0.6));
    for (let i = 0; i < 16; i++) {
      if (loss < 0.05) { lossI.hide(i); continue; }
      const s = i % 2 ? 1 : -1, q = (t * 0.9 + i / 16) % 1;
      lossI.set(i, s * lerp(0.9, 1.7, q), 1.0 + (i >> 1) * 0.42, 0.01, loss * (1 - q));
    }
    lossI.done();
    const wrap = tl.p('foam', 0.15, 0.7);
    foamClip.constant = lerp(0.1, 4.75, wrap);
    [foamFace, jacketFace, jacketShell].forEach(m => { m.visible = wrap > 0.001; });

    // ---- upstairs: the shower runs in the hook and again at the end
    const showerOn = Math.max(hookFlow * (tl.on('tank') ? 0 : 1), tl.p('end', 0.2, 0.3));
    for (let i = 0; i < 60; i++) {
      if (showerOn < 0.05) { showerI.hide(i); continue; }
      const q = (t * 1.4 + i / 60) % 1, a = i * 2.39, r = 0.05 + q * 0.38 * ((i % 5) / 5 + 0.3);
      showerI.set(i, 0.15 + Math.cos(a) * r, lerp(7.7, FLOOR2 + 0.13, q), -1.45 + Math.sin(a) * r * 0.8 + q * 0.3, showerOn);
    }
    showerI.done();
    steam.forEach(({ s, ph, dx }, i) => {
      const k = (t * 0.18 + ph) % 1;
      const upstairs = i < 14, on = upstairs ? showerOn : open;
      s.visible = on > 0.02;
      if (!s.visible) return;
      if (upstairs) s.position.set(0.05 + dx * 1.2, FLOOR2 + 0.3 + k * 1.9, -1.0 + dx * 0.4);
      else s.position.set(1.32 + dx * 0.6, 0.2 + k * 1.4, 0.2);
      s.scale.setScalar(0.5 + k * 0.9);
      s.material.opacity = (upstairs ? 0.75 : 0.5) * on * Math.sin(Math.PI * k);
    });

    // ---- the duck: showering, then down in the basement watching, then back in a hot shower
    const dk = duck.group, T = id => tl.start(id);
    duck.tint('#ffd21f', 0);
    dk.visible = true;
    if (t < T('tank')) {
      dk.scale.setScalar(0.6); dk.position.set(-0.05, FLOOR2 + 0.12, -1.0);
      dk.rotation.set(0, -0.4, 0.06 * Math.sin(t * 3));
    } else if (t < T('end')) {
      const k = easeOutBack(tl.lin('tank', 0.1, 0.25));
      dk.visible = k > 0; dk.scale.setScalar(0.55 * Math.max(0.001, k));
      const scared = tl.p('pressure', 0.3, 0.6) * (1 - tl.p('valve', 0.4, 0.7));
      const byBucket = tl.p('sediment', 0.4, 0.55) * (1 - tl.p('foam', 0.0, 0.3));
      dk.position.set(-1.35 - 0.2 * scared - 0.12 * byBucket, 0, 0.65);
      dk.rotation.set(0, -0.35, 0.08 * Math.sin(t * 40) * scared + 0.12 * tl.p('rust', 0.3, 0.5) * (1 - tl.p('glass', 0.3, 0.6)));
      duck.tint('#ffffff', 0.35 * scared);
      if (byBucket > 0.5 && flush > 0.1) duck.tint('#9bbf5a', 0.3 * flush * (1 - tl.p('foam', 0.0, 0.3)));
    } else {
      const k = easeOutBack(tl.lin('end', 0.12, 0.32));
      dk.visible = k > 0; dk.scale.setScalar(0.6 * Math.max(0.001, k));
      dk.position.set(-0.05, FLOOR2 + 0.12, -1.0); dk.rotation.set(0, -0.4, 0.06 * Math.sin(t * 3));
    }
  };
}

// The shared engine every video scene is built on: the renderer, the backyard cutaway
// world, materials, camera moves, captions and small helpers (pipes, particles, the duck).
// A scene's update(t) must be a pure function of time so frames can render in any order.
import * as THREE from 'three';
export { THREE };

// ---------- math ----------
export const clamp01 = x => Math.min(1, Math.max(0, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (a, b, x) => {
  if (a === b) return x >= b ? 1 : 0;
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};
export const easeOutBack = k => { const c = 1.70158; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
export const easeOutBounce = k => {
  const n = 7.5625, d = 2.75;
  if (k < 1 / d) return n * k * k;
  if (k < 2 / d) return n * (k -= 1.5 / d) * k + 0.75;
  if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + 0.9375;
  return n * (k -= 2.625 / d) * k + 0.984375;
};
export function rng(seed = 1) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const col = c => new THREE.Color(c);
export const mixColor = (a, b, k) => col(a).lerp(col(b), clamp01(k));

// ---------- timeline: beats come from the narration, so visuals land on the words ----------
export function makeTimeline(data) {
  const lines = data.lines;
  const idx = new Map(lines.map((l, i) => [l.beat, i]));
  const span = id => {
    const i = idx.get(id);
    if (i === undefined) throw new Error(`Scene uses beat "${id}", which is not in script.json`);
    return [lines[i].start, i + 1 < lines.length ? lines[i + 1].start : data.duration];
  };
  const tl = {
    t: 0, duration: data.duration, lines, words: data.words,
    start: id => span(id)[0],
    end: id => span(id)[1],
    dur: id => { const [s, e] = span(id); return e - s; },
    at: (id, f = 0) => { const [s, e] = span(id); return s + (e - s) * f; },
    // eased 0..1 over a fraction of a beat (a, b are fractions of the beat's length)
    p: (id, a = 0, b = 1) => { const [s, e] = span(id); return smooth(s + (e - s) * a, s + (e - s) * b, tl.t); },
    // eased 0..1 over seconds counted from the beat's start
    ps: (id, a, b) => { const s = span(id)[0]; return smooth(s + a, s + b, tl.t); },
    // linear 0..1 over a fraction of a beat
    lin: (id, a = 0, b = 1) => { const [s, e] = span(id); return clamp01((tl.t - (s + (e - s) * a)) / ((e - s) * (b - a))); },
    on: id => tl.t >= span(id)[0],
    since: id => tl.t - span(id)[0],
  };
  return tl;
}

// ---------- 2D profile helpers (a cutaway is a profile pushed back into the screen) ----------
export function shapeOf(pts) {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return s;
}
// Extrudes a closed profile `depth` units, from z = 0 to z = depth.
export const extrude = (pts, depth) => new THREE.ExtrudeGeometry(shapeOf(pts), { depth, bevelEnabled: false });
// The side walls you get by pushing an open polyline from z = zf back to z = zb, with UVs in world units.
export function wallGeometry(pts, zf, zb) {
  const pos = [], uv = [];
  let s = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const s2 = s + Math.hypot(x2 - x1, y2 - y1);
    pos.push(x1, y1, zf, x2, y2, zf, x2, y2, zb, x1, y1, zf, x2, y2, zb, x1, y1, zb);
    uv.push(s, zf, s2, zf, s2, zb, s, zf, s2, zb, s, zb);
    s = s2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
// Offsets an open profile (top-left, down and around, to top-right) inward by d.
export function insetProfile(P, d) {
  const lines = [];
  for (let i = 0; i < P.length - 1; i++) {
    const [x1, y1] = P[i], [x2, y2] = P[i + 1];
    const L = Math.hypot(x2 - x1, y2 - y1), dx = (x2 - x1) / L, dy = (y2 - y1) / L;
    lines.push({ px: x1 - dy * d, py: y1 + dx * d, dx, dy });
  }
  const meet = (a, b) => {
    const den = a.dx * b.dy - a.dy * b.dx;
    if (Math.abs(den) < 1e-9) return [b.px, b.py];
    const s = ((b.px - a.px) * b.dy - (b.py - a.py) * b.dx) / den;
    return [a.px + a.dx * s, a.py + a.dy * s];
  };
  const level = y => ({ px: 0, py: y, dx: 1, dy: 0 });
  const out = [meet(level(P[0][1]), lines[0])];
  for (let i = 0; i < lines.length - 1; i++) out.push(meet(lines[i], lines[i + 1]));
  out.push(meet(lines[lines.length - 1], level(P[P.length - 1][1])));
  return out;
}
// Leftmost and rightmost x where a horizontal line at y crosses the profile.
export function xSpanAt(P, y) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < P.length - 1; i++) {
    const [x1, y1] = P[i], [x2, y2] = P[i + 1];
    if (y < Math.min(y1, y2) - 1e-9 || y > Math.max(y1, y2) + 1e-9) continue;
    const xs = y1 === y2 ? [x1, x2] : [x1 + ((y - y1) / (y2 - y1)) * (x2 - x1)];
    for (const x of xs) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
  }
  return lo <= hi ? [lo, hi] : null;
}
// The floor height of the profile at x (its lowest point there).
export function bottomAt(P, x) {
  let y = Infinity;
  for (let i = 0; i < P.length - 1; i++) {
    const [x1, y1] = P[i], [x2, y2] = P[i + 1];
    if (x < Math.min(x1, x2) - 1e-9 || x > Math.max(x1, x2) + 1e-9) continue;
    y = Math.min(y, x1 === x2 ? Math.min(y1, y2) : y1 + ((x - x1) / (x2 - x1)) * (y2 - y1));
  }
  return y;
}
// Evenly spaced points along a polyline, with the inward normal at each.
export function samplePolyline(P, spacing) {
  const out = [];
  let carry = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const [x1, y1] = P[i], [x2, y2] = P[i + 1];
    const L = Math.hypot(x2 - x1, y2 - y1), dx = (x2 - x1) / L, dy = (y2 - y1) / L;
    for (let s = carry; s <= L; s += spacing) out.push({ x: x1 + dx * s, y: y1 + dy * s, nx: -dy, ny: dx });
    carry = spacing - ((L - carry) % spacing);
  }
  return out;
}

// ---------- textures ----------
function canvasTexture(w, h, draw, { repeat, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

function makeLibrary(rnd) {
  const blot = (g, x, y, r, color) => { g.fillStyle = color; g.beginPath(); g.ellipse(x, y, r, r * (0.45 + rnd() * 0.7), rnd() * 3, 0, 7); g.fill(); };
  const tex = {
    soil: canvasTexture(1024, 1024, (g, w, h) => {
      g.fillStyle = '#a0602f'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) blot(g, rnd() * w, rnd() * h, 6 + rnd() * 50, `rgba(${rnd() < 0.5 ? '70,34,12' : '214,150,90'},${0.025 + rnd() * 0.05})`);
      g.lineCap = 'round';
      for (let i = 0; i < 260; i++) {           // vertical cracks, the look of a freshly cut bank
        let x = rnd() * w, y = rnd() * h;
        g.strokeStyle = `rgba(58,26,8,${0.15 + rnd() * 0.25})`; g.lineWidth = 1 + rnd() * 3.2;
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 34; y += 10 + rnd() * 34; g.lineTo(x, y); }
        g.stroke();
        g.strokeStyle = 'rgba(232,170,110,0.18)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 2, y); g.lineTo(x + 2, y - 30); g.stroke();
      }
      for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '78,52,34' : '206,176,140'},0.6)`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 1 + rnd() * 4, 0, 7); g.fill(); }
    }, { repeat: [1 / 8, 1 / 8] }),
    rock: canvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = '#76716c'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1800; i++) blot(g, rnd() * w, rnd() * h, 2 + rnd() * 20, `rgba(${rnd() < 0.5 ? '42,40,38' : '178,172,166'},${0.05 + rnd() * 0.1})`);
    }, { repeat: [1 / 6, 1 / 6] }),
    grass: canvasTexture(512, 512, (g, w, h) => {
      for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#4e9c2c' : '#62b53a'; g.fillRect(i * w / 4, 0, w / 4, h); }
      for (let i = 0; i < 12000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '28,78,14' : '160,226,110'},0.16)`; g.fillRect(rnd() * w, rnd() * h, 1.5, 3 + rnd() * 6); }
    }, { repeat: [1 / 8, 1 / 8] }),
    concrete: canvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = '#bfc2c6'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '90,92,96' : '240,240,240'},${0.1 + rnd() * 0.2})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); }
    }, { repeat: [1 / 3, 1 / 3] }),
    plaster: canvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = '#f2f5f7'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 400; i++) blot(g, rnd() * w, rnd() * h, 10 + rnd() * 40, 'rgba(200,214,224,0.08)');
    }, { repeat: [1 / 3, 1 / 3] }),
    siding: canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#ece3d2'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 16) { g.fillStyle = 'rgba(120,100,80,0.22)'; g.fillRect(0, y, w, 2); }
    }, { repeat: [1 / 2, 1 / 2] }),
    shingles: canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#b94e28'; g.fillRect(0, 0, w, h);
      for (let y = 0, r = 0; y < h; y += 20, r++) for (let x = (r % 2) * 16; x < w; x += 32) { g.fillStyle = `rgba(${rnd() < 0.5 ? '120,40,18' : '220,110,70'},0.35)`; g.fillRect(x, y, 30, 18); }
    }, { repeat: [1 / 2, 1 / 2] }),
    planks: canvasTexture(256, 128, (g, w, h) => {
      g.fillStyle = '#7a4c2a'; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgba(40,22,10,0.55)'; g.fillRect(x, 0, 3, h); g.fillStyle = `rgba(160,110,70,${0.1 + rnd() * 0.15})`; g.fillRect(x + 3, 0, 29, h); }
    }, { repeat: [1 / 3.2, 1] }),
    skyDay: canvasTexture(1024, 512, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3d8de0'); gr.addColorStop(0.62, '#a9d3f5'); gr.addColorStop(1, '#e4f2fb');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.filter = 'blur(14px)';
      for (let i = 0; i < 9; i++) {
        const cx = rnd() * w, cy = 60 + rnd() * 220;
        for (let k = 0; k < 7; k++) { g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(cx + (rnd() - 0.5) * 150, cy + (rnd() - 0.5) * 30, 40 + rnd() * 50, 22 + rnd() * 20, 0, 0, 7); g.fill(); }
      }
    }),
    skyNight: canvasTexture(1024, 512, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#070d24'); gr.addColorStop(0.7, '#1b2650'); gr.addColorStop(1, '#3a4677');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 420; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.7})`; g.beginPath(); g.arc(rnd() * w, rnd() * h * 0.8, rnd() * 1.6, 0, 7); g.fill(); }
    }),
    glow: canvasTexture(256, 256, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }),
    hex: canvasTexture(256, 256, (g, w, h) => {
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 4;
      const r = 32, dx = r * Math.sqrt(3);
      for (let row = -1; row < 6; row++) for (let c = -1; c < 6; c++) {
        const cx = c * dx + (row % 2) * dx / 2, cy = row * r * 1.5;
        g.beginPath();
        for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g[k ? 'lineTo' : 'moveTo'](cx + r * Math.cos(a), cy + r * Math.sin(a)); }
        g.closePath(); g.stroke();
      }
    }, { repeat: [3, 3] }),
  };

  // Darker topsoil near the surface and a clay band lower down, so a cut bank reads as layers.
  const strata = m => {
    m.onBeforeCompile = shader => {
      shader.vertexShader = 'varying float vWY;\n' + shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\n  vWY = (modelMatrix * vec4(transformed, 1.0)).y;');
      shader.fragmentShader = 'varying float vWY;\n' + shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        float topsoil = smoothstep(-0.6, -0.28, vWY);
        diffuseColor.rgb *= mix(1.0, 0.58, topsoil);
        float band = smoothstep(-4.35, -4.15, vWY) * (1.0 - smoothstep(-3.75, -3.55, vWY));
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.14, 0.96, 0.8), band * 0.8);
        float deep = 1.0 - smoothstep(-6.8, -3.0, vWY);
        diffuseColor.rgb *= mix(1.0, 0.84, deep);`);
    };
    return m;
  };
  const std = o => new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, ...o });
  return {
    tex,
    std,
    soil: (o = {}) => strata(std({ map: tex.soil, ...o })),
    mat: {
      rock: std({ map: tex.rock }),
      grass: std({ map: tex.grass }),
      grassDark: std({ color: '#3f8a22' }),
      concrete: std({ map: tex.concrete, roughness: 0.85 }),
      window: new THREE.MeshStandardMaterial({ color: '#30506f', roughness: 0.2, emissive: '#ffc96e', emissiveIntensity: 0 }),
      trim: std({ color: '#fbfaf6' }),
      bark: std({ color: '#5b3a22' }),
      leafA: std({ color: '#3f8a2c', flatShading: true }),
      leafB: std({ color: '#58a63b', flatShading: true }),
    },
  };
}

// ---------- the backyard: lawn, a cut-away bank of earth, fence, house, trees, sky ----------
export function buildYard(ctx, { profile, depth, halfWidth = 30, rockTop = -7.2, rnd = rng(11) }) {
  const { scene, lib } = ctx;
  const add = (m, cast = false, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; scene.add(m); return m; };
  const x0 = profile[0][0], x1 = profile[profile.length - 1][0];

  add(new THREE.Mesh(new THREE.ShapeGeometry(shapeOf([[-halfWidth, 0], ...profile, [halfWidth, 0], [halfWidth, rockTop], [-halfWidth, rockTop]])), lib.soil()));
  const rockG = new THREE.PlaneGeometry(2 * halfWidth, 14);
  const ruv = rockG.attributes.uv;
  for (let i = 0; i < ruv.count; i++) ruv.setXY(i, ruv.getX(i) * 2 * halfWidth, ruv.getY(i) * 14);
  add(new THREE.Mesh(rockG, lib.mat.rock)).position.set(0, rockTop - 7, 0);
  add(new THREE.Mesh(new THREE.PlaneGeometry(2 * halfWidth, 0.07), new THREE.MeshBasicMaterial({ color: '#efe2cc' }))).position.set(0, rockTop, 0.01);
  // a lip of turf along the cut edge
  for (const [a, b] of [[-halfWidth, x0], [x1, halfWidth]]) {
    const lip = add(new THREE.Mesh(new THREE.BoxGeometry(b - a, 0.13, 0.3), lib.mat.grassDark), false, true);
    lip.position.set((a + b) / 2, -0.035, -0.13);
  }
  // stones and pebbles buried in the cut face, kept clear of the hole
  const stoneMat = lib.std({ color: '#8d8378', roughness: 0.8, flatShading: true });
  const stones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), stoneMat, 70);
  const dm = new THREE.Object3D();
  let n = 0;
  for (let tries = 0; tries < 600 && n < 70; tries++) {
    const x = -12 + rnd() * 24, y = rockTop + 0.2 + rnd() * (-0.9 - rockTop - 0.2), r = 0.05 + rnd() ** 2 * 0.22;
    const span = xSpanAt(profile, y);
    if (span && x > span[0] - 0.35 && x < span[1] + 0.35) continue;
    dm.position.set(x, y, 0.0); dm.rotation.set(0, 0, rnd() * 6.28); dm.scale.set(r * 1.4, r, 0.05); dm.updateMatrix();
    stones.setMatrixAt(n++, dm.matrix);
  }
  stones.count = n; scene.add(stones);
  const lawn = add(new THREE.Mesh(new THREE.ShapeGeometry(shapeOf([[-halfWidth, 0], [x0, 0], [x0, depth], [x1, depth], [x1, 0], [halfWidth, 0], [halfWidth, 140], [-halfWidth, 140]])), lib.mat.grass));
  lawn.rotation.x = -Math.PI / 2;

  const pitMat = lib.soil({ side: THREE.DoubleSide });
  add(new THREE.Mesh(wallGeometry(profile, 0, -depth), pitMat));
  add(new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(profile)), pitMat)).position.z = -depth;

  const fence = add(new THREE.Mesh(new THREE.BoxGeometry(70, 1.8, 0.16), lib.std({ map: lib.tex.planks.clone() })), true, true);
  fence.material.map.repeat.set(70 / 3.2, 1); fence.material.map.needsUpdate = true;
  fence.position.set(0, 0.9, -17);

  const windows = [];
  const house = (x, z, w, h, d, rot = 0) => {
    const g = new THREE.Group();
    const sid = lib.tex.siding.clone(); sid.repeat.set(w / 2, h / 2); sid.needsUpdate = true;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lib.std({ map: sid }));
    body.position.y = h / 2; body.castShadow = body.receiveShadow = true; g.add(body);
    const sh = lib.tex.shingles.clone(); sh.repeat.set(w / 2.5, 1); sh.needsUpdate = true;
    const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(shapeOf([[-w / 2 - 0.6, 0], [w / 2 + 0.6, 0], [0, h * 0.55]]), { depth: d + 0.8, bevelEnabled: false }), lib.std({ map: sh }));
    roof.position.set(0, h, -d / 2 - 0.4); roof.castShadow = true; g.add(roof);
    const chim = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 0.8), lib.std({ color: '#8a4a36' }));
    chim.position.set(w * 0.28, h + 1.5, -d * 0.2); g.add(chim);
    const cols = Math.max(2, Math.round(w / 2.6));
    for (let r = 0; r < 2; r++) for (let c = 0; c < cols; c++) {
      const wx = -w / 2 + (c + 0.5) * (w / cols), wy = h * (0.28 + r * 0.42);
      if (r === 0 && c === Math.floor(cols / 2)) {                // front door
        const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.1, 0.08), lib.std({ color: '#2f5d8a' }));
        door.position.set(wx, 1.05, d / 2 + 0.04); g.add(door); continue;
      }
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.45, 0.06), lib.mat.trim); frame.position.set(wx, wy, d / 2 + 0.03); g.add(frame);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.2, 0.08), lib.mat.window); glass.position.set(wx, wy, d / 2 + 0.05); g.add(glass);
      windows.push(glass);
    }
    g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
  };
  house(-1.2, -30, 12, 5.6, 8);
  house(-17, -33, 10, 5.0, 8, 0.25);
  house(15, -34, 10, 5.2, 8, -0.3);

  const tree = (x, z, s) => {
    const g = new THREE.Group();
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.26 * s, 3.2 * s, 8), lib.mat.bark);
    tr.position.y = 1.6 * s; tr.castShadow = true; g.add(tr);
    for (let i = 0; i < 7; i++) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry((0.85 + rnd() * 0.7) * s, 1), i % 2 ? lib.mat.leafA : lib.mat.leafB);
      b.position.set((rnd() - 0.5) * 2 * s, (3.1 + rnd() * 1.7) * s, (rnd() - 0.5) * 2 * s);
      b.castShadow = true; g.add(b);
    }
    g.position.set(x, 0, z); scene.add(g);
  };
  [[9.5, -12, 1.3], [-7, -13, 1.1], [9.5, -22, 1.5], [-11.5, -24, 1.4], [3, -39, 1.6], [-6, -42, 1.5], [20, -26, 1.6]].forEach(a => tree(...a));
  for (let i = 0; i < 16; i++) {
    const b = add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 + rnd() * 0.5, 1), rnd() < 0.5 ? lib.mat.leafA : lib.mat.leafB), true, true);
    b.position.set(-20 + i * 2.6 + rnd(), 0.4, -16.3 + rnd() * 0.3);
  }

  // sky: a far backdrop with a night version laid over it
  const skyGeo = new THREE.PlaneGeometry(320, 160);
  const day = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ map: lib.tex.skyDay, fog: false, depthWrite: false }));
  day.position.set(0, 38, -110); scene.add(day);
  const night = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ map: lib.tex.skyNight, fog: false, depthWrite: false, transparent: true, opacity: 0 }));
  night.position.set(0, 38, -109.9); scene.add(night);

  return { pitMat, windows, skyNight: night };
}

// ---------- pipes with flowing dots ----------
export function roundedPath(pts, rc = 0.18) {
  const v = pts.map(p => new THREE.Vector3(p[0], p[1], p[2] ?? 0));
  const path = new THREE.CurvePath();
  let cur = v[0].clone();
  for (let i = 1; i < v.length; i++) {
    const p = v[i];
    if (i < v.length - 1) {
      const a = p.clone().sub(v[i - 1]), b = v[i + 1].clone().sub(p);
      const r = Math.min(rc, a.length() / 2, b.length() / 2);
      const pin = p.clone().sub(a.normalize().multiplyScalar(r));
      const pout = p.clone().add(b.normalize().multiplyScalar(r));
      if (cur.distanceTo(pin) > 1e-4) path.add(new THREE.LineCurve3(cur.clone(), pin));
      path.add(new THREE.QuadraticBezierCurve3(pin, p.clone(), pout));
      cur = pout;
    } else path.add(new THREE.LineCurve3(cur.clone(), p.clone()));
  }
  return path;
}

export function instanced(ctx, geo, mat, n) {
  const m = new THREE.InstancedMesh(geo, mat, n);
  m.frustumCulled = false;
  ctx.scene.add(m);
  const d = new THREE.Object3D();
  return {
    mesh: m, n,
    set(i, x, y, z, s = 1, rx = 0, ry = 0, rz = 0, sy = s, sz = s) {
      d.position.set(x, y, z); d.rotation.set(rx, ry, rz); d.scale.set(s, sy, sz); d.updateMatrix(); m.setMatrixAt(i, d.matrix);
    },
    hide(i) { d.position.set(0, -500, 0); d.rotation.set(0, 0, 0); d.scale.set(1e-4, 1e-4, 1e-4); d.updateMatrix(); m.setMatrixAt(i, d.matrix); },
    hideAll() { for (let i = 0; i < n; i++) this.hide(i); this.done(); },
    done() { m.instanceMatrix.needsUpdate = true; },
  };
}

export function makePipe(ctx, pts, { r = 0.075, color = '#62bdf5', opacity = 0.88, dots = 0, dotColor = '#ffffff', radial = 12 } = {}) {
  const path = roundedPath(pts, r * 2.6);
  const len = path.getLength();
  const segs = Math.max(16, Math.round(len * 14));
  const geo = new THREE.TubeGeometry(path, segs, r, radial, false);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, transparent: opacity < 1, opacity });
  const mesh = new THREE.Mesh(geo, mat);
  ctx.scene.add(mesh);
  const per = radial * 6;
  const dotsI = dots ? instanced(ctx, new THREE.SphereGeometry(r * 0.42, 8, 6), new THREE.MeshBasicMaterial({ color: dotColor }), dots) : null;
  const pipe = {
    mesh, mat, path, len,
    grow(p) { p = clamp01(p); mesh.visible = p > 0.001; geo.setDrawRange(0, Math.floor(p * segs) * per); },
    flow(t, on, speed = 1.6, grown = 1) {
      if (!dotsI) return;
      for (let i = 0; i < dots; i++) {
        const u = (((i / dots) + (t * speed) / len) % 1 + 1) % 1;
        if (on > 0.01 && u <= grown) { const q = path.getPointAt(u); dotsI.set(i, q.x, q.y, q.z, on); } else dotsI.hide(i);
      }
      dotsI.done();
    },
  };
  pipe.grow(0);
  return pipe;
}

// ---------- floating text label (counters, measurements) ----------
export function makeLabel(ctx, { height = 0.8, color = '#ffffff', bg = 'rgba(18,18,18,0.82)' } = {}) {
  const W = 640, H = 200;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, fog: false }));
  sprite.scale.set(height * W / H, height, 1); sprite.renderOrder = 10;
  ctx.scene.add(sprite);
  let cur = null;
  return {
    sprite,
    set(text) {
      if (text === cur) return;
      cur = text;
      g.clearRect(0, 0, W, H);
      if (text) {
        g.font = "700 120px Fredoka, sans-serif";
        const w = Math.min(W - 8, g.measureText(text).width + 80);
        g.fillStyle = bg; g.beginPath(); g.roundRect((W - w) / 2, 22, w, H - 44, 48); g.fill();
        g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, H / 2 + 6);
      }
      tex.needsUpdate = true;
      sprite.visible = !!text;
    },
  };
}

// ---------- the mascot: a rubber duck in a hard hat ----------
export function makeDuck(ctx) {
  const g = new THREE.Group();
  const yellow = new THREE.MeshStandardMaterial({ color: '#ffd21f', roughness: 0.42 });
  const orange = new THREE.MeshStandardMaterial({ color: '#ff8a1c', roughness: 0.45 });
  const black = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.3 });
  const white = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const hatMat = new THREE.MeshStandardMaterial({ color: '#ffb020', roughness: 0.35 });
  const part = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; g.add(m); return m; };
  part(new THREE.SphereGeometry(0.32, 28, 18), yellow, 0, 0.3, 0, 1.28, 0.88, 1);
  part(new THREE.ConeGeometry(0.13, 0.28, 16), yellow, -0.4, 0.46, 0, 1, 1, 0.8).rotation.z = 0.9;
  part(new THREE.SphereGeometry(0.15, 16, 12), yellow, 0.02, 0.36, 0.25, 1.5, 0.7, 0.5);
  part(new THREE.SphereGeometry(0.15, 16, 12), yellow, 0.02, 0.36, -0.25, 1.5, 0.7, 0.5);
  part(new THREE.SphereGeometry(0.22, 24, 16), yellow, 0.24, 0.7, 0);
  part(new THREE.SphereGeometry(0.11, 16, 10), orange, 0.46, 0.64, 0, 1.25, 0.42, 0.95);
  for (const s of [-1, 1]) {
    part(new THREE.SphereGeometry(0.04, 12, 8), black, 0.39, 0.77, 0.1 * s);
    part(new THREE.SphereGeometry(0.013, 8, 6), white, 0.42, 0.79, 0.1 * s + 0.012);
  }
  part(new THREE.SphereGeometry(0.21, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), hatMat, 0.22, 0.84, 0);
  part(new THREE.CylinderGeometry(0.27, 0.27, 0.03, 28), hatMat, 0.25, 0.845, 0);
  part(new THREE.BoxGeometry(0.05, 0.05, 0.3), hatMat, 0.22, 1.02, 0).rotation.x = Math.PI / 2;
  ctx.scene.add(g);
  return { group: g, body: yellow, tint(c, k) { yellow.color.copy(mixColor('#ffd21f', c, k)); } };
}

// ---------- the stage: renderer, lights, camera moves and captions ----------
export function createStage({ canvas, width, height, timeline, captionEl }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#cfe6f5', 45, 120);
  const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 500);
  const lib = makeLibrary(rng(1337));
  const tl = makeTimeline(timeline);

  const hemi = new THREE.HemisphereLight('#d8ecff', '#7a6650', 1.1);
  const sun = new THREE.DirectionalLight('#fff0d4', 2.7);
  sun.position.set(10, 18, 14); sun.target.position.set(1, 0, -3);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 3;
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 80 });
  sun.shadow.bias = -0.0006;
  const fill = new THREE.DirectionalLight('#ffffff', 0.55);
  fill.position.set(-8, 4, 20);
  scene.add(hemi, sun, sun.target, fill);

  let shotFn = () => {};
  const ctx = {
    THREE, scene, camera, renderer, lib, tl, width, height,
    lights: { hemi, sun, fill },
    yard: null,
    buildYard(opts) { ctx.yard = buildYard(ctx, opts); return ctx.yard; },
    // camera keyframes: [{ at: 'beat' | seconds, offset, pos: [x,y,z], look: [x,y,z], fov, blend, push }]
    shots(list) {
      const S = list.map(s => ({ ...s, time: (typeof s.at === 'string' ? tl.start(s.at) : s.at) + (s.offset ?? -0.2), pos: new THREE.Vector3(...s.pos), look: new THREE.Vector3(...s.look) }))
        .sort((a, b) => a.time - b.time);
      S.forEach((s, i) => { s.until = i + 1 < S.length ? S[i + 1].time : tl.duration; });
      const state = (s, t) => {
        const k = clamp01((t - s.time) / Math.max(0.5, s.until - s.time));
        return { pos: s.pos.clone().lerp(s.look, (s.push ?? 0.04) * k), look: s.look.clone(), fov: s.fov ?? 34 };
      };
      shotFn = t => {
        let i = 0;
        while (i + 1 < S.length && S[i + 1].time <= t) i++;
        let { pos, look, fov } = state(S[i], t);
        if (i > 0) {
          const k = smooth(0, 1, (t - S[i].time) / (S[i].blend ?? 0.8));
          if (k < 1) {
            const prev = state(S[i - 1], t);
            pos = prev.pos.lerp(pos, k); look = prev.look.lerp(look, k); fov = lerp(prev.fov, fov, k);
          }
        }
        pos.x += 0.05 * Math.sin(t * 0.61); pos.y += 0.035 * Math.sin(t * 0.47 + 1.3);
        camera.position.copy(pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(look);
      };
    },
    // 0 = day, 1 = night
    setNight(k) {
      hemi.intensity = lerp(1.1, 0.16, k); hemi.color.copy(mixColor('#d8ecff', '#8193d8', k));
      sun.intensity = lerp(2.7, 0.3, k); sun.color.copy(mixColor('#fff0d4', '#9fb4ff', k));
      fill.intensity = lerp(0.55, 0.08, k);
      scene.fog.color.copy(mixColor('#cfe6f5', '#1a2448', k));
      if (ctx.yard) { ctx.yard.skyNight.material.opacity = k; ctx.yard.windows.forEach(w => { w.material.emissiveIntensity = 1.5 * smooth(0.3, 1, k); }); }
    },
  };

  const words = tl.words;
  const capWord = captionEl.querySelector('span');
  let shown = -1;
  const captions = t => {
    let i = -1;
    for (let k = 0; k < words.length; k++) if (words[k].start <= t) i = k; else break;
    if (i >= 0) {
      const w = words[i], next = words[i + 1];
      const until = next ? Math.min(next.start, w.end + 0.6) : w.end + 0.6;
      if (t >= until) i = -1;
    }
    if (i !== shown) {
      capWord.textContent = i >= 0 ? words[i].w : '';
      capWord.classList.toggle('hl', i >= 0 && !!words[i].hl);
      shown = i;
    }
    const pop = i >= 0 ? 1 + 0.16 * (1 - smooth(0, 0.1, t - words[i].start)) : 1;
    capWord.style.transform = `scale(${pop.toFixed(3)})`;
  };

  ctx.frame = (t, update) => {
    tl.t = t;
    update(t);
    shotFn(t);
    captions(t);
    renderer.render(scene, camera);
  };
  return ctx;
}

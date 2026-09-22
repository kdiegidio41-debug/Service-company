/* =========================================================================
   EverGlow — procedural mock-up renderer
   Builds a fictional suburban home at blue hour and renders it with or
   without a professional Christmas lighting install. Everything is
   generated in code (no photos, no stock), and the random seed is fixed so
   the "before" and "after" frames are pixel-aligned.

   URL params:  ?state=after|before  &view=ba|hero|portrait|og|roofline|
                 landscape|wreaths|full|commercial  &w=1600 &h=1000
   ========================================================================= */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const P = new URLSearchParams(location.search);
const LIT = (P.get('state') || 'after') === 'after';
const VIEW = P.get('view') || 'ba';
const W = +P.get('w') || 1600;
const H = +P.get('h') || 1000;

/* --- deterministic randomness ------------------------------------------ */
let _seed = 20251224;
const rand = () => { _seed = (_seed * 16807) % 2147483647; return (_seed - 1) / 2147483646; };
const rr = (a, b) => a + (b - a) * rand();
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.max(0, Math.min(1, t));

/* --- renderer ---------------------------------------------------------- */
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x1d3152, 0.0125);
const xmas = new THREE.Group();       // everything the lighting crew installs
xmas.visible = LIT;
scene.add(xmas);

const WARM = new THREE.Color(1.0, 0.64, 0.33);       // C9 warm white, linear
const WARM_WASH = new THREE.Color(1.0, 0.58, 0.28);
const LAMP = new THREE.Color(1.0, 0.7, 0.42);

/* =========================================================================
   Procedural textures
   ========================================================================= */
function tileNoise(size, periods) {
  const out = new Float32Array(size * size);
  let amp = 1, total = 0;
  for (const per of periods) {
    const grid = new Float32Array(per * per);
    for (let i = 0; i < grid.length; i++) grid[i] = rand();
    for (let y = 0; y < size; y++) {
      const gy = (y / size) * per, y0 = Math.floor(gy), ty = gy - y0, sy = ty * ty * (3 - 2 * ty), y1 = (y0 + 1) % per;
      for (let x = 0; x < size; x++) {
        const gx = (x / size) * per, x0 = Math.floor(gx), tx = gx - x0, sx = tx * tx * (3 - 2 * tx), x1 = (x0 + 1) % per;
        const a = grid[y0 * per + x0], b = grid[y0 * per + x1], c = grid[y1 * per + x0], d = grid[y1 * per + x1];
        out[y * size + x] += amp * ((a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy);
      }
    }
    total += amp; amp *= 0.55;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function pixelCanvas(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; const px = fn(i, x, y);
    img.data[i * 4] = px[0]; img.data[i * 4 + 1] = px[1]; img.data[i * 4 + 2] = px[2]; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0); return c;
}

function toTex(canvas, { srgb = true, rx = 1, ry = 1 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

// Snow — texture spans 4m
const snowN = tileNoise(512, [4, 8, 16, 32, 64, 128]);
const snowMap = toTex(pixelCanvas(512, 512, (i) => {
  const n = snowN[i]; const sp = rand() > 0.9985 ? 30 : 0;
  return [214 + n * 36 + sp, 222 + n * 30 + sp, 234 + n * 20 + sp];
}), { rx: 0.25, ry: 0.25 });
const snowBump = toTex(pixelCanvas(512, 512, (i) => { const v = snowN[i] * 255; return [v, v, v]; }), { srgb: false, rx: 0.25, ry: 0.25 });

// Board-and-batten siding — texture spans 2m (battens every 40cm)
const sidN = tileNoise(500, [4, 16, 64]);
const sidingCanvas = pixelCanvas(500, 500, (i, x) => {
  const m = x % 100; let v = 238 + (sidN[i] - 0.5) * 10;
  if (m < 16) v += 6; if (m === 16 || m === 17) v -= 40; if (m === 0) v -= 14;
  return [v, v - 3, v - 9];
});
const sidingBumpCanvas = pixelCanvas(500, 500, (i, x) => {
  const m = x % 100; const v = m < 16 ? 220 : (m < 19 ? 160 : 120 + sidN[i] * 10); return [v, v, v];
});
const sidingMap = toTex(sidingCanvas, { rx: 0.5, ry: 0.5 });
const sidingBump = toTex(sidingBumpCanvas, { srgb: false, rx: 0.5, ry: 0.5 });

// Ledgestone (Worley) — texture spans 2m
function stoneCanvas(size, cells, palette, mortar) {
  const pts = [];
  for (let cy = 0; cy < cells; cy++) for (let cx = 0; cx < cells; cx++) pts.push([cx + rr(0.1, 0.9), cy + rr(0.1, 0.9), palette[Math.floor(rand() * palette.length)], rr(-14, 14)]);
  const n = tileNoise(size, [8, 32, 64]);
  const bump = new Uint8ClampedArray(size * size);
  const col = pixelCanvas(size, size, (i, x, y) => {
    const gx = (x / size) * cells, gy = (y / size) * cells * 2.2; // stones wider than tall
    const cx0 = Math.floor(gx), cy0 = Math.floor(gy % cells);
    let d1 = 9, d2 = 9, best = null;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const cx = (cx0 + ox + cells) % cells, cy = (cy0 + oy + cells) % cells;
      const p = pts[cy * cells + cx];
      const px = cx0 + ox + (p[0] - Math.floor(p[0])), py = Math.floor(gy) + oy + (p[1] - Math.floor(p[1]));
      const dx = (gx - px) * 0.8, dy = (gy - py) * 1.0; const d = Math.sqrt(dx * dx + dy * dy);
      if (d < d1) { d2 = d1; d1 = d; best = p; } else if (d < d2) d2 = d;
    }
    const edge = d2 - d1; const nn = (n[i] - 0.5) * 30;
    if (edge < 0.07) { bump[i] = 40; return [mortar[0] + nn * 0.4, mortar[1] + nn * 0.4, mortar[2] + nn * 0.4]; }
    bump[i] = 150 + Math.min(1, edge * 3) * 80 + nn;
    const c = best[2]; const s = best[3] + nn;
    return [c[0] + s, c[1] + s, c[2] + s];
  });
  const b = pixelCanvas(size, size, (i) => [bump[i], bump[i], bump[i]]);
  return [col, b];
}
const [stoneC, stoneB] = stoneCanvas(512, 7, [[128, 118, 104], [150, 140, 124], [104, 98, 90], [138, 124, 106], [116, 110, 104]], [70, 68, 66]);
const stoneMap = toTex(stoneC, { rx: 0.5, ry: 0.5 });
const stoneBump = toTex(stoneB, { srgb: false, rx: 0.5, ry: 0.5 });

// Wood porch boards
const woodN = tileNoise(256, [4, 32]);
const woodMap = toTex(pixelCanvas(256, 256, (i, x) => {
  const m = x % 32; const v = 92 + woodN[i] * 30 - (m < 2 ? 40 : 0); return [v, v * 0.86, v * 0.72];
}), { rx: 1, ry: 1 });

// Interior window glow — a handful of rooms
function interiorCanvas(k) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 384; const g = c.getContext('2d');
  const warmth = [['#ffd49a', '#e8a35e', '#6e3f22'], ['#ffe2b0', '#f0b575', '#7c5230'], ['#ffc98a', '#d98b4c', '#5a3219']][k % 3];
  const base = g.createLinearGradient(0, 0, 0, 384);
  base.addColorStop(0, warmth[0]); base.addColorStop(0.55, warmth[1]); base.addColorStop(1, warmth[2]);
  g.fillStyle = base; g.fillRect(0, 0, 256, 384);
  // ceiling shadow band
  const cs = g.createLinearGradient(0, 0, 0, 70); cs.addColorStop(0, 'rgba(60,30,15,.55)'); cs.addColorStop(1, 'rgba(60,30,15,0)');
  g.fillStyle = cs; g.fillRect(0, 0, 256, 70);
  // lamp hotspot
  const lx = rr(50, 206), ly = rr(120, 260);
  const hot = g.createRadialGradient(lx, ly, 4, lx, ly, rr(110, 190));
  hot.addColorStop(0, 'rgba(255,246,220,1)'); hot.addColorStop(0.3, 'rgba(255,214,150,.55)'); hot.addColorStop(1, 'rgba(255,190,120,0)');
  g.fillStyle = hot; g.fillRect(0, 0, 256, 384);
  // furniture silhouette
  if (k % 2 === 0) {
    g.fillStyle = 'rgba(52,26,14,.75)';
    g.beginPath(); g.roundRect(rr(-40, 60), rr(290, 320), rr(140, 220), 140, 22); g.fill();
  } else {
    g.fillStyle = 'rgba(62,34,18,.55)'; g.fillRect(rr(20, 150), rr(150, 210), rr(50, 90), 240);
  }
  // curtains
  const curtain = ['rgba(120,40,28,.92)', 'rgba(236,222,196,.85)', 'rgba(60,70,58,.9)'][k % 3];
  for (const side of [0, 1]) {
    const w = rr(34, 52); const x0 = side ? 256 - w : 0;
    const cg = g.createLinearGradient(x0, 0, x0 + w, 0);
    for (let s = 0; s <= 6; s++) cg.addColorStop(s / 6, s % 2 ? curtain : curtain.replace(/[\d.]+\)$/, '.6)'));
    g.fillStyle = cg; g.fillRect(x0, 0, w, 384);
  }
  return c;
}
const interiors = [0, 1, 2, 3, 4, 5].map((k) => toTex(interiorCanvas(k)));

// Soft round sprite for snowflakes
const flakeTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();

/* =========================================================================
   Materials
   ========================================================================= */
const M = {
  siding: new THREE.MeshStandardMaterial({ map: sidingMap, bumpMap: sidingBump, bumpScale: 1.2, roughness: 0.82, color: 0xf3efe7 }),
  trim: new THREE.MeshStandardMaterial({ color: 0xf1ede5, roughness: 0.6 }),
  sash: new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.45 }),
  shutter: new THREE.MeshStandardMaterial({ color: 0x18231f, roughness: 0.55 }),
  snow: new THREE.MeshStandardMaterial({ map: snowMap, bumpMap: snowBump, bumpScale: 2.0, roughness: 0.92, color: 0xf2f6fb }),
  roofEdge: new THREE.MeshStandardMaterial({ color: 0x25272b, roughness: 0.8 }),
  gutter: new THREE.MeshStandardMaterial({ color: 0x2c2a27, roughness: 0.4, metalness: 0.3 }),
  stone: new THREE.MeshStandardMaterial({ map: stoneMap, bumpMap: stoneBump, bumpScale: 2.2, roughness: 0.9 }),
  wetStone: new THREE.MeshStandardMaterial({ map: stoneMap, bumpMap: stoneBump, bumpScale: 1.2, roughness: 0.38, color: 0x8a8a90 }),
  asphalt: new THREE.MeshStandardMaterial({ color: 0x2c2e33, roughness: 0.42, bumpMap: snowBump, bumpScale: 1.0 }),
  wood: new THREE.MeshStandardMaterial({ map: woodMap, roughness: 0.7 }),
  door: new THREE.MeshStandardMaterial({ color: 0x5e1216, roughness: 0.35 }),
  doorPanel: new THREE.MeshStandardMaterial({ color: 0x4c0e12, roughness: 0.4 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc9a25a, roughness: 0.3, metalness: 0.9 }),
  garage: new THREE.MeshStandardMaterial({ color: 0x2b2926, roughness: 0.6 }),
  garageBoard: new THREE.MeshStandardMaterial({ color: 0x24221f, roughness: 0.65 }),
  bark: new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.95 }),
  needles: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide, flatShading: true }),
  boxwood: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }),
  garland: new THREE.MeshStandardMaterial({ color: 0x1f3a26, roughness: 0.95, flatShading: true }),
  bow: new THREE.MeshStandardMaterial({ color: 0x8e1016, roughness: 0.35 }),
  black: new THREE.MeshStandardMaterial({ color: 0x121314, roughness: 0.5, metalness: 0.4 }),
  planter: new THREE.MeshStandardMaterial({ color: 0x1b1d1f, roughness: 0.5 }),
  farTrees: new THREE.MeshStandardMaterial({ color: 0x0c1714, roughness: 1 }),
  farHouse: new THREE.MeshStandardMaterial({ color: 0x3b4450, roughness: 0.9 }),
  ceiling: new THREE.MeshStandardMaterial({ color: 0xd9cbb4, roughness: 0.8 }),
};
function glassMat(i, bright) {
  return new THREE.MeshStandardMaterial({ color: 0x07090c, roughness: 0.1, emissive: 0xffffff, emissiveMap: interiors[i % interiors.length], emissiveIntensity: bright });
}
function glowMat(color, k) { return new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(k) }); }

/* =========================================================================
   Geometry helpers
   ========================================================================= */
function add(mesh, parent = scene, cast = true, recv = true) { mesh.castShadow = cast; mesh.receiveShadow = recv; parent.add(mesh); return mesh; }
function box(w, h, d, mat, x, y, z, parent = scene, cast = true) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return add(m, parent, cast); }
function scaleUV(geo, su, sv) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return geo; }

// A box from A to B with a given cross-section; `up` hints the section's orientation
function beam(A, B, w, h, mat, parent = scene, up = V(0, 1, 0), cast = true) {
  const d = B.clone().sub(A); const L = d.length();
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, L), mat);
  m.position.copy(A).addScaledVector(d, 0.5);
  const z = d.normalize(); const x = new THREE.Vector3().crossVectors(up, z).normalize(); const y = new THREE.Vector3().crossVectors(z, x);
  m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  return add(m, parent, cast);
}
function cylGeo(A, B, r0, r1, seg = 8) {
  const d = B.clone().sub(A); const L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, seg, 1, true);
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
  g.applyQuaternion(q); const mid = A.clone().addScaledVector(d, 0.5); g.translate(mid.x, mid.y, mid.z);
  return g;
}
// Wall in the XY plane (facing +z) from a 2D outline, UVs in metres
function wallShape(pts, mat) {
  const s = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s), mat); m.receiveShadow = true; m.castShadow = true; return m;
}
function frontWall(x0, x1, y0, yEave, yPeak, z, mat = M.siding) {
  const pts = [[x0, y0], [x1, y0], [x1, yEave]]; if (yPeak) pts.push([(x0 + x1) / 2, yPeak]); pts.push([x0, yEave]);
  const m = wallShape(pts, mat); m.position.z = z; scene.add(m); return m;
}
function sideWall(z0, z1, y0, yEave, yPeak, x, facing, mat = M.siding) {
  // rotating to face -x maps shape-x to +z; facing +x maps it to -z, so negate
  const u = (zz) => (facing > 0 ? -zz : zz);
  const pts = [[u(z0), y0], [u(z1), y0], [u(z1), yEave]]; if (yPeak) pts.push([u((z0 + z1) / 2), yPeak]); pts.push([u(z0), yEave]);
  const m = wallShape(pts, mat); m.rotation.y = facing > 0 ? Math.PI / 2 : -Math.PI / 2;
  m.position.x = x; scene.add(m); return m;
}

/* --- bulbs -------------------------------------------------------------- */
const bulbs = { c9: [], mini: [], stake: [] };
function addBulb(type, p, k = 1) { bulbs[type].push([p.x, p.y, p.z, k]); }
function bulbLine(A, B, spacing = 0.3, type = 'c9') {
  const d = B.clone().sub(A); const n = Math.max(1, Math.round(d.length() / spacing));
  for (let i = 0; i <= n; i++) addBulb(type, A.clone().addScaledVector(d, i / n), rr(0.82, 1.1));
}
const washLights = [];
function washLine(A, B, out, spacing = 1.7, intensity = 0.5, dist = 3.5) {
  const d = B.clone().sub(A); const n = Math.max(1, Math.round(d.length() / spacing));
  for (let i = 0; i < n; i++) {
    const p = A.clone().addScaledVector(d, (i + 0.5) / n).add(out);
    washLights.push([p, intensity, dist]);
  }
}
// Lights along a roof edge: the bulbs plus the warm spill they throw
function c9Edge(A, B, out = V(0, 0.2, 0.35)) { bulbLine(A, B); washLine(A, B, out); }

function plight(p, color, intensity, dist, parent = scene) {
  const l = new THREE.PointLight(color, intensity, dist, 2); l.position.copy(p); parent.add(l); return l;
}

/* =========================================================================
   Roofs
   ========================================================================= */
// Side-gable roof, ridge along X
function roofX(x0, x1, zF, zB, yEave, yRidge, oe = 0.45, or = 0.35, t = 0.16) {
  const run = (zF - zB) / 2, rise = yRidge - yEave, a = Math.atan2(rise, run), zc = (zF + zB) / 2;
  const S = (run + oe) / Math.cos(a), L = (x1 - x0) + 2 * or, xc = (x0 + x1) / 2;
  const eaveY = yEave - oe * Math.tan(a);
  for (const side of [1, -1]) {
    const g = scaleUV(new THREE.BoxGeometry(L, t, S), L, S);
    const m = new THREE.Mesh(g, [M.snow, M.snow, M.snow, M.trim, M.roofEdge, M.roofEdge]);
    const midZ = zc + side * (S / 2) * Math.cos(a), midY = yRidge - (S / 2) * Math.sin(a);
    m.position.set(xc, midY + t / 2 * Math.cos(a), midZ + side * (t / 2) * Math.sin(a));
    m.rotation.x = side * a; add(m);
    // fascia + gutter on the eave
    const ez = zc + side * (run + oe);
    box(L, 0.22, 0.05, M.trim, xc, eaveY - 0.06, ez + side * 0.02);
    box(L, 0.12, 0.12, M.gutter, xc, eaveY - 0.1, ez + side * 0.08, scene, false);
  }
  // rake trim
  for (const x of [x0 - or, x1 + or]) for (const side of [1, -1]) {
    beam(V(x, eaveY - 0.02, zc + side * (run + oe)), V(x, yRidge + 0.02, zc), 0.05, 0.24, M.trim);
  }
  return { a, eaveY, eaveZ: zF + oe, ridgeY: yRidge + t, zc, xl: x0 - or, xr: x1 + or };
}
// Front-gable roof, ridge along Z
function roofZ(xc, half, zF, zB, yEave, yRidge, oe = 0.3, of = 0.3, t = 0.16, rakeTrim = true) {
  const rise = yRidge - yEave, a = Math.atan2(rise, half);
  const S = (half + oe) / Math.cos(a), L = (zF - zB) + of, zc = (zF + of + zB) / 2;
  const eaveY = yEave - oe * Math.tan(a);
  for (const side of [-1, 1]) {
    const g = scaleUV(new THREE.BoxGeometry(S, t, L), S, L);
    const m = new THREE.Mesh(g, [M.roofEdge, M.snow, M.snow, M.trim, M.snow, M.roofEdge]);
    m.position.set(xc + side * (S / 2) * Math.cos(a) + side * (t / 2) * Math.sin(a), yRidge - (S / 2) * Math.sin(a) + (t / 2) * Math.cos(a), zc);
    m.rotation.z = -side * a; add(m);
  }
  const fz = zF + of;
  if (rakeTrim) for (const side of [-1, 1]) beam(V(xc + side * (half + oe), eaveY - 0.06, fz + 0.03), V(xc, yRidge - 0.04, fz + 0.03), 0.26, 0.05, M.trim, scene, V(0, 0, 1));
  return { a, eaveY, frontZ: fz, ridgeY: yRidge + t, left: V(xc - half - oe, eaveY, fz), peak: V(xc, yRidge + t * 1.2, fz), right: V(xc + half + oe, eaveY, fz) };
}

/* =========================================================================
   Windows, doors, trim
   ========================================================================= */
function windowUnit(cx, y0, w, h, z, { cols = 2, rows = 2, bright = 1.1, room = 0, shutters = false, sillSnow = true } = {}) {
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassMat(room, bright));
  glass.position.set(cx, y0 + h / 2, z + 0.012); scene.add(glass);
  const f = 0.055, fd = 0.05;
  box(w + 2 * f, f, fd, M.sash, cx, y0 - f / 2, z + 0.03, scene, false);
  box(w + 2 * f, f, fd, M.sash, cx, y0 + h + f / 2, z + 0.03, scene, false);
  box(f, h, fd, M.sash, cx - w / 2 - f / 2, y0 + h / 2, z + 0.03, scene, false);
  box(f, h, fd, M.sash, cx + w / 2 + f / 2, y0 + h / 2, z + 0.03, scene, false);
  box(w, 0.045, fd, M.sash, cx, y0 + h * 0.5, z + 0.035, scene, false);
  for (let c = 1; c < cols; c++) box(0.02, h, 0.02, M.sash, cx - w / 2 + (w * c) / cols, y0 + h / 2, z + 0.03, scene, false);
  for (let r = 1; r < rows * 2; r++) if (r !== rows) box(w, 0.02, 0.02, M.sash, cx, y0 + (h * r) / (rows * 2), z + 0.03, scene, false);
  const cw = 0.13, W2 = w + 2 * f;
  box(cw, h + 2 * f, 0.06, M.trim, cx - W2 / 2 - cw / 2, y0 + h / 2, z + 0.03, scene, false);
  box(cw, h + 2 * f, 0.06, M.trim, cx + W2 / 2 + cw / 2, y0 + h / 2, z + 0.03, scene, false);
  box(W2 + 2 * cw + 0.06, 0.2, 0.08, M.trim, cx, y0 + h + f + 0.1, z + 0.04);
  box(W2 + 2 * cw + 0.14, 0.05, 0.13, M.trim, cx, y0 + h + f + 0.225, z + 0.065);
  box(W2 + 2 * cw + 0.1, 0.06, 0.15, M.trim, cx, y0 - f - 0.03, z + 0.075);
  if (sillSnow) box(W2 + 2 * cw + 0.06, 0.035, 0.12, M.snow, cx, y0 - f + 0.015, z + 0.075, scene, false);
  if (shutters) for (const s of [-1, 1]) {
    const sx = cx + s * (W2 / 2 + cw + 0.25);
    box(0.44, h + 2 * f, 0.04, M.shutter, sx, y0 + h / 2, z + 0.03);
    for (let k = 0; k < 2; k++) box(0.34, 0.02, 0.012, M.sash, sx, y0 + h * (0.34 + k * 0.33), z + 0.055, scene, false);
  }
  return { cx, cy: y0 + h / 2, top: y0 + h, z };
}

/* =========================================================================
   Vegetation & décor
   ========================================================================= */
function jitterGeo(geo, amt) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + rr(-amt, amt), p.getY(i) + rr(-amt, amt), p.getZ(i) + rr(-amt, amt));
  geo.computeVertexNormals(); return geo;
}
const GREEN = [0.018, 0.045, 0.03], GREEN2 = [0.03, 0.062, 0.038], SNOWC = [0.55, 0.6, 0.68];

function spruce(x, z, h, r, { lights = true, density = 1, parent = scene, base = 0 } = {}) {
  const g = new THREE.Group(); g.position.set(x, base, z); parent.add(g);
  const trunk = new THREE.Mesh(cylGeo(V(0, 0, 0), V(0, h * 0.3, 0), 0.07 * r, 0.05 * r, 8), M.bark); add(trunk, g);
  const tiers = Math.round(12 + h * 1.25);
  const radiusAt = (yy) => r * Math.pow(clamp01(1 - (yy - 0.45) / (h - 0.45)), 0.95) + 0.12;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1); const y = 0.45 + t * (h - 1.0);
    const rad = radiusAt(y) * rr(0.92, 1.05); const th = Math.max(0.5, (h / tiers) * 2.8);
    const geo = new THREE.ConeGeometry(rad, th, 42, 5, true);
    const pos = geo.attributes.position; const col = [];
    const ph = rr(0, 6.28), lobes = Math.round(rr(7, 12));
    for (let k = 0; k < pos.count; k++) {
      let vx = pos.getX(k), vy = pos.getY(k), vz = pos.getZ(k);
      const rxz = Math.hypot(vx, vz);
      if (rxz > 0.001) {
        const ang = Math.atan2(vz, vx); const j = 1 + 0.16 * Math.sin(ang * lobes + ph) + rr(-0.1, 0.1);
        vx *= j; vz *= j; vy += rr(-0.05, 0.05) - 0.2 * (rxz / rad) * (rxz / rad);
      }
      pos.setXYZ(k, vx, vy, vz);
      const up = clamp01((vy + th / 2) / th);
      const s = rand() < 0.28 + up * 0.25 ? rr(0.45, 0.95) : rr(0, 0.12);
      const base = rand() < 0.5 ? GREEN : GREEN2;
      col.push(lerp(base[0], SNOWC[0], s), lerp(base[1], SNOWC[1], s), lerp(base[2], SNOWC[2], s));
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, M.needles); mesh.position.y = y; mesh.rotation.y = rand() * 6.28; add(mesh, g);
  }
  const n = Math.round(h * r * 26 * density);
  for (let k = 0; k < n; k++) {
    const yy = 0.55 + rand() * (h - 1.2); const rad = radiusAt(yy) * rr(0.8, 1.0); const a = rand() * 6.283;
    if (lights) addBulb('mini', V(x + Math.cos(a) * rad, base + yy + rr(-0.12, 0.05), z + Math.sin(a) * rad), rr(0.55, 1.1));
  }
  if (lights) {
    plight(V(x, base + h * 0.3, z + r * 0.9), WARM_WASH, 2.2 * r, r * 3.2, xmas);
    plight(V(x, base + h * 0.62, z + r * 0.6), WARM_WASH, 1.3 * r, r * 2.6, xmas);
  }
  return g;
}

function perpBasis(d) {
  const a = Math.abs(d.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(d, a).normalize(); const v = new THREE.Vector3().crossVectors(d, u).normalize(); return [u, v];
}
function deciduous(x, z, h, { wrapDepth = 3 } = {}) {
  const segs = [];
  function grow(A, dir, len, rad, depth) {
    const B = A.clone().addScaledVector(dir, len);
    segs.push({ A, B, r0: rad, r1: rad * 0.7, depth });
    if (depth >= 5) return;
    const n = depth === 0 ? 3 : (rand() < 0.5 ? 2 : 3);
    const [u, v] = perpBasis(dir);
    for (let i = 0; i < n; i++) {
      const tilt = depth === 0 ? rr(0.5, 0.8) : rr(0.3, 0.7), spin = (i / n) * 6.283 + rr(-0.5, 0.5);
      const nd = dir.clone().multiplyScalar(Math.cos(tilt)).add(u.clone().multiplyScalar(Math.cos(spin) * Math.sin(tilt))).add(v.clone().multiplyScalar(Math.sin(spin) * Math.sin(tilt)));
      nd.y += depth < 2 ? 0.35 : 0.1; nd.normalize();
      const start = depth === 0 ? A.clone().addScaledVector(dir, len * (0.62 + i * 0.16)) : (depth < 3 ? A.clone().lerp(B, rr(0.55, 1.0)) : B);
      grow(start, nd, len * rr(0.62, 0.8), rad * (depth === 0 ? 0.62 : 0.68), depth + 1);
    }
  }
  grow(V(x, 0, z), V(rr(-0.05, 0.05), 1, rr(-0.05, 0.05)).normalize(), h * 0.44, 0.26, 0);
  // the leader keeps going up through the crown
  grow(V(x, h * 0.4, z), V(rr(-0.08, 0.08), 1, rr(-0.08, 0.08)).normalize(), h * 0.3, 0.16, 1);
  const geos = segs.map((s) => cylGeo(s.A, s.B, s.r0, s.r1, s.depth < 2 ? 10 : 5));
  add(new THREE.Mesh(mergeGeometries(geos), M.bark));
  // snow resting on the upper side of the bigger limbs
  const snowGeos = segs.filter((s) => s.depth >= 1 && s.depth <= 3 && (s.B.y - s.A.y) / s.A.distanceTo(s.B) < 0.8)
    .map((s) => cylGeo(s.A.clone().add(V(0, s.r0 * 0.75, 0)), s.B.clone().add(V(0, s.r1 * 0.75, 0)), s.r0 * 0.55, s.r1 * 0.5, 5));
  if (snowGeos.length) add(new THREE.Mesh(mergeGeometries(snowGeos), M.snow), scene, false);
  // pro trunk-and-limb wrap
  for (const s of segs) {
    const d = s.B.clone().sub(s.A); const L = d.length(); const dn = d.clone().normalize(); const [u, v] = perpBasis(dn);
    if (s.depth > wrapDepth) {                       // fine twigs: a few scattered points of light
      const k = Math.round(L * 3);
      for (let i = 0; i < k; i++) addBulb('mini', s.A.clone().addScaledVector(d, rand()), rr(0.4, 0.9));
      continue;
    }
    const pitch = [0.1, 0.13, 0.17, 0.22][s.depth]; const turns = L / pitch; const ph = rand() * 6.28;
    const steps = Math.round(turns * [16, 12, 9, 7][s.depth]);
    for (let i = 0; i < steps; i++) {
      const t = i / steps; const ang = ph + t * turns * 6.283; const rad = lerp(s.r0, s.r1, t) + 0.025;
      const p = s.A.clone().addScaledVector(d, t).add(u.clone().multiplyScalar(Math.cos(ang) * rad)).add(v.clone().multiplyScalar(Math.sin(ang) * rad));
      addBulb('mini', p, rr(0.6, 1.05));
    }
  }
  const tipY = segs.reduce((m, s) => Math.max(m, s.B.y), 0);
  plight(V(x, 1.3, z + 0.6), WARM_WASH, 3, 7, xmas);
  plight(V(x, tipY * 0.55, z + 0.4), WARM_WASH, 4, 7, xmas);
}

function boxwood(x, z, s, { lights = true, sy = 0.78 } = {}) {
  const geo = new THREE.IcosahedronGeometry(1, 3); const pos = geo.attributes.position; const col = [];
  for (let i = 0; i < pos.count; i++) {
    const v = V(pos.getX(i), pos.getY(i), pos.getZ(i)); const k = 1 + rr(-0.07, 0.07);
    pos.setXYZ(i, v.x * s * k, v.y * s * sy * k, v.z * s * k);
    const snow = v.y > 0.45 && rand() < 0.75 ? rr(0.5, 0.95) : rr(0, 0.1);
    col.push(lerp(GREEN2[0], SNOWC[0], snow), lerp(GREEN2[1], SNOWC[1], snow), lerp(GREEN2[2], SNOWC[2], snow));
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, M.boxwood); m.position.set(x, s * sy * 0.8, z); add(m);
  // net lights over the top 3/4
  const rows = Math.round(s * 9);
  for (let r = 0; r < rows; r++) {
    const lat = -0.35 + (r / rows) * 1.9; if (lat > 1.5) continue;
    const ring = Math.max(1, Math.round(Math.cos(lat) * s * 6.283 / 0.16));
    for (let k = 0; k < ring; k++) {
      const lon = (k / ring) * 6.283 + r * 0.3;
      const p = V(Math.cos(lat) * Math.cos(lon) * s * 1.04, Math.sin(lat) * s * sy * 1.04, Math.cos(lat) * Math.sin(lon) * s * 1.04);
      if (lights) addBulb('mini', p.add(m.position), rr(0.55, 1.0));
    }
  }
}

function wreath(x, y, z, R = 0.34, { bowBelow = true } = {}) {
  const g = jitterGeo(new THREE.TorusGeometry(R, R * 0.3, 10, 40), R * 0.09);
  const m = new THREE.Mesh(g, M.garland); m.position.set(x, y, z + R * 0.3); add(m, xmas);
  for (let i = 0; i < 38; i++) {
    const a = (i / 38) * 6.283 + rr(-0.05, 0.05); const rad = R + rr(-0.6, 0.6) * R * 0.3;
    addBulb('mini', V(x + Math.cos(a) * rad, y + Math.sin(a) * rad, z + R * 0.3 + R * 0.26), rr(0.7, 1.1));
  }
  const by = bowBelow ? y - R * 0.95 : y + R * 0.95; const bz = z + R * 0.62;
  for (const s of [-1, 1]) {
    const loop = new THREE.Mesh(new THREE.SphereGeometry(R * 0.22, 12, 8), M.bow); loop.scale.set(1.25, 0.8, 0.45);
    loop.position.set(x + s * R * 0.24, by + R * 0.04, bz); loop.rotation.z = s * 0.35; add(loop, xmas);
    beam(V(x + s * R * 0.05, by, bz), V(x + s * R * 0.28, by - R * 0.62, bz - 0.01), R * 0.1, 0.012, M.bow, xmas, V(0, 0, 1));
  }
  add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.09, 10, 8), M.bow), xmas).position.set(x, by + R * 0.03, bz + 0.02);
}

function garlandAlong(curve, radius = 0.09, perM = 16, parent = xmas) {
  const L = curve.getLength();
  const geo = jitterGeo(new THREE.TubeGeometry(curve, Math.ceil(L * 14), radius, 7, false), radius * 0.35);
  add(new THREE.Mesh(geo, M.garland), parent);
  const n = Math.round(L * perM);
  for (let i = 0; i < n; i++) {
    const t = clamp01((i + rand() * 0.6) / n); const p = curve.getPointAt(t);
    const [u, v] = perpBasis(curve.getTangentAt(t)); const a = rand() * 6.283;
    addBulb('mini', p.add(u.multiplyScalar(Math.cos(a) * radius * 1.1)).add(v.multiplyScalar(Math.sin(a) * radius * 1.1)), rr(0.65, 1.1));
  }
}
function swag(A, B, sag) {
  const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; const p = A.clone().lerp(B, t); p.y -= sag * 4 * t * (1 - t); pts.push(p); }
  return new THREE.CatmullRomCurve3(pts);
}

function lantern(p, { post = false } = {}) {
  const g = new THREE.Group(); g.position.copy(p); scene.add(g);
  if (post) {
    const ph = p.y - 0.25;
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, ph, 10), M.black), g).position.y = -0.25 - ph / 2;
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 10), M.black), g).position.y = -p.y + 0.06;
  }
  add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.26), M.black), g).position.y = -0.2;
  add(new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.16, 4), M.black), g).position.y = 0.26;
  g.children[g.children.length - 1].rotation.y = Math.PI / 4;
  add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.36, 0.2), glowMat(LAMP, 2.2)), g, false, false);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.4, 0.025), M.black), g).position.set(dx * 0.1, 0, dz * 0.1);
  plight(p.clone().add(V(0, 0, 0.25)), LAMP, 2, 8);
  return g;
}

/* =========================================================================
   Ground & environment
   ========================================================================= */
function environment() {
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color(0x071631) }, mid: { value: new THREE.Color(0x14305a) },
      hor: { value: new THREE.Color(0x3b6390) }, glow: { value: new THREE.Color(0x7a7a98) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 top, mid, hor, glow; varying vec3 vP;
      void main(){ float h = max(vP.y, 0.0);
        vec3 c = mix(hor, mid, smoothstep(0.0, 0.16, h)); c = mix(c, top, smoothstep(0.12, 0.62, h));
        c += glow * 0.22 * pow(1.0 - h, 10.0) * (0.6 + 0.4 * smoothstep(-0.6, 0.6, vP.x));
        gl_FragColor = vec4(c, 1.0); }`,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), skyMat));

  const hemi = new THREE.HemisphereLight(0x6e8fc4, 0x1c2536, LIT ? 1.0 : 1.08); scene.add(hemi);
  const moon = new THREE.DirectionalLight(0xa9c1e8, 0.75);
  moon.position.set(-28, 34, 26); moon.target.position.set(2, 0, 0);
  moon.castShadow = true; moon.shadow.mapSize.set(4096, 4096);
  Object.assign(moon.shadow.camera, { left: -38, right: 38, top: 32, bottom: -26, near: 1, far: 140 });
  moon.shadow.bias = -0.0003; moon.shadow.normalBias = 0.03; moon.shadow.radius = 5;
  scene.add(moon, moon.target);

  const ground = new THREE.Mesh(scaleUV(new THREE.PlaneGeometry(500, 500, 1, 1), 500, 500), M.snow);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // falling snow
  const n = 2600, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = rr(-26, 30); pos[i * 3 + 1] = rr(0, 18); pos[i * 3 + 2] = rr(-6, 34); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.075, map: flakeTex, transparent: true, depthWrite: false, color: 0xc8d3e4, opacity: 0.8 })));

  // distant tree line
  const farGeo = () => {
    const parts = [];
    for (let k = 0; k < 8; k++) {
      const t = k / 8; const c = new THREE.ConeGeometry(0.34 * (1 - t) + 0.03, 0.26, 12, 1);
      const p = c.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) { const j = rr(0.7, 1.25); p.setXYZ(i, p.getX(i) * j, p.getY(i) + rr(-0.03, 0.02), p.getZ(i) * j); }
      parts.push(c.translate(0, 0.1 + t * 0.84, 0));
    }
    return mergeGeometries(parts);
  };
  const far = [];
  for (let i = 0; i < 230; i++) far.push([rr(-90, 100), rr(-75, -20), rr(11, 24)]);
  for (let i = 0; i < 60; i++) { const s = rand() < 0.5 ? -1 : 1; far.push([s > 0 ? rr(30, 75) : rr(-70, -30), rr(-18, 12), rr(11, 20)]); }
  const mm = new THREE.Matrix4(); const q = new THREE.Quaternion();
  for (let g = 0; g < 3; g++) {
    const mine = far.filter((_, i) => i % 3 === g);
    const inst = new THREE.InstancedMesh(farGeo(), M.farTrees, mine.length);
    mine.forEach((f, i) => { const hh = f[2], wd = hh * rr(0.8, 1.05); q.setFromAxisAngle(V(0, 1, 0), rand() * 6.28); mm.compose(V(f[0], 0, f[1]), q, V(wd, hh, wd)); inst.setMatrixAt(i, mm); });
    inst.castShadow = true; scene.add(inst);
  }

}

/* =========================================================================
   The house
   ========================================================================= */
function house() {
  const E = 6.4;                                   // main eave height
  const T50 = Math.tan(0.873);                     // 50° gable pitch
  // ---- main block: x -6.5..6.5, z -4.5..4.5
  frontWall(-6.5, 6.5, 0.55, E, null, 4.5);
  frontWall(-6.5, 6.5, 0.55, E, null, -4.5).rotation.y = Math.PI;
  sideWall(-4.5, 4.5, 0.55, E, E + 3.4, -6.5, -1);
  sideWall(-4.5, 4.5, 0.55, E, E + 3.4, 6.5, 1);
  box(13.1, 0.6, 9.1, M.stone, 0, 0.3, 0);                 // stone water table
  const main = roofX(-6.5, 6.5, 4.5, -4.5, E, E + 3.4);
  for (const x of [-6.43, 6.43]) box(0.16, E - 0.55, 0.16, M.trim, x, (E + 0.55) / 2, 4.46);

  // chimney
  box(1.15, 5.4, 1.0, M.stone, -4.8, E + 2.2, -1.4);
  box(1.35, 0.16, 1.2, M.roofEdge, -4.8, E + 4.98, -1.4);
  box(1.3, 0.1, 1.15, M.snow, -4.8, E + 5.1, -1.4, scene, false);

  // ---- left bay: x -5.7..-1.9, projects to z 5.4
  const bx0 = -5.7, bx1 = -1.9, bz = 5.4, bxc = (bx0 + bx1) / 2, bh = (bx1 - bx0) / 2;
  frontWall(bx0, bx1, 0.55, E, E + bh * T50, bz);
  sideWall(4.5, bz, 0.55, E, null, bx0, -1);
  sideWall(4.5, bz, 0.55, E, null, bx1, 1);
  box(bx1 - bx0 + 0.1, 1.0, bz - 4.5 + 0.05, M.stone, bxc, 0.5, (bz + 4.5) / 2 + 0.03);
  for (const x of [bx0 + 0.07, bx1 - 0.07]) box(0.16, E - 1.0, 0.16, M.trim, x, (E + 1.0) / 2, bz - 0.03);
  box(bx1 - bx0 + 0.04, 0.14, 0.12, M.trim, bxc, 1.03, bz + 0.03);   // stone cap
  box(bx1 - bx0 + 0.02, 0.2, 0.08, M.trim, bxc, E - 0.1, bz + 0.03);  // frieze
  const bay = roofZ(bxc, bh, bz, 1.2, E, E + bh * T50, 0.28, 0.32);
  windowUnit(bxc - 0.57, 1.25, 1.0, 1.95, bz, { room: 0, bright: 1.25, rows: 2 });
  windowUnit(bxc + 0.57, 1.25, 1.0, 1.95, bz, { room: 0, bright: 1.2, rows: 2 });
  const u1 = windowUnit(bxc - 0.57, 4.1, 0.95, 1.6, bz, { room: 2, bright: 0.9 });
  const u2 = windowUnit(bxc + 0.57, 4.1, 0.95, 1.6, bz, { room: 2, bright: 0.85 });
  windowUnit(bxc, E + 0.5, 0.7, 0.75, bz, { room: 4, bright: 0.35, cols: 2, rows: 1 });

  // ---- porch: x -1.9..6.5, z 4.5..7.2
  const px0 = -1.9, px1 = 6.5, pz = 7.2, floorY = 0.55, colZ = pz - 0.2;
  box(px1 - px0, floorY, pz - 4.5, M.stone, (px0 + px1) / 2, floorY / 2, (pz + 4.5) / 2);
  box(px1 - px0 + 0.1, 0.08, pz - 4.5 + 0.1, M.wood, (px0 + px1) / 2, floorY + 0.04, (pz + 4.5) / 2 + 0.03);
  const sx = -0.1;
  for (let s = 0; s < 3; s++) box(2.4, floorY - s * 0.18, 0.36, M.wetStone, sx, (floorY - s * 0.18) / 2, pz + 0.18 + s * 0.36);
  const cols = [-1.72, 1.52, 3.95, 6.32];
  for (const cx of cols) {
    box(0.26, 2.72, 0.26, M.trim, cx, floorY + 0.26 + 1.36, colZ);
    box(0.4, 0.26, 0.4, M.trim, cx, floorY + 0.13, colZ);
    box(0.36, 0.14, 0.36, M.trim, cx, floorY + 3.05, colZ);
  }
  const beamY = floorY + 3.29;                     // 3.84
  box(px1 - px0 + 0.3, 0.34, 0.24, M.trim, (px0 + px1) / 2, beamY, colZ);
  box(px1 - px0 + 0.2, 0.05, pz - 4.5, M.ceiling, (px0 + px1) / 2, beamY - 0.12, (pz + 4.5) / 2, scene, false);
  const wallY = 4.42, pRun = pz - 4.5 + 0.35, pa = Math.atan2(wallY - (beamY + 0.17), pz - 0.2 - 4.5), pS = pRun / Math.cos(pa);
  const pr = new THREE.Mesh(scaleUV(new THREE.BoxGeometry(px1 - px0 + 0.55, 0.14, pS), 9, 3), [M.snow, M.snow, M.snow, M.trim, M.roofEdge, M.snow]);
  pr.position.set((px0 + px1) / 2, wallY - (pS / 2) * Math.sin(pa) + 0.07, 4.5 + (pS / 2) * Math.cos(pa)); pr.rotation.x = pa; add(pr);
  const porchEaveY = wallY - pS * Math.sin(pa), porchEaveZ = 4.5 + pS * Math.cos(pa);
  box(px1 - px0 + 0.55, 0.2, 0.05, M.trim, (px0 + px1) / 2, porchEaveY - 0.04, porchEaveZ + 0.02);
  box(px1 - px0 + 0.55, 0.12, 0.12, M.gutter, (px0 + px1) / 2, porchEaveY - 0.1, porchEaveZ + 0.08, scene, false);
  const railY = floorY + 0.9;
  const rails = [[V(1.52 + 0.15, railY, colZ), V(3.95 - 0.15, railY, colZ)], [V(3.95 + 0.15, railY, colZ), V(6.32 - 0.15, railY, colZ)], [V(6.32, railY, colZ - 0.15), V(6.32, railY, 4.62)], [V(-1.72, railY, colZ - 0.15), V(-1.72, railY, bz + 0.1)]];
  for (const [A, B] of rails) {
    beam(A, B, 0.1, 0.07, M.trim); beam(A.clone().setY(floorY + 0.14), B.clone().setY(floorY + 0.14), 0.08, 0.06, M.trim);
    const n = Math.round(A.distanceTo(B) / 0.14);
    for (let i = 1; i < n; i++) { const p = A.clone().lerp(B, i / n); box(0.035, 0.74, 0.035, M.trim, p.x, floorY + 0.53, p.z, scene, false); }
  }
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.08, 16), glowMat(LAMP, 3)), scene, false, false).position.set(sx, beamY - 0.18, 5.9);
  plight(V(sx, beamY - 0.4, 5.9), LAMP, 2, 7);

  // ---- front door, sidelights, transom
  const dz = 4.5;
  box(1.0, 2.2, 0.06, M.door, sx, floorY + 1.1 + 0.08, dz + 0.03);
  for (const [py, ph] of [[0.62, 0.8], [1.62, 0.9]]) for (const pxo of [-0.23, 0.23]) box(0.34, ph, 0.02, M.doorPanel, sx + pxo, floorY + py, dz + 0.07, scene, false);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), M.brass), scene, false).position.set(sx + 0.38, floorY + 1.15, dz + 0.1);
  for (const s of [-1, 1]) {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 1.9), glassMat(1, 1.0)); g.position.set(sx + s * 0.78, floorY + 1.2, dz + 0.01); scene.add(g);
    box(0.08, 2.3, 0.08, M.trim, sx + s * 0.55, floorY + 1.23, dz + 0.04);
    box(0.08, 2.3, 0.08, M.trim, sx + s * 1.0, floorY + 1.23, dz + 0.04);
  }
  const tg = new THREE.Mesh(new THREE.PlaneGeometry(1.95, 0.42), glassMat(1, 1.1)); tg.position.set(sx, floorY + 2.62, dz + 0.01); scene.add(tg);
  box(2.2, 0.1, 0.1, M.trim, sx, floorY + 2.36, dz + 0.05); box(2.3, 0.2, 0.12, M.trim, sx, floorY + 2.93, dz + 0.06);

  // ---- main façade windows
  windowUnit(2.72, 1.3, 1.1, 1.9, 4.5, { room: 3, bright: 1.15, shutters: true });
  windowUnit(5.15, 1.3, 1.1, 1.9, 4.5, { room: 5, bright: 1.0, shutters: true });
  const u3 = windowUnit(sx, 4.8, 0.95, 1.2, 4.5, { room: 4, bright: 0.55 });
  const u4 = windowUnit(2.72, 4.78, 1.05, 1.25, 4.5, { room: 2, bright: 0.95, shutters: true });
  const u5 = windowUnit(5.15, 4.78, 1.05, 1.25, 4.5, { room: 0, bright: 0.2, shutters: true });

  // ---- dormer above the porch
  const ddx = 3.93, dh = 1.2, dzF = 4.2, dE = E + 1.45;
  frontWall(ddx - dh, ddx + dh, E - 0.3, dE, dE + dh * T50, dzF);
  sideWall(0.8, dzF, E - 0.3, dE, null, ddx - dh, -1); sideWall(0.8, dzF, E - 0.3, dE, null, ddx + dh, 1);
  const dorm = roofZ(ddx, dh, dzF, 0.5, dE, dE + dh * T50, 0.22, 0.26);
  const u6 = windowUnit(ddx, E + 0.58, 0.9, 0.78, dzF, { room: 1, bright: 0.7, rows: 1 });

  // ---- garage wing: x 6.5..13, z -4..3
  const gx0 = 6.5, gx1 = 13.0, gz = 3.0, gxc = (gx0 + gx1) / 2, gh = (gx1 - gx0) / 2, gpeak = 3.3 + gh * Math.tan(0.62);
  frontWall(gx0, gx1, 0.1, 3.3, gpeak, gz);
  sideWall(-4, gz, 0.1, 3.3, null, gx1, 1);
  box(gx1 - gx0, 0.45, 7.05, M.stone, gxc, 0.22, -0.48);
  const gar = roofZ(gxc, gh, gz, -4, 3.3, gpeak, 0.3, 0.32);
  for (const x of [gx0 + 0.08, gx1 - 0.08]) box(0.16, 3.2, 0.16, M.trim, x, 1.7, gz + 0.04);
  for (const doorX of [gxc - 1.62, gxc + 1.62]) {
    box(2.56, 2.36, 0.06, M.garage, doorX, 1.28, gz + 0.03);
    for (let k = 0; k < 4; k++) box(2.44, 0.04, 0.02, M.garageBoard, doorX, 0.42 + k * 0.5, gz + 0.065, scene, false);
    for (let k = -1; k <= 1; k++) { const g = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.34), glassMat(5, 0.12)); g.position.set(doorX + k * 0.78, 2.12, gz + 0.066); scene.add(g); }
    box(2.8, 0.14, 0.1, M.trim, doorX, 2.53, gz + 0.05); box(0.12, 2.5, 0.1, M.trim, doorX - 1.34, 1.25, gz + 0.05); box(0.12, 2.5, 0.1, M.trim, doorX + 1.34, 1.25, gz + 0.05);
  }
  windowUnit(gxc, 3.95, 0.95, 0.8, gz, { room: 3, bright: 0.65, rows: 1 });
  for (const lx of [gx0 + 0.45, gxc, gx1 - 0.45]) lantern(V(lx, 2.75, gz + 0.22));

  // ---- window light spilling out
  for (const [x, y, z, k] of [[bxc, 2.2, bz + 1.2, 1.0], [2.72, 2.2, 5.3, 0.7], [5.15, 2.2, 5.3, 0.6], [sx, 1.8, 5.2, 0.7]]) plight(V(x, y, z), LAMP, k, 5);

  // ---- snow drifts along the foundations
  for (const [x, z, sxx, szz] of [[bxc, bz + 0.25, 2.2, 0.5], [-6.0, 4.75, 0.6, 0.4]]) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), M.snow); d.scale.set(sxx, 0.22, szz); d.position.set(x, 0, z); add(d, scene, false);
  }

  /* ---------------- the install (after only) ---------------- */
  const ey = main.eaveY + 0.04, ez = main.eaveZ + 0.1;
  c9Edge(V(main.xl, ey, ez), V(bx0 - 0.02, ey, ez));
  c9Edge(V(bx1 + 0.02, ey, ez), V(main.xr, ey, ez));
  for (const x of [main.xl, main.xr]) c9Edge(V(x, ey, ez), V(x, main.ridgeY + 0.03, main.zc), V(x < 0 ? -0.3 : 0.3, 0.2, 0.2));
  c9Edge(V(main.xl, main.ridgeY + 0.05, main.zc), V(main.xr, main.ridgeY + 0.05, main.zc), V(0, 0.4, 0.3));
  for (const r of [bay, dorm, gar]) {
    const off = V(0, 0.04, 0.08);
    c9Edge(r.left.clone().add(off), r.peak.clone().add(off));
    c9Edge(r.peak.clone().add(off), r.right.clone().add(off));
  }
  c9Edge(V(px0 - 0.25, porchEaveY + 0.06, porchEaveZ + 0.1), V(px1 + 0.25, porchEaveY + 0.06, porchEaveZ + 0.1), V(0, 0.15, 0.3));

  wreath(sx, floorY + 1.75, dz + 0.08, 0.3);
  for (const u of [u1, u2]) wreath(u.cx, u.cy + 0.08, u.z + 0.04, 0.28);
  for (const u of [u3, u4, u5]) wreath(u.cx, u.cy + 0.04, u.z + 0.04, 0.27);
  wreath(u6.cx, u6.cy + 0.02, u6.z + 0.04, 0.24);
  for (const doorX of [gxc - 1.62, gxc + 1.62]) wreath(doorX, 1.82, gz + 0.08, 0.38);

  for (let i = 0; i < cols.length - 1; i++) garlandAlong(swag(V(cols[i], beamY - 0.2, colZ + 0.16), V(cols[i + 1], beamY - 0.2, colZ + 0.16), 0.32), 0.075, 18);
  garlandAlong(new THREE.CatmullRomCurve3([V(px0 - 0.1, beamY + 0.02, colZ + 0.2), V(px1 + 0.1, beamY + 0.02, colZ + 0.2)]), 0.07, 16);
  for (const cx of cols) {
    const pts = []; for (let i = 0; i <= 60; i++) { const t = i / 60; const a = t * 6.283 * 4.2; pts.push(V(cx + Math.cos(a) * 0.19, floorY + 0.3 + t * 2.6, colZ + Math.sin(a) * 0.19)); }
    garlandAlong(new THREE.CatmullRomCurve3(pts), 0.06, 16);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), M.bow), xmas).position.set(cx, beamY - 0.2, colZ + 0.24);
  }
  for (const [A, B] of rails) garlandAlong(new THREE.CatmullRomCurve3([A.clone().add(V(0, 0.07, 0)), B.clone().add(V(0, 0.07, 0))]), 0.06, 14);

  for (const s of [-1, 1]) {
    const x = sx + s * 1.32;
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.5, 16), M.planter)).position.set(x, floorY + 0.25, 4.95);
    spruce(x, 4.95, 1.9, 0.42, { density: 3.2, base: floorY + 0.4 });
  }

  return { sx, pz, floorY };
}

/* =========================================================================
   Site: walkway, driveway, trees, shrubs
   ========================================================================= */
function site(h) {
  // walkway: steps → curve → driveway
  const walk = new THREE.CatmullRomCurve3([V(h.sx, 0, h.pz + 1.1), V(h.sx, 0, 10.5), V(1.6, 0, 14.2), V(5.2, 0, 16.4), V(7.2, 0, 17.2)]);
  const N = 60, wv = [], wi = [], wu = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, p = walk.getPointAt(t), tg = walk.getTangentAt(t), n = V(-tg.z, 0, tg.x).normalize();
    for (const s of [-1, 1]) { const q = p.clone().addScaledVector(n, s * 0.68); wv.push(q.x, 0.025, q.z); wu.push((s + 1) * 0.35, t * walk.getLength() * 0.5); }
    if (i < N) { const a = i * 2; wi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wv, 3)); wg.setAttribute('uv', new THREE.Float32BufferAttribute(wu, 2)); wg.setIndex(wi); wg.computeVertexNormals();
  add(new THREE.Mesh(wg, M.wetStone), scene, false);
  // path stake lights (after)
  const L = walk.getLength(); const nStakes = Math.floor(L / 1.25);
  for (let i = 1; i < nStakes; i++) {
    const t = i / nStakes, p = walk.getPointAt(t), tg = walk.getTangentAt(t), n = V(-tg.z, 0, tg.x).normalize();
    for (const s of [-1, 1]) {
      const q = p.clone().addScaledVector(n, s * 0.95);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 5), M.black), xmas, false).position.set(q.x, 0.15, q.z);
      addBulb('stake', V(q.x, 0.34, q.z), rr(0.9, 1.05));
      if (i % 3 === 1) washLights.push([V(q.x, 0.45, q.z), 0.35, 2.6]);
    }
  }
  // snow banks either side of the walk
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, p = walk.getPointAt(t), tg = walk.getTangentAt(t), n = V(-tg.z, 0, tg.x).normalize();
    for (const s of [-1, 1]) { const q = p.clone().addScaledVector(n, s * rr(0.8, 0.9)); const d = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), M.snow); d.scale.set(rr(0.9, 1.3), rr(0.22, 0.32), rr(0.9, 1.3)); d.position.set(q.x, 0, q.z); add(d, scene, false); }
  }

  // driveway
  const dw = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 44), M.asphalt); dw.rotation.x = -Math.PI / 2; dw.position.set(9.75, 0.02, 3.0 + 22); add(dw, scene, false);
  for (const x of [6.55, 12.95]) for (let z = 3.4; z < 46; z += 0.8) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), M.snow); d.scale.set(rr(0.9, 1.15), rr(0.3, 0.4), rr(1.9, 2.4)); d.position.set(x + rr(-0.06, 0.06), 0, z); add(d, scene, false);
  }
  lantern(V(5.9, 2.35, 18.2), { post: true });

  // front walk lamp's companion: foundation shrubs
  for (const [x, z, s] of [[-5.0, 6.15, 0.55], [-3.8, 6.2, 0.62], [-2.55, 6.15, 0.55], [-6.2, 5.2, 0.5], [2.2, 7.95, 0.52], [3.3, 7.95, 0.56], [4.45, 7.95, 0.52], [5.6, 7.95, 0.56], [-2.35, 7.75, 0.5]]) boxwood(x, z, s);

  // trees
  spruce(-15.2, 1.5, 11.5, 3.2, { density: 1.0 });
  spruce(16.4, 3.8, 9.8, 2.8, { density: 1.0 });
  spruce(-8.6, -1.2, 7.2, 2.0, { density: 1.1 });
  spruce(19.5, -3.5, 12.5, 3.2, { lights: false });
  spruce(-16.5, -2.0, 13.5, 3.6, { lights: false });
  // in the wide hero the maple would sit behind the headline, so it moves further out there
  if (VIEW === 'hero') deciduous(-18.5, 10.5, 8.4); else deciduous(-9.3, 8.6, 8.4);
  for (const [x, z, hh, r] of [[-2.5, -12.5, 14, 3.4], [7.5, -14, 15.5, 3.6], [13.5, -9.5, 12, 3.0], [-11, -8.5, 12.5, 3.2], [24, -2, 13, 3.3], [-22, -4, 14, 3.4]]) spruce(x, z, hh, r, { lights: false });
}

/* =========================================================================
   Commercial storefront (separate scene for the services card)
   ========================================================================= */
function storefront() {
  const brickN = tileNoise(512, [8, 32]);
  const brick = toTex(pixelCanvas(512, 512, (i, x, y) => {
    const row = Math.floor(y / 21); const off = row % 2 ? 32 : 0; const mx = (x + off) % 64, my = y % 21;
    const mortar = mx < 3 || my < 3; const n = (brickN[i] - 0.5) * 36; const tone = ((Math.floor((x + off) / 64) * 7 + row * 13) % 5) * 7;
    return mortar ? [150 + n * 0.3, 146 + n * 0.3, 140 + n * 0.3] : [112 + n + tone, 52 + n * 0.5 + tone * 0.4, 42 + n * 0.4];
  }), { rx: 0.5, ry: 0.5 });
  const brickMat = new THREE.MeshStandardMaterial({ map: brick, roughness: 0.9, bumpMap: brick, bumpScale: 1.5 });
  const awning = new THREE.MeshStandardMaterial({ color: 0x173a2b, roughness: 0.8, side: THREE.DoubleSide });
  const shops = [[-9, 7, 7.2], [-1.6, 7.8, 8.2], [6.4, 7.2, 7.0]];
  for (const [x0, w, hgt] of shops) {
    const x1 = x0 + w, xc = x0 + w / 2;
    frontWall(x0, x1, 0, hgt, null, 0, brickMat);
    box(w + 0.1, 0.5, 0.35, M.trim, xc, hgt - 0.1, 0.15);            // cornice
    box(w + 0.2, 0.08, 0.5, M.snow, xc, hgt + 0.2, 0.2, scene, false);
    box(w + 0.1, 0.35, 0.25, M.shutter, xc, 3.55, 0.12);              // sign band
    // storefront glass
    const g = new THREE.Mesh(new THREE.PlaneGeometry(w - 1.6, 2.4), glassMat(Math.floor(rand() * 6), 1.3)); g.position.set(xc - 0.4, 1.8, 0.02); scene.add(g);
    box(w - 1.5, 0.08, 0.08, M.sash, xc - 0.4, 3.0, 0.05); box(w - 1.5, 0.5, 0.1, M.sash, xc - 0.4, 0.35, 0.05);
    for (let k = 0; k <= 3; k++) box(0.07, 2.5, 0.07, M.sash, x0 + 0.35 + ((w - 1.6) * k) / 3, 1.8, 0.05);
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 2.3), glassMat(2, 0.9)); d.position.set(x1 - 0.75, 1.15, 0.02); scene.add(d);
    box(1.1, 0.08, 0.1, M.sash, x1 - 0.75, 2.34, 0.05);
    // awning
    const aw = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.4, 1.3), awning); aw.position.set(xc, 3.05, 0.55); aw.rotation.x = -1.0; add(aw);
    // upper windows with wreaths
    for (let k = 0; k < 3; k++) {
      const wx = x0 + (w * (k + 0.5)) / 3;
      const u = windowUnit(wx, 4.3, 1.0, 1.6, 0, { room: k + 1, bright: rand() < 0.4 ? 0.2 : 0.9, rows: 2 });
      wreath(u.cx, u.cy + 0.05, 0.05, 0.28);
    }
    // cornice lights + garland over the awning
    c9Edge(V(x0 + 0.05, hgt + 0.08, 0.36), V(x1 - 0.05, hgt + 0.08, 0.36), V(0, -0.2, 0.4));
    garlandAlong(new THREE.CatmullRomCurve3([V(x0 + 0.3, 3.45, 0.32), V(x1 - 0.3, 3.45, 0.32)]), 0.08, 16);
  }
  // sidewalk + street
  box(40, 0.16, 5, M.wetStone, 0, 0.08, 2.5, scene, false);
  const street = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), M.asphalt); street.rotation.x = -Math.PI / 2; street.position.set(0, 0.01, 25); add(street, scene, false);
  for (let x = -18; x < 20; x += 1.1) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), M.snow); d.scale.set(rr(2.3, 2.9), rr(0.3, 0.42), rr(0.8, 1.0)); d.position.set(x + rr(-0.1, 0.1), 0.12, 5.2); add(d, scene, false); }
  // lamp posts wrapped in garland + planter trees
  for (const lx of [-10.2, -2.0, 6.0, 14.0]) {
    lantern(V(lx, 3.4, 4.4), { post: true }).scale.set(1, 1, 1);
    const pts = []; for (let i = 0; i <= 50; i++) { const t = i / 50, a = t * 6.283 * 5; pts.push(V(lx + Math.cos(a) * 0.12, 0.3 + t * 2.7, 4.4 + Math.sin(a) * 0.12)); }
    garlandAlong(new THREE.CatmullRomCurve3(pts), 0.06, 16);
  }
  for (const tx of [-6.0, 2.2, 10.4]) {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.38, 0.7, 16), M.planter)).position.set(tx, 0.51, 3.2);
    spruce(tx, 3.2, 2.4, 0.6, { density: 3, base: 0.8 });
  }
  spruce(-17, -4, 11, 3, { lights: false }); spruce(18, -3, 10, 3, { lights: false });
}

/* =========================================================================
   Build + lights
   ========================================================================= */
environment();
if (VIEW === 'commercial') storefront(); else site(house());

// instanced bulbs
function buildBulbs(list, radius, stretch, color, intensity) {
  if (!list.length) return;
  const geo = new THREE.SphereGeometry(radius, 10, 8); geo.scale(1, stretch, 1);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), list.length);
  const m = new THREE.Matrix4(); const c = new THREE.Color();
  list.forEach((b, i) => { m.makeTranslation(b[0], b[1], b[2]); mesh.setMatrixAt(i, m); mesh.setColorAt(i, c.copy(color).multiplyScalar(intensity * b[3])); });
  xmas.add(mesh);
}
buildBulbs(bulbs.c9, 0.036, 1.35, WARM, 5);
buildBulbs(bulbs.mini, 0.017, 1.2, WARM, 4);
buildBulbs(bulbs.stake, 0.05, 1.4, WARM, 5);
for (const [p, k, d] of washLights) plight(p, WARM_WASH, k, d, xmas);

/* =========================================================================
   Cameras
   ========================================================================= */
const views = {
  ba:        { pos: [1.6, 2.1, 28.5], look: [1.6, 5.0, 0], fov: 40 },
  og:        { pos: [1.8, 2.1, 28.5], look: [1.8, 5.0, 0], fov: 36 },
  hero:      { pos: [-5.6, 2.2, 36], look: [-5.4, 5.9, 0], fov: 38 },
  portrait:  { pos: [3.3, 2.0, 42], look: [3.3, 10, 0], fov: 62 },
  roofline:  { pos: [-0.6, 4.6, 15.5], look: [-1.8, 7.0, 4], fov: 40 },
  landscape: { pos: [-1.2, 1.5, 21.5], look: [-7.8, 3.4, 9], fov: 44 },
  wreaths:   { pos: [1.0, 1.9, 13.2], look: [0.8, 2.1, 5], fov: 42 },
  full:      { pos: [13.5, 2.6, 25], look: [1.5, 4.4, 2], fov: 42 },
  commercial:{ pos: [2.0, 1.8, 17], look: [0.0, 3.2, 0], fov: 46 },
};
const v = views[VIEW] || views.ba;
const camera = new THREE.PerspectiveCamera(v.fov, W / H, 0.1, 1200);
camera.position.set(...v.pos); camera.lookAt(...v.look);

/* =========================================================================
   Post: bloom, tone map, vignette + grain
   ========================================================================= */
const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.35, 1.2));
composer.addPass(new OutputPass());
composer.addPass(new ShaderPass({
  uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2(W, H) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 res; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5; d.x *= res.x / res.y;
      c.rgb *= mix(0.6, 1.0, smoothstep(1.0, 0.28, length(d)));
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(c.rgb, c.rgb * vec3(0.93, 0.99, 1.07), (1.0 - smoothstep(0.0, 0.45, l)) * 0.5); // cool shadows
      c.rgb += (hash(vUv * res) - 0.5) * 0.028;
      gl_FragColor = c; }`,
}));

composer.render();
window.__result = {
  jpg: renderer.domElement.toDataURL('image/jpeg', 0.88),
  webp: renderer.domElement.toDataURL('image/webp', 0.84),
  stats: { c9: bulbs.c9.length, mini: bulbs.mini.length, stake: bulbs.stake.length, wash: washLights.length },
};

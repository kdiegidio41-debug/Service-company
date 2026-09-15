/* ============================================================
   Shared geometry. Every renderer consumes this; none of it
   knows anything about colour or style.
   ============================================================ */
(function (G) {

  /* ---- Structure vocabulary -------------------------------
     Each station kind resolves to a primitive plus a roof and
     a height, so a renderer implements 7 primitives, not 30
     buildings.                                              */
  var KIND = {
    farmhouse:  { prim:'box',  z:7.5, roof:'gable',   chimney:true, label:'dwelling' },
    barn:       { prim:'box',  z:9,   roof:'gambrel', doors:true,   label:'barn' },
    greenhouse: { prim:'box',  z:5,   roof:'arch',    glass:true,   label:'glass' },
    granary:    { prim:'box',  z:6.5, roof:'gable',   label:'store' },
    smithy:     { prim:'box',  z:5.5, roof:'gable',   chimney:true, label:'works' },
    shed:       { prim:'box',  z:4,   roof:'shed',    label:'shed' },
    porch:      { prim:'box',  z:4,   roof:'shed',    label:'shed' },
    hut:        { prim:'box',  z:3.8, roof:'gable',   label:'hut' },
    coop:       { prim:'box',  z:3.4, roof:'shed',    label:'coop' },
    kennel:     { prim:'box',  z:3,   roof:'gable',   label:'kennel' },
    stall:      { prim:'box',  z:4,   roof:'awning',  label:'stall' },
    gate:       { prim:'box',  z:6.5, roof:'gable',   arch:true,    label:'gate' },
    cellar:     { prim:'mound',z:3,   label:'cellar' },
    compost:    { prim:'mound',z:2.4, label:'heap' },
    silo:       { prim:'cyl',  z:15,  roof:'dome',    label:'silo' },
    tower:      { prim:'box',  z:17,  roof:'watch',   label:'tower' },
    windmill:   { prim:'mast', z:13,  top:'sails',    label:'mill' },
    bell:       { prim:'mast', z:6.5, top:'bell',     label:'bell' },
    board:      { prim:'mast', z:3.6, top:'board',    label:'board' },
    scarecrow:  { prim:'mast', z:5.2, top:'crow',     label:'post' },
    pump:       { prim:'mast', z:4.2, top:'valve',    label:'head' },
    well:       { prim:'disc', z:2.2, top:'well',     label:'well' },
    field:      { prim:'field',z:.5,  label:'field' },
    beds:       { prim:'pen',  z:1.1, rows:true,      label:'beds' },
    frames:     { prim:'pen',  z:1.3, glass:true,     label:'frames' },
    paddock:    { prim:'pen',  z:1.6, label:'pen' },
    fence:      { prim:'pen',  z:1.3, label:'fence' },
    scale:      { prim:'pen',  z:1.6, top:'scale',    label:'scale' },
    tractor:    { prim:'pen',  z:1.6, top:'machine',  label:'yard' }
  };
  G.KIND = KIND;
  G.spec = function (k) { return KIND[k] || KIND.shed; };

  /* ---- small helpers -------------------------------------- */
  G.el = function (tag, attrs, parent) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  G.pts = function (arr) { return arr.map(function (p) { return p[0].toFixed(2) + ',' + p[1].toFixed(2); }).join(' '); };
  G.path = function (arr, close) {
    return 'M' + arr.map(function (p, i) { return (i ? 'L' : '') + p[0].toFixed(2) + ' ' + p[1].toFixed(2); }).join('') + (close ? 'Z' : '');
  };
  /* Catmull-Rom → cubic bezier, for roads and streams that should not look surveyed */
  G.smooth = function (p, t) {
    if (p.length < 3) return G.path(p);
    t = t == null ? 0.5 : t;
    var d = 'M' + p[0][0].toFixed(2) + ' ' + p[0][1].toFixed(2);
    for (var i = 0; i < p.length - 1; i++) {
      var p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6 * t).toFixed(2) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6 * t).toFixed(2)
        + ',' + (p2[0] - (p3[0] - p1[0]) / 6 * t).toFixed(2) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6 * t).toFixed(2)
        + ',' + p2[0].toFixed(2) + ' ' + p2[1].toFixed(2);
    }
    return d;
  };
  G.centroid = function (poly) {
    var x = 0, y = 0; poly.forEach(function (p) { x += p[0]; y += p[1]; });
    return [x / poly.length, y / poly.length];
  };
  /* inset a polygon toward its centroid — used for zone fills and hatch borders */
  G.inset = function (poly, d) {
    var c = G.centroid(poly);
    return poly.map(function (p) {
      var dx = p[0] - c[0], dy = p[1] - c[1], L = Math.hypot(dx, dy) || 1;
      return [p[0] - dx / L * d, p[1] - dy / L * d];
    });
  };
  /* deterministic jitter so "hand-drawn" styles look hand-drawn the same way every load */
  G.rnd = function (seed) { var s = Math.sin(seed * 12.9898) * 43758.5453; return s - Math.floor(s); };

  G.rect = function (x, y, w, h) {
    return [[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2]];
  };

  /* ============================================================
     PLAN VIEW — a footprint plus the marks that identify a
     structure seen from above. Four of the five styles use this.
     Returns world-unit geometry; the renderer supplies paint.
     ============================================================ */
  G.plan = function (st) {
    var s = G.spec(st.kind), x = st.x, y = st.y, w = st.w, h = st.h;
    var out = { foot: null, marks: [], kind: st.kind, prim: s.prim };
    var horiz = w >= h;

    if (s.prim === 'cyl' || s.prim === 'disc') {
      var r = Math.min(w, h) / 2;
      out.foot = { t: 'circle', x: x, y: y, r: r };
      out.marks.push({ t: 'circle', x: x, y: y, r: r * 0.62, fill: false });
      if (s.prim === 'cyl') out.marks.push({ t: 'circle', x: x, y: y, r: r * 0.24, fill: true });
      else out.marks.push({ t: 'line', a: [x - r * 0.8, y], b: [x + r * 0.8, y] });
      return out;
    }
    if (s.prim === 'mound') {
      out.foot = { t: 'ellipse', x: x, y: y, rx: w / 2, ry: h / 2 };
      out.marks.push({ t: 'ellipse', x: x, y: y, rx: w / 3.2, ry: h / 3.2, fill: false });
      return out;
    }
    if (s.prim === 'mast') {
      var r2 = Math.min(w, h) / 2;
      out.foot = { t: 'circle', x: x, y: y, r: r2 * 0.5 };
      if (s.top === 'sails') {
        for (var a = 0; a < 4; a++) {
          var ang = a * Math.PI / 2 + 0.38;
          out.marks.push({ t: 'line', a: [x, y], b: [x + Math.cos(ang) * r2 * 1.9, y + Math.sin(ang) * r2 * 1.9] });
        }
      } else if (s.top === 'board') {
        out.marks.push({ t: 'rect', x: x, y: y, w: w * 0.95, h: h * 0.5, fill: false });
        out.marks.push({ t: 'line', a: [x - w * 0.4, y], b: [x + w * 0.4, y] });
      } else if (s.top === 'crow') {
        out.marks.push({ t: 'line', a: [x - w * 0.6, y], b: [x + w * 0.6, y] });
        out.marks.push({ t: 'line', a: [x, y - h * 0.4], b: [x, y + h * 0.5] });
      } else {
        out.marks.push({ t: 'circle', x: x, y: y, r: r2 * 1.15, fill: false });
      }
      return out;
    }
    if (s.prim === 'field') {
      out.foot = { t: 'rect', x: x, y: y, w: w, h: h };
      var rows = st.rows || 5;
      for (var i = 1; i < rows; i++) {
        var yy = y - h / 2 + (h / rows) * i;
        out.marks.push({ t: 'line', a: [x - w / 2 + .5, yy], b: [x + w / 2 - .5, yy], soft: true });
      }
      return out;
    }
    if (s.prim === 'pen') {
      out.foot = { t: 'rect', x: x, y: y, w: w, h: h, open: true };
      if (s.rows) for (var j = 1; j < 4; j++) {
        var xx = x - w / 2 + (w / 4) * j;
        out.marks.push({ t: 'line', a: [xx, y - h / 2 + .3], b: [xx, y + h / 2 - .3], soft: true });
      }
      if (s.glass) { out.marks.push({ t: 'line', a: [x - w / 2, y], b: [x + w / 2, y], soft: true }); }
      if (s.top === 'scale') { out.marks.push({ t: 'line', a: [x - w * .3, y - h * .2], b: [x + w * .3, y - h * .2] }); out.marks.push({ t: 'line', a: [x, y - h * .2], b: [x, y + h * .3] }); }
      if (s.top === 'machine') { out.marks.push({ t: 'circle', x: x - w * .22, y: y + h * .1, r: Math.min(w, h) * .18, fill: false }); out.marks.push({ t: 'circle', x: x + w * .22, y: y + h * .1, r: Math.min(w, h) * .26, fill: false }); }
      return out;
    }

    /* box: footprint + ridge line, which is what actually reads as a building from above */
    out.foot = { t: 'rect', x: x, y: y, w: w, h: h };
    if (s.roof === 'shed' || s.roof === 'awning') {
      out.marks.push(horiz
        ? { t: 'line', a: [x - w / 2, y - h / 6], b: [x + w / 2, y - h / 6] }
        : { t: 'line', a: [x - w / 6, y - h / 2], b: [x - w / 6, y + h / 2] });
    } else if (s.roof === 'arch') {
      for (var g = 1; g < 4; g++) {
        var gx = x - w / 2 + (w / 4) * g;
        out.marks.push({ t: 'line', a: [gx, y - h / 2], b: [gx, y + h / 2], soft: true });
      }
    } else if (s.roof === 'watch') {
      out.marks.push({ t: 'rect', x: x, y: y, w: w * 0.54, h: h * 0.54, fill: false });
      out.marks.push({ t: 'circle', x: x, y: y, r: Math.min(w, h) * 0.13, fill: true });
    } else {
      /* gable / gambrel: ridge down the long axis, with hips at each end */
      if (horiz) {
        out.marks.push({ t: 'line', a: [x - w / 2 + h / 2, y], b: [x + w / 2 - h / 2, y] });
        out.marks.push({ t: 'line', a: [x - w / 2, y - h / 2], b: [x - w / 2 + h / 2, y] });
        out.marks.push({ t: 'line', a: [x - w / 2, y + h / 2], b: [x - w / 2 + h / 2, y] });
        out.marks.push({ t: 'line', a: [x + w / 2, y - h / 2], b: [x + w / 2 - h / 2, y] });
        out.marks.push({ t: 'line', a: [x + w / 2, y + h / 2], b: [x + w / 2 - h / 2, y] });
      } else {
        out.marks.push({ t: 'line', a: [x, y - h / 2 + w / 2], b: [x, y + h / 2 - w / 2] });
        out.marks.push({ t: 'line', a: [x - w / 2, y - h / 2], b: [x, y - h / 2 + w / 2] });
        out.marks.push({ t: 'line', a: [x + w / 2, y - h / 2], b: [x, y - h / 2 + w / 2] });
      }
      if (s.roof === 'gambrel') {
        var k = horiz ? h * 0.22 : w * 0.22;
        out.marks.push(horiz
          ? { t: 'line', a: [x - w / 2 + h / 3, y - k], b: [x + w / 2 - h / 3, y - k], soft: true }
          : { t: 'line', a: [x - k, y - h / 2 + w / 3], b: [x - k, y + h / 2 - w / 3], soft: true });
        out.marks.push(horiz
          ? { t: 'line', a: [x - w / 2 + h / 3, y + k], b: [x + w / 2 - h / 3, y + k], soft: true }
          : { t: 'line', a: [x + k, y - h / 2 + w / 3], b: [x + k, y + h / 2 - w / 3], soft: true });
      }
    }
    if (s.chimney) out.marks.push({ t: 'rect', x: x + w * 0.28, y: y - h * 0.26, w: Math.min(w, h) * 0.17, h: Math.min(w, h) * 0.17, fill: true });
    if (s.doors)   out.marks.push({ t: 'rect', x: x, y: y + h / 2 - h * 0.09, w: w * 0.26, h: h * 0.18, fill: false });
    if (s.arch)    out.marks.push({ t: 'rect', x: x, y: y, w: w * 0.22, h: h, fill: false });
    return out;
  };

  /* ============================================================
     ISOMETRIC — 2:1 dimetric projection. z rises on screen.
     ============================================================ */
  var ISO_X = 0.866, ISO_Y = 0.5, ISO_Z = 0.82;
  G.iso = function (x, y, z) {
    return [(x - y) * ISO_X, (x + y) * ISO_Y - (z || 0) * ISO_Z];
  };
  G.isoPoly = function (poly, z) {
    return poly.map(function (p) { return G.iso(p[0], p[1], z || 0); });
  };
  /* depth sort: things further "back" (smaller x+y) draw first */
  G.depth = function (x, y) { return x + y; };

  /* Extruded box → the three visible faces, already projected. */
  G.isoBox = function (x, y, w, h, z0, z1) {
    var a = [x - w / 2, y - h / 2], b = [x + w / 2, y - h / 2],
        c = [x + w / 2, y + h / 2], d = [x - w / 2, y + h / 2];
    return {
      top:   [G.iso(a[0], a[1], z1), G.iso(b[0], b[1], z1), G.iso(c[0], c[1], z1), G.iso(d[0], d[1], z1)],
      right: [G.iso(b[0], b[1], z1), G.iso(c[0], c[1], z1), G.iso(c[0], c[1], z0), G.iso(b[0], b[1], z0)],
      left:  [G.iso(c[0], c[1], z1), G.iso(d[0], d[1], z1), G.iso(d[0], d[1], z0), G.iso(c[0], c[1], z0)],
      base:  [G.iso(a[0], a[1], z0), G.iso(b[0], b[1], z0), G.iso(c[0], c[1], z0), G.iso(d[0], d[1], z0)]
    };
  };

  /* Roof geometry in iso, by type. Returns an array of {poly, shade} back-to-front. */
  G.isoRoof = function (x, y, w, h, z, type) {
    var horiz = w >= h, pitch = Math.min(w, h) * 0.55, out = [];
    var x0 = x - w / 2, x1 = x + w / 2, y0 = y - h / 2, y1 = y + h / 2;

    if (type === 'shed' || type === 'awning') {
      var zt = z + pitch * 0.7;
      out.push({ poly: [G.iso(x0, y0, zt), G.iso(x1, y0, zt), G.iso(x1, y1, z), G.iso(x0, y1, z)], shade: 'top' });
      out.push({ poly: [G.iso(x0, y0, z), G.iso(x1, y0, z), G.iso(x1, y0, zt), G.iso(x0, y0, zt)], shade: 'gable' });
      return out;
    }
    if (type === 'dome') {
      var zr = z + pitch * 0.9, r = Math.min(w, h) / 2, seg = 14, ring = [], cap = [];
      for (var i = 0; i <= seg; i++) {
        var t = i / seg * Math.PI * 2;
        ring.push(G.iso(x + Math.cos(t) * r, y + Math.sin(t) * r, z));
        cap.push(G.iso(x + Math.cos(t) * r * 0.55, y + Math.sin(t) * r * 0.55, zr));
      }
      out.push({ poly: ring.slice(0, seg / 2 + 1).concat(cap.slice(0, seg / 2 + 1).reverse()), shade: 'top' });
      out.push({ poly: ring.slice(seg / 2).concat(cap.slice(seg / 2).reverse()), shade: 'gable' });
      out.push({ poly: cap, shade: 'top' });
      return out;
    }
    if (type === 'watch') {
      var zc = z + pitch * 1.1, ov = Math.min(w, h) * 0.22;
      var e = G.isoBox(x, y, w + ov, h + ov, z, z + 0.7);
      out.push({ poly: e.top, shade: 'top' }); out.push({ poly: e.right, shade: 'right' }); out.push({ poly: e.left, shade: 'left' });
      out.push({ poly: [G.iso(x0, y0, z + 0.7), G.iso(x1, y0, z + 0.7), G.iso(x, y, zc)], shade: 'gable' });
      out.push({ poly: [G.iso(x1, y0, z + 0.7), G.iso(x1, y1, z + 0.7), G.iso(x, y, zc)], shade: 'top' });
      out.push({ poly: [G.iso(x1, y1, z + 0.7), G.iso(x0, y1, z + 0.7), G.iso(x, y, zc)], shade: 'right' });
      return out;
    }
    if (type === 'arch') {
      var za = z + pitch * 0.8, seg2 = 8, front = [], back = [];
      for (var j = 0; j <= seg2; j++) {
        var u = j / seg2, ang = Math.PI * u;
        var off = (horiz ? h : w) / 2 * Math.cos(ang), lift = (za - z) * Math.sin(ang);
        if (horiz) { front.push(G.iso(x0, y - off, z + lift)); back.push(G.iso(x1, y - off, z + lift)); }
        else       { front.push(G.iso(x - off, y0, z + lift)); back.push(G.iso(x - off, y1, z + lift)); }
      }
      out.push({ poly: front.concat(back.slice().reverse()), shade: 'glass' });
      out.push({ poly: front, shade: 'gable' });
      return out;
    }
    /* gable / gambrel */
    var zr2 = z + pitch, mid;
    if (horiz) {
      out.push({ poly: [G.iso(x0, y0, z), G.iso(x1, y0, z), G.iso(x1, y, zr2), G.iso(x0, y, zr2)], shade: 'top' });
      out.push({ poly: [G.iso(x0, y1, z), G.iso(x1, y1, z), G.iso(x1, y, zr2), G.iso(x0, y, zr2)], shade: 'right' });
      out.push({ poly: [G.iso(x1, y0, z), G.iso(x1, y, zr2), G.iso(x1, y1, z)], shade: 'gable' });
      if (type === 'gambrel') {
        mid = z + pitch * 0.52;
        out.push({ poly: [G.iso(x0, y0, z), G.iso(x1, y0, z), G.iso(x1, y - h * 0.18, mid), G.iso(x0, y - h * 0.18, mid)], shade: 'gable' });
        out.push({ poly: [G.iso(x0, y1, z), G.iso(x1, y1, z), G.iso(x1, y + h * 0.18, mid), G.iso(x0, y + h * 0.18, mid)], shade: 'left' });
      }
    } else {
      out.push({ poly: [G.iso(x0, y0, z), G.iso(x0, y1, z), G.iso(x, y1, zr2), G.iso(x, y0, zr2)], shade: 'top' });
      out.push({ poly: [G.iso(x1, y0, z), G.iso(x1, y1, z), G.iso(x, y1, zr2), G.iso(x, y0, zr2)], shade: 'right' });
      out.push({ poly: [G.iso(x0, y1, z), G.iso(x, y1, zr2), G.iso(x1, y1, z)], shade: 'gable' });
    }
    return out;
  };

  /* Cylinder (silo) in iso: body as a rounded column plus an elliptical cap. */
  G.isoCyl = function (x, y, r, z0, z1) {
    var seg = 18, top = [], bot = [];
    for (var i = 0; i <= seg; i++) {
      var t = i / seg * Math.PI * 2;
      top.push(G.iso(x + Math.cos(t) * r, y + Math.sin(t) * r, z1));
      bot.push(G.iso(x + Math.cos(t) * r, y + Math.sin(t) * r, z0));
    }
    /* the lit half of the body is the front-facing arc */
    var half = Math.round(seg / 2);
    return {
      top: top,
      body: top.slice(0, half + 1).concat(bot.slice(0, half + 1).reverse()),
      bodyBack: top.slice(half).concat(bot.slice(half).reverse())
    };
  };

})(window.GEOM = window.GEOM || {});

/* ============================================================
   Greedy label placement. A map that drops a few small labels
   reads better than one that prints all of them on top of each
   other; high-priority labels are always kept.
   ============================================================ */
(function (G) {
  G.placeLabels = function (specs) {
    var boxes = [], out = [];
    specs.slice().sort(function (a, b) { return (b.pri || 1) - (a.pri || 1); }).forEach(function (s) {
      var w = s.text.length * s.size * 0.53, h = s.size * 1.1;
      var ax = s.anchor === 'middle' ? s.x - w / 2 : s.x;
      var offs = [0, s.size * 1.6, -s.size * 1.6, s.size * 3.1, -s.size * 3.1, s.size * 4.6, -s.size * 4.6];
      for (var i = 0; i < offs.length; i++) {
        var y = s.y + offs[i], box = [ax, y - h, ax + w, y + h * 0.3], hit = false;
        for (var b = 0; b < boxes.length; b++) {
          var o = boxes[b];
          if (!(box[2] < o[0] || box[0] > o[2] || box[3] < o[1] || box[1] > o[3])) { hit = true; break; }
        }
        if (!hit) { boxes.push(box); s = Object.assign({}, s, { y: y }); out.push(s); return; }
      }
      if ((s.pri || 1) >= 2) { boxes.push([ax, s.y - h, ax + w, s.y + h * 0.3]); out.push(s); }
    });
    return out;
  };
})(window.GEOM);

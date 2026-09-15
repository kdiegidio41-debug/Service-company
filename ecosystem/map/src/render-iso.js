/* ============================================================
   ISOMETRIC HOMESTEAD
   2:1 dimetric. Everything is depth-sorted on (x + y) so the
   farm occludes itself correctly. Light comes from upper-left.
   ============================================================ */
(function (G) {
  var el = G.el, P = G.path;
  var UI = '"Archivo", ui-sans-serif, system-ui, sans-serif';

  /* shade toward a cool dark so lit faces stay warm and shadows go blue-green */
  function sh(hex, k){ return G.mix(hex, '#26331F', k); }
  function lt(hex, k){ return G.mix(hex, '#FFF6DC', k); }

  var PAL = {
    sky0:'#E3EEDB', sky1:'#C6D9BE',
    grass:'#9DBC72', grassDark:'#8AAA62', grassEdge:'#7B9A55',
    soil:'#A9784B', soilDark:'#8C6239',
    wall:'#EFE4CB', wallWarm:'#E4D5B4',
    metal:'#CBCEC5', water:'#7FA9B8', waterLip:'#9CC0CB',
    road:'#C9B68E', roadEdge:'#B29E76',
    shadow:'rgba(46,58,38,0.20)', trunk:'#6B4E31',
    leaf:'#6E9647', leaf2:'#84AC57', leaf3:'#5C8039'
  };

  function face(g, poly, fill, stroke){
    el('path', { d:P(poly,true), fill:fill, stroke:stroke||'none',
      'stroke-width':stroke?0.22:0, 'stroke-linejoin':'round' }, g);
  }
  /* flat ground shadow: the footprint, projected, nudged toward the light's opposite */
  function groundShadow(g, x, y, w, h, spread){
    var s = spread||0.9;
    face(g, G.isoPoly(G.rect(x+s*0.5, y+s*0.5, w+s, h+s), 0), PAL.shadow);
  }

  function tree(g, x, y, s, i){
    groundShadow(g, x+0.5, y+0.4, s*1.5, s*1.5, 0.2);
    var t = G.isoBox(x, y, s*0.32, s*0.32, 0, s*1.5);
    face(g, t.right, sh(PAL.trunk,0.18)); face(g, t.left, sh(PAL.trunk,0.34));
    var lv = [[0, s*1.4, s*1.35, PAL.leaf2], [-s*0.42, s*2.15, s*1.05, PAL.leaf],
              [s*0.36, s*2.5, s*0.82, PAL.leaf3]];
    lv.forEach(function(c, j){
      var p = G.iso(x + c[0], y + c[0]*0.4, c[1]);
      el('ellipse', { cx:p[0], cy:p[1], rx:c[2]*1.05, ry:c[2]*0.9,
        fill: j===0 ? c[3] : (G.rnd(i+j)>0.5 ? c[3] : lt(c[3],0.1)) }, g);
    });
    var hp = G.iso(x - s*0.5, y - s*0.3, s*2.0);
    el('ellipse', { cx:hp[0], cy:hp[1], rx:s*0.5, ry:s*0.38, fill:lt(PAL.leaf2,0.3), opacity:0.75 }, g);
  }

  function building(g, st, zone){
    var s = G.spec(st.kind), x = st.x, y = st.y, w = st.w, h = st.h;
    var roofCol = zone ? zone.color : '#A0522D';
    var wallCol = s.glass ? '#DFF0EA' : PAL.wall;

    groundShadow(g, x, y, w, h, 1.1);

    if (s.prim === 'cyl'){
      var r = Math.min(w,h)/2, c = G.isoCyl(x, y, r, 0, s.z);
      face(g, c.body, PAL.metal);
      /* corrugation — the detail that makes a silo read as a silo */
      for (var i=-3; i<=3; i++){
        var a0 = Math.PI*0.5 + i*0.22;
        var p0 = G.iso(x+Math.cos(a0)*r*0.98, y+Math.sin(a0)*r*0.98, 0);
        var p1 = G.iso(x+Math.cos(a0)*r*0.98, y+Math.sin(a0)*r*0.98, s.z);
        el('line', { x1:p0[0], y1:p0[1], x2:p1[0], y2:p1[1],
          stroke:sh(PAL.metal, 0.12), 'stroke-width':0.18, opacity:0.8 }, g);
      }
      for (var b=1; b<4; b++){
        var zz = s.z*b/4, ring=[];
        for (var t2=0; t2<=9; t2++){ var a2=Math.PI*0.08 + (t2/9)*Math.PI*0.84;
          ring.push(G.iso(x+Math.cos(a2)*r, y+Math.sin(a2)*r, zz)); }
        el('path', { d:P(ring), fill:'none', stroke:sh(PAL.metal,0.16), 'stroke-width':0.16, opacity:0.6 }, g);
      }
      face(g, c.top, lt(PAL.metal, 0.22));
      G.isoRoof(x, y, r*2, r*2, s.z, 'dome').forEach(function(rf){
        face(g, rf.poly, rf.shade==='top' ? lt(roofCol,0.08) : sh(roofCol,0.2));
      });
      return;
    }
    if (s.prim === 'mound'){
      var m = G.isoCyl(x, y, Math.min(w,h)/2, 0, s.z*0.55);
      face(g, m.body, sh(PAL.soil, 0.12));
      face(g, m.top, PAL.soil);
      el('ellipse', { cx:G.iso(x,y,s.z*0.55)[0], cy:G.iso(x,y,s.z*0.55)[1],
        rx:Math.min(w,h)/2*0.55, ry:Math.min(w,h)/2*0.42, fill:sh(PAL.soilDark,0.15) }, g);
      return;
    }
    if (s.prim === 'mast'){
      var mz = s.z, mx = G.isoBox(x, y, 0.55, 0.55, 0, mz);
      face(g, mx.right, sh(PAL.trunk,0.15)); face(g, mx.left, sh(PAL.trunk,0.32));
      var tip = G.iso(x, y, mz);
      if (s.top === 'sails'){
        /* windmill tower plus four sails */
        var tw = G.isoBox(x, y, w*0.5, h*0.5, 0, mz*0.78);
        face(g, tw.right, sh(PAL.wallWarm,0.14)); face(g, tw.left, sh(PAL.wallWarm,0.3));
        face(g, tw.top, lt(PAL.wallWarm,0.1));
        G.isoRoof(x, y, w*0.5, h*0.5, mz*0.78, 'gable').forEach(function(rf){
          face(g, rf.poly, rf.shade==='top'?lt(roofCol,0.06):sh(roofCol,0.22)); });
        var hub = G.iso(x, y - h*0.3, mz*0.86);
        for (var a=0; a<4; a++){
          var ang = a*Math.PI/2 + 0.42;
          el('line', { x1:hub[0], y1:hub[1], x2:hub[0]+Math.cos(ang)*5.4, y2:hub[1]+Math.sin(ang)*5.4,
            stroke:'#7A6A4C', 'stroke-width':0.5, 'stroke-linecap':'round' }, g);
          el('rect', { x:hub[0]+Math.cos(ang)*2.2-0.6, y:hub[1]+Math.sin(ang)*2.2-0.6,
            width:1.6, height:1.6, fill:lt(PAL.wall,0.1), opacity:0.85,
            transform:'rotate('+(ang*180/Math.PI)+' '+(hub[0]+Math.cos(ang)*2.2)+' '+(hub[1]+Math.sin(ang)*2.2)+')' }, g);
        }
        el('circle', { cx:hub[0], cy:hub[1], r:0.6, fill:sh(roofCol,0.3) }, g);
      } else if (s.top === 'bell'){
        el('path', { d:'M'+(tip[0]-1.1)+' '+tip[1]+' Q'+tip[0]+' '+(tip[1]-3.2)+' '+(tip[0]+1.1)+' '+tip[1]+' Z',
          fill:'#C8A94E', stroke:sh('#C8A94E',0.3), 'stroke-width':0.18 }, g);
        el('circle', { cx:tip[0], cy:tip[1]+0.45, r:0.32, fill:sh('#C8A94E',0.4) }, g);
      } else if (s.top === 'board'){
        var bw2 = w*1.0, bh2 = 2.4;
        el('rect', { x:tip[0]-bw2/2, y:tip[1]-bh2, width:bw2, height:bh2, fill:lt('#8B6F47',0.28),
          stroke:sh('#8B6F47',0.2), 'stroke-width':0.2, rx:0.2 }, g);
        for (var ln=0; ln<3; ln++)
          el('line', { x1:tip[0]-bw2/2+0.5, y1:tip[1]-bh2+0.6+ln*0.62, x2:tip[0]+bw2/2-0.5-ln*0.7,
            y2:tip[1]-bh2+0.6+ln*0.62, stroke:sh('#8B6F47',0.35), 'stroke-width':0.16 }, g);
      } else if (s.top === 'crow'){
        el('line', { x1:tip[0]-2, y1:tip[1]+1.4, x2:tip[0]+2, y2:tip[1]+1.4,
          stroke:PAL.trunk, 'stroke-width':0.42, 'stroke-linecap':'round' }, g);
        el('circle', { cx:tip[0], cy:tip[1]-0.1, r:0.85, fill:'#B9793F' }, g);
        el('path', { d:'M'+(tip[0]-1.3)+' '+(tip[1]-0.7)+'L'+tip[0]+' '+(tip[1]-2.1)+'L'+(tip[0]+1.3)+' '+(tip[1]-0.7)+'Z',
          fill:'#8C6239' }, g);
        el('path', { d:'M'+(tip[0]-2)+' '+(tip[1]+1.4)+'L'+(tip[0]-1.5)+' '+(tip[1]+3.4),
          stroke:'#6E5B42', 'stroke-width':0.3, fill:'none' }, g);
      } else {
        var vt = G.isoBox(x, y, 1.5, 1.5, mz*0.5, mz);
        face(g, vt.right, sh(PAL.metal,0.15)); face(g, vt.left, sh(PAL.metal,0.3));
        face(g, vt.top, lt(PAL.metal,0.15));
        el('circle', { cx:tip[0], cy:tip[1], r:0.9, fill:'none', stroke:sh(PAL.metal,0.35),
          'stroke-width':0.3 }, g);
      }
      return;
    }
    if (s.prim === 'field'){
      var fq = G.isoPoly(G.rect(x,y,w,h), 0);
      face(g, fq, PAL.soil);
      var rows = st.rows || 5;
      for (var r2=0; r2<rows; r2++){
        var yy = y - h/2 + (h/rows)*(r2+0.5);
        var a3 = G.iso(x-w/2+0.5, yy, 0.35), b3 = G.iso(x+w/2-0.5, yy, 0.35);
        el('line', { x1:a3[0], y1:a3[1], x2:b3[0], y2:b3[1], stroke:PAL.leaf,
          'stroke-width':0.85, 'stroke-linecap':'round', opacity:0.92 }, g);
        el('line', { x1:a3[0], y1:a3[1]+0.34, x2:b3[0], y2:b3[1]+0.34, stroke:sh(PAL.soilDark,0.18),
          'stroke-width':0.3, opacity:0.55 }, g);
      }
      el('path', { d:P(fq,true), fill:'none', stroke:sh(PAL.soilDark,0.2), 'stroke-width':0.26 }, g);
      return;
    }
    /* pen: low rails around an open patch */
    if (s.prim === 'pen'){
      var pq = G.isoPoly(G.rect(x,y,w,h), 0);
      face(g, pq, s.glass ? '#D3E7DF' : G.mix(PAL.grass, PAL.soil, 0.28));
      if (s.rows) for (var c2=1; c2<4; c2++){
        var xx = x - w/2 + (w/4)*c2;
        var p1b = G.iso(xx, y-h/2+0.4, 0.3), p2b = G.iso(xx, y+h/2-0.4, 0.3);
        el('line', { x1:p1b[0], y1:p1b[1], x2:p2b[0], y2:p2b[1], stroke:PAL.leaf2,
          'stroke-width':0.75, 'stroke-linecap':'round' }, g);
      }
      var corners = G.rect(x,y,w,h);
      corners.forEach(function(cp, ci){
        var nx = corners[(ci+1)%4];
        var t1 = G.iso(cp[0], cp[1], 1.5), t2 = G.iso(nx[0], nx[1], 1.5);
        el('line', { x1:t1[0], y1:t1[1], x2:t2[0], y2:t2[1], stroke:'#B39A72',
          'stroke-width':0.26, opacity:0.95 }, g);
        var b1 = G.iso(cp[0], cp[1], 0);
        el('line', { x1:b1[0], y1:b1[1], x2:t1[0], y2:t1[1], stroke:'#9C8563', 'stroke-width':0.34 }, g);
      });
      return;
    }
    if (s.prim === 'disc'){
      var wc = G.isoCyl(x, y, Math.min(w,h)/2, 0, s.z);
      face(g, wc.body, sh('#B7ADA0',0.1));
      face(g, wc.top, '#6E7A80');
      el('ellipse', { cx:G.iso(x,y,s.z)[0], cy:G.iso(x,y,s.z)[1], rx:Math.min(w,h)/2*0.6,
        ry:Math.min(w,h)/2*0.46, fill:'#2E3A40' }, g);
      var r3 = Math.min(w,h)/2;
      [[-1,0],[1,0]].forEach(function(d){
        var pb = G.iso(x+d[0]*r3*0.8, y, s.z), pt = G.iso(x+d[0]*r3*0.8, y, s.z+3.4);
        el('line', { x1:pb[0], y1:pb[1], x2:pt[0], y2:pt[1], stroke:PAL.trunk, 'stroke-width':0.4 }, g);
      });
      var ra = G.iso(x-r3*0.8, y, s.z+3.4), rb2 = G.iso(x+r3*0.8, y, s.z+3.4);
      el('path', { d:'M'+ra[0]+' '+ra[1]+'L'+((ra[0]+rb2[0])/2)+' '+(ra[1]-1.6)+'L'+rb2[0]+' '+rb2[1],
        fill:sh(roofCol,0.1), stroke:sh(roofCol,0.3), 'stroke-width':0.2 }, g);
      return;
    }

    /* box: walls, then roof */
    var bx = G.isoBox(x, y, w, h, 0, s.z);
    face(g, bx.right, s.glass ? '#CFE7DE' : sh(wallCol, 0.13));
    face(g, bx.left,  s.glass ? '#BBD9CF' : sh(wallCol, 0.28));
    face(g, bx.top,   lt(wallCol, 0.12));
    /* siding + openings */
    if (!s.glass){
      for (var v=1; v<4; v++){
        var fx = x - w/2 + (w/4)*v;
        var s1 = G.iso(fx, y+h/2, 0), s2 = G.iso(fx, y+h/2, s.z);
        el('line', { x1:s1[0], y1:s1[1], x2:s2[0], y2:s2[1], stroke:sh(wallCol,0.34),
          'stroke-width':0.12, opacity:0.5 }, g);
      }
      var dw = Math.min(w,h)*0.3, dh = s.z*0.55;
      var d1 = G.iso(x, y+h/2, 0), d2 = G.iso(x, y+h/2, dh);
      el('path', { d:'M'+(d1[0]-dw/2)+' '+(d1[1]-dw*0.28)+'L'+(d1[0]+dw/2)+' '+(d1[1]+dw*0.28)+
        'L'+(d2[0]+dw/2)+' '+(d2[1]+dw*0.28)+'L'+(d2[0]-dw/2)+' '+(d2[1]-dw*0.28)+'Z',
        fill:sh(roofCol,0.42), opacity:0.9 }, g);
      if (s.z > 4){
        var wy = G.iso(x - w*0.26, y+h/2, s.z*0.66);
        el('rect', { x:wy[0]-0.75, y:wy[1]-0.75, width:1.5, height:1.5, fill:'#F7E9B8',
          stroke:sh(wallCol,0.4), 'stroke-width':0.14 }, g);
      }
    } else {
      for (var gx2=1; gx2<5; gx2++){
        var px2 = x - w/2 + (w/5)*gx2;
        var q1 = G.iso(px2, y+h/2, 0), q2 = G.iso(px2, y+h/2, s.z);
        el('line', { x1:q1[0], y1:q1[1], x2:q2[0], y2:q2[1], stroke:'#8FBCAC', 'stroke-width':0.16 }, g);
      }
    }
    G.isoRoof(x, y, w, h, s.z, s.roof || 'gable').forEach(function(rf){
      var c3 = rf.shade === 'top'  ? lt(roofCol, 0.1)
             : rf.shade === 'right'? sh(roofCol, 0.2)
             : rf.shade === 'left' ? sh(roofCol, 0.34)
             : rf.shade === 'glass'? '#D6ECE4'
             : sh(roofCol, 0.12);
      face(g, rf.poly, c3, sh(roofCol, 0.42));
    });
    if (s.chimney){
      var ch = G.isoBox(x + w*0.28, y - h*0.2, 1.1, 1.1, s.z, s.z + Math.min(w,h)*0.75);
      face(g, ch.right, sh('#9E6A54',0.16)); face(g, ch.left, sh('#9E6A54',0.32));
      face(g, ch.top, lt('#9E6A54',0.16));
    }
  }

  G.RENDER.isometric = function (host, world, api) {
    var o = api.opts;
    host.innerHTML = '';
    var svg = el('svg', { viewBox:'-67 -20 153 116', preserveAspectRatio:'xMidYMid meet' }, host);
    var defs = el('defs', null, svg);
    var sky = el('linearGradient', { id:'iso-sky', x1:'0', y1:'0', x2:'0.25', y2:'1' }, defs);
    el('stop', { offset:'0%', 'stop-color':PAL.sky0 }, sky);
    el('stop', { offset:'100%', 'stop-color':PAL.sky1 }, sky);
    var glow = el('radialGradient', { id:'iso-sun', cx:'26%', cy:'14%', r:'52%' }, defs);
    el('stop', { offset:'0%', 'stop-color':'#FFF3CE', 'stop-opacity':'0.75' }, glow);
    el('stop', { offset:'100%', 'stop-color':'#FFF3CE', 'stop-opacity':'0' }, glow);

    var root = el('g', { 'data-pan':'1' }, svg);
    el('rect', { x:-200, y:-200, width:600, height:500, fill:'url(#iso-sky)' }, root);
    el('rect', { x:-200, y:-200, width:600, height:500, fill:'url(#iso-sun)' }, root);

    var L = {};
    ['ground','zones','water','roads','props','labels','furn'].forEach(function(n){
      L[n] = el('g', { 'data-layer':n }, root);
    });

    /* ---- the parcel, with a thickness so it reads as a solid block of land ---- */
    var parcel = [[-1,-1],[101,-1],[101,71],[-1,71]];
    var pTop = G.isoPoly(parcel, 0);
    var depth = 5;
    face(L.ground, [pTop[1], pTop[2], G.iso(101,71,-depth), G.iso(101,-1,-depth)], sh(PAL.soilDark,0.15));
    face(L.ground, [pTop[2], pTop[3], G.iso(-1,71,-depth), G.iso(101,71,-depth)], sh(PAL.soilDark,0.32));
    face(L.ground, pTop, PAL.grass);
    /* mown variation so the field is not one flat green */
    for (var band=0; band<7; band++){
      var y0 = -1 + band*10.3;
      face(L.ground, G.isoPoly([[-1,y0],[101,y0],[101,y0+5.1],[-1,y0+5.1]], 0.02),
        band%2 ? PAL.grassDark : PAL.grass);
    }
    (world.terrain.hills||[]).forEach(function(hl){
      face(L.ground, G.isoPoly(hl.points, 1.6), G.mix(PAL.grass,'#B6C98C',0.45));
      face(L.ground, G.isoPoly(G.inset(hl.points,2.5), 2.8), G.mix(PAL.grass,'#C4D49B',0.5));
    });

    /* ---- zone tints ---- */
    world.zones.forEach(function(z){
      var zg = el('g', { 'data-pick':'zone', 'data-id':z.id, tabindex:'0', role:'button',
        'aria-label':z.name+' — '+z.domain, class:'pickable' }, L.zones);
      face(zg, G.isoPoly(z.polygon, 0.05), G.rgba(z.color, 0.17));
      el('path', { d:P(G.isoPoly(z.polygon, 0.05), true), fill:'none',
        stroke:G.rgba(z.color, 0.6), 'stroke-width':0.4, 'stroke-dasharray':'2 1.4' }, zg);
    });

    /* ---- water ---- */
    var T = world.terrain;
    if (T.stream) el('path', { d:G.smooth(G.isoPoly(T.stream, 0.06), 0.8), fill:'none',
      stroke:PAL.water, 'stroke-width':2.4, 'stroke-linecap':'round' }, L.water);
    if (T.pond){
      var ring = [];
      for (var i=0; i<=28; i++){ var t=i/28*Math.PI*2;
        ring.push([T.pond.x+Math.cos(t)*T.pond.rx, T.pond.y+Math.sin(t)*T.pond.ry]); }
      face(L.water, G.isoPoly(ring,0.02), PAL.waterLip);
      face(L.water, G.isoPoly(G.inset(ring,0.55),0.08), PAL.water);
      var sp = G.iso(T.pond.x-1.4, T.pond.y-0.8, 0.12);
      el('ellipse', { cx:sp[0], cy:sp[1], rx:2.6, ry:0.9, fill:'#C8E2E8', opacity:0.55 }, L.water);
    }

    /* ---- roads ---- */
    if (o.roads !== false) world.roads.forEach(function(rd){
      var ip = G.isoPoly(rd.points, 0.1);
      el('path', { d:G.smooth(ip,0.7), fill:'none', stroke:PAL.roadEdge,
        'stroke-width':rd.width*0.8+0.5, 'stroke-linecap':'round', 'stroke-linejoin':'round' }, L.roads);
      el('path', { d:G.smooth(ip,0.7), fill:'none', stroke:PAL.road,
        'stroke-width':rd.width*0.8, 'stroke-linecap':'round', 'stroke-linejoin':'round' }, L.roads);
    });

    /* ---- perimeter fence: posts and two rails ---- */
    var fen = T.fence.concat([T.fence[0]]);
    for (var f=0; f<fen.length-1; f++){
      var a = fen[f], b = fen[f+1], seg = Math.hypot(b[0]-a[0], b[1]-a[1]), n = Math.round(seg/4);
      for (var k=0; k<n; k++){
        var u = k/n, u2 = (k+1)/n;
        var pA = [a[0]+(b[0]-a[0])*u,  a[1]+(b[1]-a[1])*u];
        var pB = [a[0]+(b[0]-a[0])*u2, a[1]+(b[1]-a[1])*u2];
        var t0 = G.iso(pA[0],pA[1],0), t1 = G.iso(pA[0],pA[1],2.1);
        el('line', { x1:t0[0], y1:t0[1], x2:t1[0], y2:t1[1], stroke:'#8C7550', 'stroke-width':0.36 }, L.roads);
        [1.9, 1.05].forEach(function(hz){
          var r1 = G.iso(pA[0],pA[1],hz), r2 = G.iso(pB[0],pB[1],hz);
          el('line', { x1:r1[0], y1:r1[1], x2:r2[0], y2:r2[1], stroke:'#A18B63', 'stroke-width':0.26 }, L.roads);
        });
      }
    }

    /* ---- every prop, depth sorted ---- */
    var props = [];
    world.stations.forEach(function(st){
      props.push({ d:G.depth(st.x, st.y), kind:'st', st:st,
        zone: world.zones.find(function(z){ return z.id===st.zone; }) });
    });
    (T.trees||[]).forEach(function(t,i){ props.push({ d:G.depth(t[0],t[1]), kind:'tree', t:t, i:i }); });
    var oc = T.orchard;
    for (var r4=0; r4<oc.rows; r4++) for (var c4=0; c4<oc.cols; c4++){
      var ox = oc.x + c4*oc.spacing, oy = oc.y + r4*oc.spacing;
      props.push({ d:G.depth(ox,oy), kind:'tree', t:[ox,oy,1.1], i:900+r4*7+c4 });
    }
    /* ground-level stations sit under everything else at the same depth */
    props.sort(function(a,b){
      var fa = a.kind==='st' && (G.spec(a.st.kind).prim==='field'||G.spec(a.st.kind).prim==='pen') ? -0.5 : 0;
      var fb = b.kind==='st' && (G.spec(b.st.kind).prim==='field'||G.spec(b.st.kind).prim==='pen') ? -0.5 : 0;
      return (a.d+fa) - (b.d+fb);
    });
    props.forEach(function(p){
      if (p.kind === 'tree'){ tree(L.props, p.t[0], p.t[1], p.t[2], p.i); return; }
      var g = el('g', { 'data-pick':'station', 'data-id':p.st.id, tabindex:'0', role:'button',
        'aria-label':p.st.name, class:'pickable' }, L.props);
      building(g, p.st, p.zone);
    });

    /* ---- flows, drawn above the farm in the air ---- */
    var byId = {}; world.stations.forEach(function(s){ byId[s.id]=s; });
    var flowG = el('g', { 'data-flows':'1', opacity:o.flows?1:0, style:'transition:opacity .25s' }, L.props);
    world.flows.forEach(function(fl,i){
      var a = byId[fl.from], b = byId[fl.to]; if(!a||!b) return;
      var lift = 26 + (i%4)*3.4;
      var pa = G.iso(a.x,a.y,G.spec(a.kind).z), pb = G.iso(b.x,b.y,G.spec(b.kind).z);
      var pm = G.iso((a.x+b.x)/2,(a.y+b.y)/2, lift);
      var col = world.flowKinds[fl.kind].color;
      var pth = el('path', { d:'M'+pa[0]+' '+pa[1]+'Q'+pm[0]+' '+pm[1]+' '+pb[0]+' '+pb[1],
        fill:'none', stroke:col, 'stroke-width':0.42, 'stroke-linecap':'round',
        'stroke-dasharray':'3.4 3.2', opacity:0.55 }, flowG);
      el('animate', { attributeName:'stroke-dashoffset', from:'13.2', to:'0',
        dur:(2.6+(i%5)*0.35)+'s', repeatCount:'indefinite' }, pth);
    });

    /* ---- labels ---- */
    if (o.labels !== false){
      var specs = [];
      world.zones.forEach(function(z){
        var c = G.centroid(z.polygon), p = G.iso(c[0], c[1], 7);
        specs.push({ x:p[0], y:p[1], size:2.9, anchor:'middle', pri:3, zone:z,
          text:z.name.replace(/^The /,'').toUpperCase() });
      });
      world.stations.forEach(function(st){
        var sp = G.spec(st.kind), ground = sp.prim==='field'||sp.prim==='pen';
        var p = G.iso(st.x, st.y, sp.z + (ground ? 2.2 : 5.4));
        specs.push({ x:p[0], y:p[1], size:1.9, anchor:'middle',
          pri: st.w*st.h > 55 ? 2 : 1, text:st.name.replace(/^The /,'') });
      });
      G.placeLabels(specs).forEach(function(sp){
        var isZone = !!sp.zone;
        var t = el('text', { x:sp.x, y:sp.y, 'text-anchor':'middle',
          fill: isZone ? G.mix(sp.zone.color,'#2A331F',0.32) : '#33402A',
          'font-size':sp.size, 'font-family':UI, 'font-weight': isZone ? 700 : 600,
          'letter-spacing': isZone ? '0.14' : null, 'paint-order':'stroke',
          stroke: isZone ? 'rgba(250,252,244,0.9)' : 'rgba(246,250,240,0.92)',
          'stroke-width': isZone ? 1.3 : 0.9, 'stroke-linejoin':'round',
          'pointer-events':'none', opacity: isZone ? 0.94 : 1 }, L.labels);
        t.textContent = sp.text;
      });
    }

    /* ---- title ---- */
    var ttl = el('text', { x:-65, y:-12, fill:'#2C3A24', 'font-size':6, 'font-family':UI,
      'font-weight':700, 'letter-spacing':'-0.01' }, L.furn);
    ttl.textContent = 'The Steading';
    var sub = el('text', { x:-65, y:-7.6, fill:'#5F6E52', 'font-size':2.5, 'font-family':UI }, L.furn);
    sub.textContent = world.tagline;

    return { svg:svg, root:root, flows:flowG };
  };

})(window.GEOM);

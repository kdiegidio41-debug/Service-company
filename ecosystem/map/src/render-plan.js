/* ============================================================
   PLAN-VIEW ENGINE
   Blueprint, Almanac, Night Watch and Editorial are all
   top-down. They share this engine and differ only in paint
   and furniture.
   ============================================================ */
(function (G) {
  var el = G.el, P = G.path, S = G.smooth;

  function bbox(poly){
    var xs = poly.map(function(p){return p[0];}), ys = poly.map(function(p){return p[1];});
    return { x0:Math.min.apply(null,xs), y0:Math.min.apply(null,ys),
             x1:Math.max.apply(null,xs), y1:Math.max.apply(null,ys) };
  }
  function jitter(poly, amt, seed){
    if(!amt) return poly;
    return poly.map(function(p,i){
      return [p[0] + (G.rnd(seed+i*3.1)-0.5)*amt, p[1] + (G.rnd(seed+i*7.7)-0.5)*amt];
    });
  }
  /* an arc between two stations, bowed perpendicular to the run */
  function link(a, b, bow){
    var mx=(a[0]+b[0])/2, my=(a[1]+b[1])/2, dx=b[0]-a[0], dy=b[1]-a[1];
    var L=Math.hypot(dx,dy)||1, nx=-dy/L, ny=dx/L, k=(bow==null?0.16:bow)*L;
    return { d:'M'+a[0].toFixed(2)+' '+a[1].toFixed(2)+'Q'+(mx+nx*k).toFixed(2)+' '+(my+ny*k).toFixed(2)+
                ' '+b[0].toFixed(2)+' '+b[1].toFixed(2),
             mid:[mx+nx*k*0.5, my+ny*k*0.5], len:L };
  }

  G.makePlan = function (cfg) {
    return function render(host, world, api) {
      var pal = cfg.pal, o = api.opts;
      host.innerHTML = '';
      var svg = el('svg', { viewBox: cfg.viewBox || '-6 -6 112 82', preserveAspectRatio:'xMidYMid meet' }, host);
      var defs = el('defs', null, svg);
      if (cfg.defs) cfg.defs(defs, svg, pal);

      var root = el('g', { 'data-pan':'1' }, svg);
      el('rect', { x:-120, y:-120, width:360, height:320, fill:pal.ground }, root);
      if (cfg.underlay) cfg.underlay(root, world, pal);

      var L = {};
      ['terrain','zones','ground','roads','fence','flora','build','flows','labels','furn']
        .forEach(function(n){ L[n] = el('g', { 'data-layer':n }, root); });

      var T = world.terrain, jx = cfg.jitter || 0, labelSpecs = [];

      /* ---------- terrain ---------- */
      (T.hills||[]).forEach(function(hl,i){
        el('path', { d:P(jitter(hl.points,jx,i*11), true), fill:pal.hill,
                     stroke:pal.hillLine||'none', 'stroke-width':cfg.hair||0.22,
                     opacity: cfg.hillOpacity==null?1:cfg.hillOpacity }, L.terrain);
      });
      if (T.stream) el('path', { d:S(T.stream,0.8), fill:'none', stroke:pal.water,
        'stroke-width':1.7, 'stroke-linecap':'round', opacity:cfg.waterOpacity||1 }, L.terrain);
      if (T.pond){
        el('ellipse', { cx:T.pond.x, cy:T.pond.y, rx:T.pond.rx, ry:T.pond.ry, fill:pal.water,
          stroke:pal.waterLine||'none', 'stroke-width':cfg.hair||0.22 }, L.terrain);
        if (cfg.pondSheen) el('ellipse', { cx:T.pond.x-1.2, cy:T.pond.y-0.9, rx:T.pond.rx*0.42,
          ry:T.pond.ry*0.34, fill:pal.waterSheen, opacity:0.5 }, L.terrain);
      }

      /* ---------- zones ---------- */
      world.zones.forEach(function (z, zi) {
        var poly = jitter(z.polygon, jx, zi*29);
        var g = el('g', { 'data-pick':'zone', 'data-id':z.id, tabindex:'0', role:'button',
                          'aria-label':z.name+' — '+z.domain, class:'pickable' }, L.zones);
        el('path', { d:P(poly,true), fill:cfg.zoneFill(z), stroke:cfg.zoneStroke(z),
                     'stroke-width':cfg.zoneW||0.45, 'stroke-linejoin':'round',
                     'stroke-dasharray':cfg.zoneDash||null }, g);
        if (cfg.zoneInner) el('path', { d:P(G.inset(poly,1.1),true), fill:'none',
          stroke:cfg.zoneStroke(z), 'stroke-width':cfg.hair||0.18, opacity:0.5 }, g);
        var bb = bbox(poly);
        labelSpecs.push({ x:bb.x0+1.5, y:bb.y0+3.2, size:cfg.zoneFS||2.25, pri:3, zone:z,
          text: cfg.upper===false ? z.name : z.name.toUpperCase() });
      });

      /* ---------- ground-level stations (fields, pens) ---------- */
      world.stations.forEach(function (st) {
        var sp = G.spec(st.kind);
        if (sp.prim !== 'field' && sp.prim !== 'pen') return;
        var pl = G.plan(st), z = world.zones.find(function(q){return q.id===st.zone;});
        var g = el('g', { 'data-pick':'station', 'data-id':st.id, tabindex:'0', role:'button',
                          'aria-label':st.name, class:'pickable' }, L.ground);
        var f = pl.foot;
        el('rect', { x:f.x-f.w/2, y:f.y-f.h/2, width:f.w, height:f.h,
          fill:cfg.groundFill(st,z), stroke:cfg.groundStroke(st,z),
          'stroke-width':cfg.hair||0.22, 'stroke-dasharray':f.open?'1 0.9':null, rx:cfg.radius||0 }, g);
        pl.marks.forEach(function(m){ drawMark(m, g, cfg, z, true); });
      });

      /* ---------- roads ---------- */
      if (o.roads !== false) world.roads.forEach(function (rd) {
        var pts = jitter(rd.points, jx*0.6, 3);
        if (cfg.roadCasing) el('path', { d:S(pts,0.7), fill:'none', stroke:cfg.roadCasing,
          'stroke-width':rd.width*(cfg.roadScale||1)+0.5, 'stroke-linecap':'round', 'stroke-linejoin':'round' }, L.roads);
        el('path', { d:S(pts,0.7), fill:'none', stroke:pal.road, 'stroke-width':rd.width*(cfg.roadScale||1),
          'stroke-linecap':'round', 'stroke-linejoin':'round',
          'stroke-dasharray':cfg.roadDash||null, opacity:cfg.roadOpacity||1 }, L.roads);
      });

      /* ---------- fence + gates ---------- */
      el('path', { d:P(jitter(T.fence,jx,101), true), fill:'none', stroke:pal.fence,
        'stroke-width':cfg.fenceW||0.3, 'stroke-dasharray':cfg.fenceDash||'1.6 1.1' }, L.fence);
      (T.gates||[]).forEach(function(gt){
        el('rect', { x:gt.x-2, y:gt.y-0.5, width:4, height:1, fill:pal.fence, opacity:0.9 }, L.fence);
      });

      /* ---------- flora ---------- */
      if (cfg.trees !== false) {
        (T.trees||[]).forEach(function(t,i){ cfg.tree(L.flora, t[0], t[1], t[2], pal, i); });
        var oc = T.orchard;
        for (var r=0; r<oc.rows; r++) for (var c=0; c<oc.cols; c++)
          cfg.tree(L.flora, oc.x + c*oc.spacing, oc.y + r*oc.spacing, 1.15, pal, 500+r*10+c);
      }

      /* ---------- structures ---------- */
      world.stations.slice().sort(function(a,b){ return (a.y+a.x)-(b.y+b.x); }).forEach(function (st) {
        var sp = G.spec(st.kind);
        if (sp.prim === 'field' || sp.prim === 'pen') return;
        var pl = G.plan(st), z = world.zones.find(function(q){return q.id===st.zone;});
        var g = el('g', { 'data-pick':'station', 'data-id':st.id, tabindex:'0', role:'button',
                          'aria-label':st.name, class:'pickable' }, L.build);
        var f = pl.foot;
        if (cfg.shadow) {
          if (f.t==='rect') el('rect', { x:f.x-f.w/2+cfg.shadow, y:f.y-f.h/2+cfg.shadow,
            width:f.w, height:f.h, fill:pal.shadow, opacity:0.5, rx:cfg.radius||0 }, g);
          else if (f.t==='circle') el('circle', { cx:f.x+cfg.shadow, cy:f.y+cfg.shadow, r:f.r,
            fill:pal.shadow, opacity:0.5 }, g);
        }
        if (f.t === 'rect')
          el('rect', { x:f.x-f.w/2, y:f.y-f.h/2, width:f.w, height:f.h, fill:cfg.buildFill(st,z),
            stroke:cfg.buildStroke(st,z), 'stroke-width':cfg.buildW||0.3, rx:cfg.radius||0 }, g);
        else if (f.t === 'circle')
          el('circle', { cx:f.x, cy:f.y, r:f.r, fill:cfg.buildFill(st,z),
            stroke:cfg.buildStroke(st,z), 'stroke-width':cfg.buildW||0.3 }, g);
        else
          el('ellipse', { cx:f.x, cy:f.y, rx:f.rx, ry:f.ry, fill:cfg.buildFill(st,z),
            stroke:cfg.buildStroke(st,z), 'stroke-width':cfg.buildW||0.3 }, g);
        pl.marks.forEach(function(m){ drawMark(m, g, cfg, z, false); });
      });

      /* ---------- station labels ---------- */
      if (o.labels !== false) {
        world.stations.forEach(function (st) {
          var sp = G.spec(st.kind), z = world.zones.find(function(q){return q.id===st.zone;});
          var ground = sp.prim==='field' || sp.prim==='pen';
          labelSpecs.push({ x:st.x, y: ground ? st.y : st.y + st.h/2 + 1.8,
            size:cfg.stFS||1.5, anchor:'middle', pri: (st.w*st.h > 55 ? 2 : 1),
            station:st, zone:z, text: st.name.replace(/^The /,'') });
        });
        G.placeLabels(labelSpecs).forEach(function (sp2) {
          var isZone = !!sp2.zone && !sp2.station;
          var t = el('text', { x:sp2.x, y:sp2.y, 'text-anchor':sp2.anchor||'start',
            fill: isZone ? cfg.zoneLabel(sp2.zone) : cfg.stationLabel(sp2.station, sp2.zone),
            'font-size':sp2.size, 'font-family': isZone ? cfg.labelFont : cfg.monoFont,
            'font-weight': isZone ? (cfg.zoneWeight||700) : 400,
            'letter-spacing': isZone ? (cfg.zoneTrack||'0.12') : null,
            'paint-order':'stroke', stroke:cfg.labelHalo||'none',
            'stroke-width':cfg.labelHalo?0.55:0, 'stroke-linejoin':'round',
            'pointer-events':'none' }, L.labels);
          t.textContent = sp2.text;
        });
      }

      /* ---------- flows ---------- */
      var flowG = el('g', { 'data-flows':'1', opacity: o.flows ? 1 : 0,
        style:'transition:opacity .25s' }, L.flows);
      var byId = {}; world.stations.forEach(function(s){ byId[s.id]=s; });
      world.flows.forEach(function (fl, i) {
        var a = byId[fl.from], b = byId[fl.to];
        if (!a || !b) return;
        var k = world.flowKinds[fl.kind], col = cfg.flowColor(fl, k);
        var lk = link([a.x,a.y],[b.x,b.y], i%2 ? 0.14 : -0.14);
        var p = el('path', { d:lk.d, fill:'none', stroke:col, 'stroke-width':cfg.flowW||0.34,
          'stroke-linecap':'round', 'stroke-dasharray':cfg.flowDash||null,
          opacity:cfg.flowOpacity||0.85, 'marker-end':'url(#ar-'+fl.kind+')',
          'data-flow':fl.kind }, flowG);
        if (cfg.animateFlows) {
          p.setAttribute('stroke-dasharray','1.4 2.6');
          var an = el('animate', { attributeName:'stroke-dashoffset', from:'8', to:'0',
            dur:(2.2 + (i%5)*0.35)+'s', repeatCount:'indefinite' }, p);
          an.setAttribute('calcMode','linear');
        }
      });
      /* arrowheads, one per flow kind */
      Object.keys(world.flowKinds).forEach(function (kk) {
        var m = el('marker', { id:'ar-'+kk, viewBox:'0 0 10 10', refX:'9', refY:'5',
          markerWidth:'4.5', markerHeight:'4.5', orient:'auto-start-reverse' }, defs);
        el('path', { d:'M0 1 L9 5 L0 9 z', fill:cfg.flowColor({kind:kk}, world.flowKinds[kk]) }, m);
      });

      if (cfg.furniture) cfg.furniture(L.furn, world, pal, svg, defs);
      return { svg:svg, root:root, flows:flowG };
    };
  };

  function drawMark(m, g, cfg, z, isGround) {
    var sw = (m.soft ? (cfg.hair||0.18)*0.75 : (cfg.markW||0.24));
    var col = m.soft ? cfg.markSoft(z) : cfg.markStroke(z);
    if (m.t === 'line')
      el('line', { x1:m.a[0], y1:m.a[1], x2:m.b[0], y2:m.b[1], stroke:col, 'stroke-width':sw,
        'stroke-linecap':'round', opacity:m.soft?0.7:1 }, g);
    else if (m.t === 'circle')
      el('circle', { cx:m.x, cy:m.y, r:m.r, fill:m.fill?col:'none', stroke:col, 'stroke-width':sw }, g);
    else if (m.t === 'ellipse')
      el('ellipse', { cx:m.x, cy:m.y, rx:m.rx, ry:m.ry, fill:m.fill?col:'none', stroke:col,
        'stroke-width':sw }, g);
    else if (m.t === 'rect')
      el('rect', { x:m.x-m.w/2, y:m.y-m.h/2, width:m.w, height:m.h, fill:m.fill?col:'none',
        stroke:col, 'stroke-width':sw }, g);
  }
  G._drawMark = drawMark;

})(window.GEOM);

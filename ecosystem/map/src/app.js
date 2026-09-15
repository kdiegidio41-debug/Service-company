/* ============================================================
   THE STEADING — app shell
   ============================================================ */
(function () {
  var G = window.GEOM, W = window.WORLD;

  var STYLES = [
    { id:'blueprint', label:'Blueprint',  chip:['#0A1A2F','#5AD2FF'],
      note:'Issued drawing. Dimensioned, hatched, title-blocked.' },
    { id:'isometric', label:'Homestead',  chip:['#9DBC72','#A0522D'],
      note:'Built in three dimensions, lit from the north-west.' },
    { id:'almanac',   label:'Almanac',    chip:['#E8DCC0','#8E3B2F'],
      note:"Surveyor's estate plan, inked on laid paper." },
    { id:'neon',      label:'Night Watch',chip:['#050B14','#3DF5D0'],
      note:'Live operations display. Channels animate.' },
    { id:'editorial', label:'Editorial',  chip:['#FCFCFA','#2E6F5E'],
      note:'The clean one. Built for a deck or a wall.' }
  ];

  var idx = {
    zone:{}, station:{}, role:{}, task:{},
    stationsByZone:{}, rolesByZone:{}, rolesByStation:{}, tasksByStation:{}
  };
  W.zones.forEach(function(z){ idx.zone[z.id]=z; idx.stationsByZone[z.id]=[]; idx.rolesByZone[z.id]=[]; });
  W.stations.forEach(function(s){ idx.station[s.id]=s; idx.stationsByZone[s.zone].push(s);
    idx.rolesByStation[s.id]=[]; idx.tasksByStation[s.id]=[]; });
  W.roles.forEach(function(r){ idx.role[r.id]=r; idx.rolesByZone[r.zone].push(r);
    (idx.rolesByStation[r.station]||[]).push(r); });
  W.tasks.forEach(function(t){ idx.task[t.id]=t; (idx.tasksByStation[t.station]||[]).push(t); });

  var state = {
    style: 'isometric',
    sel: null,
    opts: { flows:false, labels:true, roads:true },
    view: { s:1, tx:0, ty:0 }
  };
  try { var sv = localStorage.getItem('steading.style');
    if (sv && STYLES.some(function(s){return s.id===sv;})) state.style = sv; } catch(e){}

  var $ = function(s){ return document.querySelector(s); };
  var stage, panel, tip, tabsEl, zoomLabel, current;

  /* ---------------- rendering ---------------- */
  function draw(){
    document.documentElement.setAttribute('data-style', state.style);
    current = G.RENDER[state.style](stage, W, { opts: state.opts });
    applyView();
    wireStage();
    markSelection();
    tabsEl.querySelectorAll('.tab').forEach(function(b){
      b.setAttribute('aria-pressed', String(b.dataset.style === state.style)); });
    $('#styleNote').textContent = STYLES.filter(function(s){return s.id===state.style;})[0].note;
  }
  function applyView(){
    if (!current) return;
    var v = state.view;
    current.root.setAttribute('transform',
      'translate('+v.tx.toFixed(2)+' '+v.ty.toFixed(2)+') scale('+v.s.toFixed(3)+')');
    zoomLabel.textContent = Math.round(v.s*100) + '%';
  }
  function resetView(){ state.view = { s:1, tx:0, ty:0 }; applyView(); }

  function wireStage(){
    var svg = current.svg, drag = null;
    function unit(){
      var vb = svg.viewBox.baseVal, r = svg.getBoundingClientRect();
      return vb.width / Math.max(r.width, 1);
    }
    svg.addEventListener('pointerdown', function(e){
      if (e.button !== 0) return;
      drag = { x:e.clientX, y:e.clientY, tx:state.view.tx, ty:state.view.ty, moved:false, u:unit() };
      svg.setPointerCapture(e.pointerId); svg.classList.add('dragging');
    });
    svg.addEventListener('pointermove', function(e){
      if (drag){
        var dx = e.clientX-drag.x, dy = e.clientY-drag.y;
        if (Math.abs(dx)+Math.abs(dy) > 3) drag.moved = true;
        state.view.tx = drag.tx + dx*drag.u; state.view.ty = drag.ty + dy*drag.u;
        applyView(); return;
      }
      var host = e.target.closest ? e.target.closest('[data-pick]') : null;
      if (host){
        var n = host.dataset.pick==='zone' ? idx.zone[host.dataset.id] : idx.station[host.dataset.id];
        if (n) showTip(e.clientX, e.clientY, n.name, host.dataset.pick==='zone' ? n.domain : idx.zone[n.zone].name);
      } else hideTip();
    });
    ['pointerup','pointercancel','pointerleave'].forEach(function(ev){
      svg.addEventListener(ev, function(e){
        if (drag) svg.classList.remove('dragging');
        if (ev==='pointerup' && drag && !drag.moved){
          var host = e.target.closest ? e.target.closest('[data-pick]') : null;
          select(host ? { kind:host.dataset.pick, id:host.dataset.id } : null);
        }
        drag = null; if (ev!=='pointerup') hideTip();
      });
    });
    svg.addEventListener('wheel', function(e){
      e.preventDefault();
      var r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
      var u = vb.width/Math.max(r.width,1);
      var px = (e.clientX-r.left)*u + vb.x, py = (e.clientY-r.top)*u + vb.y;
      var k = Math.exp(-e.deltaY*0.0016), ns = Math.min(6, Math.max(0.45, state.view.s*k));
      var f = ns/state.view.s;
      state.view.tx = px - (px-state.view.tx)*f;
      state.view.ty = py - (py-state.view.ty)*f;
      state.view.s = ns; applyView();
    }, { passive:false });
    svg.querySelectorAll('[data-pick]').forEach(function(n){
      n.addEventListener('keydown', function(e){
        if (e.key==='Enter' || e.key===' '){ e.preventDefault();
          select({ kind:n.dataset.pick, id:n.dataset.id }); }
      });
    });
  }

  function showTip(cx, cy, title, sub){
    var r = stage.getBoundingClientRect();
    tip.style.left = (cx-r.left)+'px'; tip.style.top = (cy-r.top)+'px';
    tip.innerHTML = '';
    tip.appendChild(document.createTextNode(title));
    var k = document.createElement('span'); k.className='k'; k.textContent = '  '+sub;
    tip.appendChild(k); tip.classList.add('on');
  }
  function hideTip(){ tip.classList.remove('on'); }

  function markSelection(){
    if (!current) return;
    current.svg.querySelectorAll('.pickable.sel').forEach(function(n){ n.classList.remove('sel'); });
    if (!state.sel) return;
    var n = current.svg.querySelector('[data-pick="'+state.sel.kind+'"][data-id="'+state.sel.id+'"]');
    if (n) n.classList.add('sel');
  }
  function select(sel){ state.sel = sel; markSelection(); renderPanel(); }

  /* ---------------- panel ---------------- */
  function h(tag, cls, txt){ var n=document.createElement(tag); if(cls)n.className=cls;
    if(txt!=null)n.textContent=txt; return n; }
  function list(items){ var ul=h('ul','lst'); items.forEach(function(t){ ul.appendChild(h('li',null,t)); }); return ul; }
  function tierPill(t){
    var mt = W.modelTiers[t], p = h('span','tier', mt.label);
    p.style.background = mt.color; p.title = mt.model + ' — ' + mt.use; return p;
  }
  function roleCard(r, withZone){
    var c = h('div','rolecard');
    if (r.agent) c.classList.add('live');
    var head = h('div','rhead'), left = h('div');
    var nm = h('div','rname'); nm.appendChild(document.createTextNode(r.name));
    if (r.agent){
      var lp = h('span','livepill','Live');
      lp.title = 'Runs today as the "'+r.agent+'" subagent — no API key needed';
      nm.appendChild(lp);
    }
    left.appendChild(nm);
    left.appendChild(h('div','rtitle', r.title + (withZone ? ' · '+idx.zone[r.zone].name : '')));
    head.appendChild(left); head.appendChild(tierPill(r.tier));
    c.appendChild(head);
    if (r.agent) c.appendChild(h('div','agentline', 'subagent  ' + r.agent));
    c.appendChild(h('div','rchart', r.charter));
    var d = h('dl','kv');
    d.appendChild(h('dt',null,'Reads')); d.appendChild(h('dd',null, r.reads.join(' · ')));
    d.appendChild(h('dt',null,'Writes')); d.appendChild(h('dd',null, r.writes.join(' · ')));
    d.appendChild(h('dt',null,'Escalates'));
    d.appendChild(h('dd',null, idx.role[r.escalatesTo] ? idx.role[r.escalatesTo].name : r.escalatesTo));
    c.appendChild(d);
    var du = h('details'); du.appendChild(h('summary','chipbtn','Duties ('+r.duties.length+')'));
    du.appendChild(list(r.duties)); du.style.marginTop='2px';
    c.appendChild(du);
    return c;
  }
  function block(title, node){
    var b = h('div','block'); b.appendChild(h('h3',null,title)); b.appendChild(node); return b;
  }
  function chipRow(items, onPick){
    var d = h('div','chips');
    items.forEach(function(it){
      var b = h('button','chipbtn', it.label); b.type='button';
      b.addEventListener('click', function(){ onPick(it); }); d.appendChild(b);
    });
    return d;
  }

  function renderPanel(){
    panel.innerHTML = '';
    var w = h('div','panel-in');
    if (!state.sel) overview(w);
    else if (state.sel.kind === 'zone') zoneView(w, idx.zone[state.sel.id]);
    else stationView(w, idx.station[state.sel.id]);
    panel.appendChild(w);
    panel.scrollTop = 0;
  }

  function overview(w){
    var e = h('div','eyebrow'); e.appendChild(h('span',null,'The map')); w.appendChild(e);
    w.appendChild(h('h2','ptitle', W.name));
    w.appendChild(h('p','psub', W.tagline));
    w.appendChild(h('p','pbody',
      'Every concept a multi-agent system needs has a physical place here. Click a building to see who works '+
      'there and what they do; click the open ground inside a boundary to read the zone it belongs to.'));
    var warn = h('div','warn');
    warn.appendChild(h('b',null,'Status — staffed in part'));
    warn.appendChild(document.createTextNode(W.note));
    w.appendChild(warn);
    w.appendChild(block('Zones', chipRow(W.zones.map(function(z){
      return { label:z.name.replace(/^The /,'') + ' — ' + z.domain, id:z.id };
    }), function(it){ select({kind:'zone', id:it.id}); })));
    var counts = h('dl','kv');
    var staffed = W.roles.filter(function(r){ return r.agent; }).length;
    [['Zones',W.zones.length],['Stations',W.stations.length],['Roles',W.roles.length],
     ['— staffed', staffed + ' by ' + Object.keys(W.agents||{}).length + ' agents'],
     ['Tasks',W.tasks.length],['Channels',W.flows.length]].forEach(function(p){
      counts.appendChild(h('dt',null,p[0])); counts.appendChild(h('dd',null,String(p[1])));
    });
    w.appendChild(block('Scale', counts));
    var tiers = h('div','chips');
    Object.keys(W.modelTiers).forEach(function(k){
      var mt = W.modelTiers[k], c = h('div','rolecard');
      var hd = h('div','rhead'); hd.appendChild(h('div','rname', mt.label)); hd.appendChild(tierPill(k));
      c.appendChild(hd); c.appendChild(h('div','rchart', mt.use));
      c.appendChild(h('div','rtitle', mt.model)); c.style.width='100%'; tiers.appendChild(c);
    });
    w.appendChild(block('Model tiers', tiers));
  }

  function zoneView(w, z){
    var e = h('div','eyebrow'); var d = h('span','dot'); d.style.background = z.color;
    e.appendChild(d); e.appendChild(h('span',null,'Zone · '+z.domain)); w.appendChild(e);
    w.appendChild(h('h2','ptitle', z.name));
    w.appendChild(h('p','psub', z.subtitle + ' · branch ' + z.branch));
    w.appendChild(h('p','pbody', z.charter));
    w.appendChild(block('Owns', list(z.owns)));
    var warn = h('div','warn'); warn.appendChild(h('b',null,'Where it breaks'));
    warn.appendChild(document.createTextNode(z.failsWhen)); w.appendChild(warn);
    w.appendChild(block('Stations ('+idx.stationsByZone[z.id].length+')',
      chipRow(idx.stationsByZone[z.id].map(function(s){ return { label:s.name, id:s.id }; }),
        function(it){ select({kind:'station', id:it.id}); })));
    var rw = h('div','block'); rw.appendChild(h('h3',null,'Roles ('+idx.rolesByZone[z.id].length+')'));
    var box = h('div'); box.style.display='grid'; box.style.gap='8px';
    idx.rolesByZone[z.id].forEach(function(r){ box.appendChild(roleCard(r)); });
    rw.appendChild(box); w.appendChild(rw);
  }

  function stationView(w, st){
    var z = idx.zone[st.zone];
    var e = h('div','eyebrow'); var d = h('span','dot'); d.style.background = z.color;
    e.appendChild(d);
    var back = h('button','chipbtn', z.name); back.type='button';
    back.style.cssText = 'border:0;background:none;padding:0;font:inherit;color:inherit;cursor:pointer;letter-spacing:inherit;text-transform:inherit';
    back.addEventListener('click', function(){ select({kind:'zone', id:z.id}); });
    e.appendChild(back); w.appendChild(e);
    w.appendChild(h('h2','ptitle', st.name));
    w.appendChild(h('p','psub', G.spec(st.kind).label + ' · ' + st.x + ', ' + st.y));
    w.appendChild(h('p','pbody', st.purpose));
    w.appendChild(block('Takes in', list(st.inputs)));
    w.appendChild(block('Puts out', list(st.outputs)));

    var roles = idx.rolesByStation[st.id] || [];
    if (roles.length){
      var rw = h('div','block'); rw.appendChild(h('h3',null,'Stationed here ('+roles.length+')'));
      var box = h('div'); box.style.display='grid'; box.style.gap='8px';
      roles.forEach(function(r){ box.appendChild(roleCard(r)); });
      rw.appendChild(box); w.appendChild(rw);
    }
    var tasks = idx.tasksByStation[st.id] || [];
    if (tasks.length){
      var tw = h('div','block'); tw.appendChild(h('h3',null,'Tasks ('+tasks.length+')'));
      var tb = h('div');
      tasks.forEach(function(t){
        var row = h('div','taskrow');
        row.appendChild(h('div','tn', t.name));
        [['Runs when', t.trigger],['In', t.input],['Out', t.output],
         ['Done when', t.doneWhen],['Watch for', t.watchFor]].forEach(function(p){
          var m = h('div','tm'); var b = h('b',null,p[0]+': ');
          m.appendChild(b); m.appendChild(document.createTextNode(p[1])); row.appendChild(m);
        });
        var ow = idx.role[t.owner];
        var m2 = h('div','tm'); m2.appendChild(h('b',null,'Owner: '));
        m2.appendChild(document.createTextNode(ow ? ow.name+' ('+ow.title+')' : t.owner));
        row.appendChild(m2);
        tb.appendChild(row);
      });
      tw.appendChild(tb); w.appendChild(tw);
    }
    var fl = W.flows.filter(function(f){ return f.from===st.id || f.to===st.id; });
    if (fl.length){
      var fw = h('div','block'); fw.appendChild(h('h3',null,'Connections ('+fl.length+')'));
      var fb = h('dl','kv');
      fl.forEach(function(f){
        var other = f.from===st.id ? idx.station[f.to] : idx.station[f.from];
        var dir = f.from===st.id ? '→ ' : '← ';
        var dt = h('dt',null, W.flowKinds[f.kind].label);
        dt.style.color = W.flowKinds[f.kind].color;
        fb.appendChild(dt); fb.appendChild(h('dd',null, dir + other.name + ' · ' + f.label));
      });
      fw.appendChild(fb); w.appendChild(fw);
    }
  }

  /* ---------------- roster ---------------- */
  function openRoster(){
    var ov = h('div','roster'); ov.id='roster';
    var inn = h('div','roster-in');
    var close = h('button','closeR','Close'); close.type='button';
    close.addEventListener('click', closeRoster);
    inn.appendChild(close);
    inn.appendChild(h('h2',null,'The roster'));
    var st = W.roles.filter(function(r){ return r.agent; }).length;
    inn.appendChild(h('p','rlead',
      'Every role on the farm, grouped by the zone it answers to. Each has a charter, a fixed set of things '+
      'it may read and write, and one place to escalate. '+st+' of '+W.roles.length+' are marked Live — those '+
      'run today as Claude Code subagents in .claude/agents/, no API key required. The rest are charters '+
      'waiting for a reason to exist.'));
    W.zones.forEach(function(z){
      var sec = h('section','rzone');
      var hh = h('h3'); var dot = h('span','dot');
      dot.style.cssText='width:11px;height:11px;border-radius:50%;background:'+z.color;
      hh.appendChild(dot); hh.appendChild(document.createTextNode(z.name+' — '+z.domain));
      var zs = idx.rolesByZone[z.id].filter(function(r){ return r.agent; }).length;
      var cnt = h('span',null, zs+' live / '+idx.rolesByZone[z.id].length+' roles');
      cnt.style.cssText='margin-left:auto;color:var(--ink-3);font-weight:400;letter-spacing:0';
      hh.appendChild(cnt); sec.appendChild(hh);
      var grid = h('div','rgrid');
      idx.rolesByZone[z.id].forEach(function(r){ grid.appendChild(roleCard(r)); });
      sec.appendChild(grid); inn.appendChild(sec);
    });
    ov.appendChild(inn); document.body.appendChild(ov);
    document.addEventListener('keydown', escRoster);
    close.focus();
  }
  function closeRoster(){ var r=$('#roster'); if(r) r.remove();
    document.removeEventListener('keydown', escRoster); }
  function escRoster(e){ if(e.key==='Escape') closeRoster(); }

  /* ---------------- boot ---------------- */
  function boot(){
    stage = $('#stage'); panel = $('#panel'); tip = $('#tip');
    tabsEl = $('#tabs'); zoomLabel = $('#zoomval');

    STYLES.forEach(function(s){
      var b = h('button','tab'); b.type='button'; b.dataset.style = s.id;
      b.title = s.note;
      var c = h('span','chip');
      c.style.background = 'linear-gradient(135deg,'+s.chip[0]+' 0 50%,'+s.chip[1]+' 50% 100%)';
      b.appendChild(c);
      var l = h('span','lab', s.label); b.appendChild(l);
      b.addEventListener('click', function(){
        if (state.style === s.id) return;
        state.style = s.id;
        try { localStorage.setItem('steading.style', s.id); } catch(e){}
        resetView(); draw();
      });
      tabsEl.appendChild(b);
    });

    [['flows','Channels'],['labels','Labels'],['roads','Tracks']].forEach(function(p){
      var b = h('button','tgl', p[1]); b.type='button';
      b.setAttribute('aria-pressed', String(state.opts[p[0]]));
      b.addEventListener('click', function(){
        state.opts[p[0]] = !state.opts[p[0]];
        b.setAttribute('aria-pressed', String(state.opts[p[0]]));
        if (p[0]==='flows' && current) current.flows.setAttribute('opacity', state.opts.flows?1:0);
        else draw();
      });
      $('#toggles').appendChild(b);
    });

    $('#rosterBtn').addEventListener('click', openRoster);
    $('#zin').addEventListener('click', function(){
      state.view.s = Math.min(6, state.view.s*1.25); applyView(); });
    $('#zout').addEventListener('click', function(){
      state.view.s = Math.max(0.45, state.view.s/1.25); applyView(); });
    $('#zfit').addEventListener('click', function(){ resetView(); select(null); });

    var lg = $('#legendRows');
    W.legend.forEach(function(L){
      var row = h('div','row'); var dash = h('span','dash');
      dash.style.borderTopColor = W.flowKinds[L.swatch].color;
      row.appendChild(dash); row.appendChild(h('span',null,W.flowKinds[L.swatch].label));
      row.title = L.text; lg.appendChild(row);
    });

    draw(); renderPanel();
    window.addEventListener('resize', function(){ if (current) applyView(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

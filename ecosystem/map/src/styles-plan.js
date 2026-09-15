/* ============================================================
   The four plan-view treatments.
   ============================================================ */
(function (G) {
  var el = G.el, P = G.path;
  var MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
  var UI   = '"Archivo", ui-sans-serif, system-ui, sans-serif';
  var SER  = '"EB Garamond", Georgia, serif';
  G.RENDER = G.RENDER || {};

  function hex2rgb(h){ h=h.replace('#',''); if(h.length===3) h=h.split('').map(function(c){return c+c;}).join('');
    return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
  function rgba(h,a){ var c=hex2rgb(h); return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'; }
  function mix(h1,h2,t){ var a=hex2rgb(h1),b=hex2rgb(h2);
    return '#'+[0,1,2].map(function(i){ return Math.round(a[i]+(b[i]-a[i])*t).toString(16).padStart(2,'0'); }).join(''); }
  G.rgba = rgba; G.mix = mix;

  /* ============================================================
     1 — BLUEPRINT.  A drafting sheet: the farm as issued drawing.
     ============================================================ */
  G.RENDER.blueprint = G.makePlan({
    pal:{ ground:'#0A1A2F', hill:'#0E2842', water:'#123D5C', road:'#2E5F84',
          fence:'#2A5478', shadow:'#000', waterSheen:'#1D5A80' },
    viewBox:'-9 -10 120 95', roadScale:0.5,
    labelFont:MONO, monoFont:MONO, hair:0.14, markW:0.2, buildW:0.26, zoneW:0.3,
    zoneDash:'2.2 1.4', zoneFS:2.3, stFS:1.45, roadDash:'2.4 1.5', hillOpacity:0.75,
    zoneFill:function(){ return 'rgba(90,210,255,0.035)'; },
    zoneStroke:function(){ return '#2E7FA8'; },
    zoneLabel:function(){ return '#7FD4F5'; },
    subLabel:function(){ return '#4E86A8'; },
    groundFill:function(){ return 'url(#bp-hatch)'; },
    groundStroke:function(){ return '#3E8CB4'; },
    buildFill:function(){ return 'rgba(10,26,47,0.85)'; },
    buildStroke:function(){ return '#5AD2FF'; },
    markStroke:function(){ return '#5AD2FF'; },
    markSoft:function(){ return '#2E7FA8'; },
    stationLabel:function(){ return '#9FD9F2'; },
    flowColor:function(f,k){ return k ? k.color : '#5AD2FF'; },
    flowW:0.24, flowOpacity:0.75,
    tree:function(g,x,y,s,pal){
      el('circle',{cx:x,cy:y,r:s*0.85,fill:'none',stroke:'#2E7FA8','stroke-width':0.14},g);
      el('line',{x1:x-s*0.5,y1:y,x2:x+s*0.5,y2:y,stroke:'#2E7FA8','stroke-width':0.11},g);
      el('line',{x1:x,y1:y-s*0.5,x2:x,y2:y+s*0.5,stroke:'#2E7FA8','stroke-width':0.11},g);
    },
    defs:function(defs){
      var h=el('pattern',{id:'bp-hatch',width:'2',height:'2',patternUnits:'userSpaceOnUse',
        patternTransform:'rotate(45)'},defs);
      el('rect',{width:2,height:2,fill:'rgba(46,127,168,0.10)'},h);
      el('line',{x1:0,y1:0,x2:0,y2:2,stroke:'#2E7FA8','stroke-width':0.3,opacity:0.5},h);
      var gr=el('pattern',{id:'bp-grid',width:'10',height:'10',patternUnits:'userSpaceOnUse'},defs);
      el('path',{d:'M10 0 H0 V10',fill:'none',stroke:'rgba(90,210,255,0.11)','stroke-width':0.16},gr);
      var gm=el('pattern',{id:'bp-grid-m',width:'2',height:'2',patternUnits:'userSpaceOnUse'},defs);
      el('path',{d:'M2 0 H0 V2',fill:'none',stroke:'rgba(90,210,255,0.05)','stroke-width':0.09},gm);
    },
    underlay:function(root){
      el('rect',{x:-6,y:-6,width:112,height:82,fill:'url(#bp-grid-m)'},root);
      el('rect',{x:-6,y:-6,width:112,height:82,fill:'url(#bp-grid)'},root);
    },
    furniture:function(g,world){
      var C='#5AD2FF', D='#2E7FA8';
      /* sheet border */
      el('rect',{x:-3.4,y:-3.4,width:106.8,height:76.8,fill:'none',stroke:D,'stroke-width':0.3},g);
      el('rect',{x:-2.4,y:-2.4,width:104.8,height:74.8,fill:'none',stroke:D,'stroke-width':0.14},g);
      /* dimension line across the top */
      var dy=-4.6;
      el('line',{x1:0,y1:dy,x2:100,y2:dy,stroke:C,'stroke-width':0.16},g);
      [0,100].forEach(function(x){ el('line',{x1:x,y1:dy-0.9,x2:x,y2:dy+0.9,stroke:C,'stroke-width':0.16},g); });
      var t=el('text',{x:50,y:dy-0.9,'text-anchor':'middle',fill:C,'font-size':1.7,'font-family':MONO},g);
      t.textContent='100.00 ch';
      var dx=-4.6;
      el('line',{x1:dx,y1:0,x2:dx,y2:70,stroke:C,'stroke-width':0.16},g);
      [0,70].forEach(function(y){ el('line',{x1:dx-0.9,y1:y,x2:dx+0.9,y2:y,stroke:C,'stroke-width':0.16},g); });
      var t2=el('text',{x:dx-1.1,y:35,fill:C,'font-size':1.7,'font-family':MONO,
        transform:'rotate(-90 '+(dx-1.1)+' 35)','text-anchor':'middle'},g);
      t2.textContent='70.00 ch';
      /* north arrow, in the right margin */
      var nx=106,ny=9;
      el('circle',{cx:nx,cy:ny,r:3.4,fill:'none',stroke:D,'stroke-width':0.16},g);
      el('path',{d:'M'+nx+' '+(ny-3)+'L'+(nx+1.3)+' '+(ny+1.4)+'L'+nx+' '+(ny+0.5)+'L'+(nx-1.3)+' '+(ny+1.4)+'Z',
        fill:C},g);
      var nt=el('text',{x:nx,y:ny+5.6,'text-anchor':'middle',fill:C,'font-size':1.8,'font-family':MONO},g);
      nt.textContent='N';
      /* title block, in the bottom margin */
      var bx=53,by=75,bw=57,bh=7.6;
      el('rect',{x:bx,y:by,width:bw,height:bh,fill:'rgba(10,26,47,0.92)',stroke:C,'stroke-width':0.22},g);
      el('line',{x1:bx,y1:by+2.9,x2:bx+bw,y2:by+2.9,stroke:D,'stroke-width':0.14},g);
      el('line',{x1:bx+36,y1:by,x2:bx+36,y2:by+bh,stroke:D,'stroke-width':0.14},g);
      function tx(x,y,s,sz,col,w){ var n=el('text',{x:x,y:y,fill:col||C,'font-size':sz,
        'font-family':MONO,'letter-spacing':'0.08','font-weight':w||400},g); n.textContent=s; return n; }
      tx(bx+1.2,by+2.2,'THE STEADING',1.9,C,600);
      tx(bx+1.2,by+4.7,'GENERAL ARRANGEMENT · PLAN VIEW',1.25,D);
      tx(bx+1.2,by+6.9,world.zones.length+' ZONES · '+world.stations.length+' STATIONS · SCALE 1:1 ch',1.25,D);
      tx(bx+37.2,by+2.1,'SHEET',1.25,D); tx(bx+45,by+2.1,'01 OF 05',1.25,C,600);
      tx(bx+37.2,by+4.4,'REV',1.25,D);   tx(bx+45,by+4.4,'v'+world.version,1.25,C,600);
      tx(bx+37.2,by+6.7,'STATUS',1.25,D);tx(bx+45,by+6.7,'FOUNDATION',1.25,'#FFB454',600);
    }
  });

  /* ============================================================
     2 — SURVEYOR'S ALMANAC.  Inked estate survey on laid paper.
     ============================================================ */
  G.RENDER.almanac = G.makePlan({
    pal:{ ground:'#E8DCC0', hill:'#D7C7A2', water:'#A9B9A8', road:'#B09A6E',
          fence:'#7A6444', shadow:'#8B7550', waterSheen:'#C3CFBE', waterLine:'#7E8E7C' },
    viewBox:'-12 -11 126 102', roadScale:0.5,
    labelFont:SER, monoFont:SER, hair:0.16, markW:0.2, buildW:0.26, zoneW:0.34,
    jitter:0.32, zoneFS:2.6, stFS:1.55, upper:false, zoneWeight:600, zoneTrack:'0.04',
    zoneInner:true, hillOpacity:0.85, pondSheen:true, labelHalo:'#E8DCC0',
    zoneFill:function(z){ return G.rgba(z.color,0.13); },
    zoneStroke:function(z){ return G.mix(z.color,'#4A3728',0.45); },
    zoneLabel:function(){ return '#3B2C1E'; },
    subLabel:function(){ return '#8B6F47'; },
    groundFill:function(z,zz){ return zz? G.rgba(zz.color,0.22):'rgba(0,0,0,0.05)'; },
    groundStroke:function(z,zz){ return zz? G.mix(zz.color,'#4A3728',0.5):'#8B6F47'; },
    buildFill:function(){ return '#F2E9D2'; },
    buildStroke:function(){ return '#4A3728'; },
    markStroke:function(){ return '#4A3728'; },
    markSoft:function(){ return '#9A8461'; },
    stationLabel:function(){ return '#5A4632'; },
    flowColor:function(f,k){ return k ? G.mix(k.color,'#4A3728',0.3) : '#4A3728'; },
    flowW:0.24, flowDash:'1.8 1.3', flowOpacity:0.6,
    tree:function(g,x,y,s,pal,i){
      var r=s*0.9, pts=[];
      for(var a=0;a<9;a++){ var t=a/9*Math.PI*2, rr=r*(0.78+G.rnd(i*3+a)*0.42);
        pts.push([x+Math.cos(t)*rr, y+Math.sin(t)*rr*0.86]); }
      el('path',{d:P(pts,true),fill:'#B9C4A0',stroke:'#6B7355','stroke-width':0.14},g);
      el('line',{x1:x,y1:y+r*0.5,x2:x,y2:y+r*1.25,stroke:'#6B5A3E','stroke-width':0.18},g);
    },
    defs:function(defs){
      var f=el('filter',{id:'al-grain',x:'-5%',y:'-5%',width:'110%',height:'110%'},defs);
      el('feTurbulence',{type:'fractalNoise',baseFrequency:'0.85',numOctaves:'4',result:'n'},f);
      el('feColorMatrix',{type:'saturate',values:'0',in:'n',result:'g'},f);
      el('feComponentTransfer',{in:'g',result:'c'},f).appendChild(
        (function(){ var fn=document.createElementNS('http://www.w3.org/2000/svg','feFuncA');
          fn.setAttribute('type','linear'); fn.setAttribute('slope','0.09'); return fn; })());
      el('feBlend',{in:'SourceGraphic',in2:'c',mode:'multiply'},f);
      var st=el('radialGradient',{id:'al-stain'},defs);
      el('stop',{offset:'0%','stop-color':'#C9B187','stop-opacity':'0.30'},st);
      el('stop',{offset:'100%','stop-color':'#C9B187','stop-opacity':'0'},st);
    },
    underlay:function(root){
      [[14,12,22],[86,58,26],[52,66,17],[96,20,14],[8,52,18]].forEach(function(s){
        el('ellipse',{cx:s[0],cy:s[1],rx:s[2],ry:s[2]*0.72,fill:'url(#al-stain)'},root);
      });
      /* laid-paper chain lines */
      for(var i=0;i<=100;i+=4)
        el('line',{x1:i,y1:-6,x2:i,y2:76,stroke:'#D9CBA9','stroke-width':0.12,opacity:0.6},root);
    },
    furniture:function(g,world){
      var INK='#4A3728', SEAL='#8E3B2F';
      /* double ruled border with corner ticks */
      el('rect',{x:-3.6,y:-3.6,width:107.2,height:77.2,fill:'none',stroke:INK,'stroke-width':0.42},g);
      el('rect',{x:-2.5,y:-2.5,width:105,height:75,fill:'none',stroke:INK,'stroke-width':0.16},g);
      [[-3.6,-3.6],[103.6,-3.6],[-3.6,73.6],[103.6,73.6]].forEach(function(c){
        el('circle',{cx:c[0],cy:c[1],r:0.8,fill:'none',stroke:INK,'stroke-width':0.22},g);
      });
      /* compass rose */
      var cx=106,cy=8,R=5.4;
      el('circle',{cx:cx,cy:cy,r:R,fill:'none',stroke:INK,'stroke-width':0.22},g);
      el('circle',{cx:cx,cy:cy,r:R*0.72,fill:'none',stroke:INK,'stroke-width':0.12},g);
      for(var a=0;a<8;a++){
        var t=a*Math.PI/4, lg=(a%2===0)?R:R*0.62, wd=(a%2===0)?0.9:0.55;
        var px=cx+Math.cos(t-Math.PI/2)*lg, py=cy+Math.sin(t-Math.PI/2)*lg;
        var ox=cx+Math.cos(t-Math.PI/2+Math.PI/2)*wd, oy=cy+Math.sin(t-Math.PI/2+Math.PI/2)*wd;
        var ox2=cx+Math.cos(t-Math.PI/2-Math.PI/2)*wd, oy2=cy+Math.sin(t-Math.PI/2-Math.PI/2)*wd;
        el('path',{d:'M'+px+' '+py+'L'+ox+' '+oy+'L'+ox2+' '+oy2+'Z',
          fill:(a===0)?SEAL:(a%2===0?INK:'#9A8461')},g);
      }
      var nn=el('text',{x:cx,y:cy-R-1.2,'text-anchor':'middle',fill:INK,'font-size':2.2,
        'font-family':SER,'font-style':'italic'},g); nn.textContent='N';
      /* cartouche */
      var bx=-11,by=76,bw=52,bh=14;
      el('rect',{x:bx,y:by,width:bw,height:bh,fill:'rgba(242,233,210,0.88)',stroke:INK,'stroke-width':0.34},g);
      el('rect',{x:bx+0.9,y:by+0.9,width:bw-1.8,height:bh-1.8,fill:'none',stroke:'#9A8461','stroke-width':0.12},g);
      function tx(x,y,s,sz,col,it,w){ var n=el('text',{x:x,y:y,fill:col||INK,'font-size':sz,
        'font-family':SER,'font-style':it?'italic':'normal','font-weight':w||400,
        'text-anchor':'middle'},g); n.textContent=s; return n; }
      tx(bx+bw/2,by+5.2,'The Steading',5.6,INK,false,600);
      el('line',{x1:bx+9,y1:by+6.8,x2:bx+bw-9,y2:by+6.8,stroke:'#9A8461','stroke-width':0.16},g);
      tx(bx+bw/2,by+9.8,'A Survey of the Agent Ecosystem',2.4,'#6E5B42',true);
      tx(bx+bw/2,by+12.8,world.zones.length+' Zones · '+world.stations.length+' Stations · '+world.roles.length+' Roles · '+world.tasks.length+' Tasks',1.9,'#8B6F47');
      /* scale bar */
      var sx=48,sy=81;
      el('rect',{x:sx,y:sy,width:10,height:0.9,fill:INK},g);
      el('rect',{x:sx+10,y:sy,width:10,height:0.9,fill:'#F2E9D2',stroke:INK,'stroke-width':0.14},g);
      el('rect',{x:sx+20,y:sy,width:10,height:0.9,fill:INK},g);
      [0,10,20,30].forEach(function(d){
        var n=el('text',{x:sx+d,y:sy-0.8,'text-anchor':'middle',fill:INK,'font-size':1.5,'font-family':SER},g);
        n.textContent=String(d); });
      var sl=el('text',{x:sx+15,y:sy+3.3,'text-anchor':'middle',fill:'#6E5B42','font-size':1.6,
        'font-family':SER,'font-style':'italic'},g); sl.textContent='chains';
    }
  });

  /* ============================================================
     3 — NIGHT WATCH.  The farm as a live operations display.
     ============================================================ */
  G.RENDER.neon = G.makePlan({
    pal:{ ground:'#050B14', hill:'#08161F', water:'#07283A', road:'#14455A',
          fence:'#123A4A', shadow:'#000', waterSheen:'#0C4E63' },
    viewBox:'-9 -12 120 96', roadScale:0.45,
    labelFont:MONO, monoFont:MONO, hair:0.14, markW:0.2, buildW:0.26, zoneW:0.3,
    zoneFS:2.3, stFS:1.4, animateFlows:true, hillOpacity:0.9,
    zoneFill:function(z){ return G.rgba(z.accent,0.055); },
    zoneStroke:function(z){ return z.accent; },
    zoneLabel:function(z){ return z.accent; },
    subLabel:function(){ return '#3E7A6E'; },
    groundFill:function(z,zz){ return zz? G.rgba(zz.accent,0.10):'rgba(61,245,208,0.06)'; },
    groundStroke:function(z,zz){ return zz? zz.accent:'#3DF5D0'; },
    buildFill:function(){ return '#081420'; },
    buildStroke:function(z,zz){ return zz? zz.accent:'#3DF5D0'; },
    markStroke:function(z){ return z? z.accent:'#3DF5D0'; },
    markSoft:function(z){ return z? G.rgba(z.accent,0.45):'rgba(61,245,208,0.4)'; },
    stationLabel:function(){ return '#7FD8C6'; },
    flowColor:function(f,k){ return k ? k.color : '#3DF5D0'; },
    flowW:0.28, flowOpacity:0.9,
    tree:function(g,x,y,s){
      el('circle',{cx:x,cy:y,r:s*0.5,fill:'rgba(61,245,208,0.13)'},g);
      el('circle',{cx:x,cy:y,r:s*0.18,fill:'#2C7A6B'},g);
    },
    defs:function(defs){
      var f=el('filter',{id:'nb-glow',x:'-60%',y:'-60%',width:'220%',height:'220%'},defs);
      el('feGaussianBlur',{stdDeviation:'0.7',result:'b'},f);
      var m=el('feMerge',null,f); el('feMergeNode',{in:'b'},m); el('feMergeNode',{in:'SourceGraphic'},m);
      var gr=el('pattern',{id:'nb-grid',width:'5',height:'5',patternUnits:'userSpaceOnUse'},defs);
      el('path',{d:'M5 0 H0 V5',fill:'none',stroke:'rgba(61,245,208,0.055)','stroke-width':0.1},gr);
      var sc=el('pattern',{id:'nb-scan',width:'1',height:'2',patternUnits:'userSpaceOnUse'},defs);
      el('rect',{width:1,height:1,fill:'rgba(0,0,0,0.20)'},sc);
      var vg=el('radialGradient',{id:'nb-vig',cx:'50%',cy:'48%',r:'62%'},defs);
      el('stop',{offset:'55%','stop-color':'#000','stop-opacity':'0'},vg);
      el('stop',{offset:'100%','stop-color':'#000','stop-opacity':'0.62'},vg);
    },
    underlay:function(root){ el('rect',{x:-9,y:-12,width:120,height:96,fill:'url(#nb-grid)'},root); },
    furniture:function(g,world,pal,svg){
      var C='#3DF5D0';
      /* glow on every stroked element in the build + zone layers */
      svg.querySelectorAll('[data-layer="build"],[data-layer="zones"],[data-layer="flows"]')
        .forEach(function(n){ n.setAttribute('filter','url(#nb-glow)'); });
      /* corner brackets */
      [[-3,-3,1,1],[103,-3,-1,1],[-3,73,1,-1],[103,73,-1,-1]].forEach(function(c){
        el('path',{d:'M'+(c[0]+6*c[2])+' '+c[1]+'H'+c[0]+'V'+(c[1]+6*c[3]),fill:'none',
          stroke:C,'stroke-width':0.3,opacity:0.8},g);
      });
      /* status readout */
      function tx(x,y,s,sz,col,w){ var n=el('text',{x:x,y:y,fill:col||C,'font-size':sz,
        'font-family':MONO,'letter-spacing':'0.1','font-weight':w||400},g); n.textContent=s; return n; }
      tx(-8,-6.4,'THE STEADING // LIVE',2.2,C,600);
      tx(26,-6.4,'▪ '+world.flows.length+' CHANNELS',1.6,'#6FB9A8');
      tx(48,-6.4,'▪ '+world.roles.length+' ROLES',1.6,'#6FB9A8');
      tx(66,-6.4,'▪ '+world.tasks.length+' TASKS',1.6,'#6FB9A8');
      tx(110,-6.4,'STATUS: FOUNDATION',1.6,'#FFC857',600).setAttribute('text-anchor','end');
      /* channel key, bottom-left, matching the animated flows */
      var kx=-8, ky=79.5;
      Object.keys(world.flowKinds).forEach(function(k,i){
        var col=world.flowKinds[k].color, x=kx+i*23.4;
        el('line',{x1:x,y1:ky-0.6,x2:x+4,y2:ky-0.6,stroke:col,'stroke-width':0.5,
          'stroke-dasharray':'1.4 1.4'},g);
        tx(x+5,ky,world.flowKinds[k].label.toUpperCase(),1.6,col);
      });
      el('rect',{x:-9,y:-12,width:120,height:96,fill:'url(#nb-scan)','pointer-events':'none',opacity:0.5},g);
      el('rect',{x:-9,y:-12,width:120,height:96,fill:'url(#nb-vig)','pointer-events':'none'},g);
    }
  });

  /* ============================================================
     4 — EDITORIAL.  The version that goes in the deck.
     ============================================================ */
  G.RENDER.editorial = G.makePlan({
    pal:{ ground:'#FCFCFA', hill:'#EFF1EC', water:'#DCE7EA', road:'#E2E4DF',
          fence:'#C9CEC7', shadow:'#1A1D1C', waterSheen:'#EAF1F3', waterLine:'#C2D2D6' },
    viewBox:'-7 -17 116 106', roadScale:0.5,
    labelFont:UI, monoFont:UI, hair:0.16, markW:0.2, buildW:0.26, zoneW:0.3,
    zoneFS:2.3, stFS:1.45, radius:0.4, roadCasing:'#FCFCFA', trees:true, shadow:0.35,
    zoneFill:function(z){ return G.rgba(z.color,0.075); },
    zoneStroke:function(z){ return G.rgba(z.color,0.55); },
    zoneLabel:function(z){ return G.mix(z.color,'#1A1D1C',0.42); },
    subLabel:function(){ return '#8D9693'; },
    groundFill:function(z,zz){ return zz? G.rgba(zz.color,0.16):'#F0F1EE'; },
    groundStroke:function(z,zz){ return zz? G.rgba(zz.color,0.6):'#C9CEC7'; },
    buildFill:function(){ return '#FFFFFF'; },
    buildStroke:function(z,zz){ return zz? G.mix(zz.color,'#1A1D1C',0.3):'#5C6663'; },
    markStroke:function(z){ return z? G.mix(z.color,'#1A1D1C',0.35):'#5C6663'; },
    markSoft:function(z){ return z? G.rgba(z.color,0.5):'#B8BEBA'; },
    stationLabel:function(){ return '#5C6663'; },
    flowColor:function(f,k){ return k ? k.color : '#5C6663'; },
    flowW:0.24, flowOpacity:0.62,
    tree:function(g,x,y,s){
      el('circle',{cx:x,cy:y+0.25,r:s*0.8,fill:'rgba(26,29,28,0.07)'},g);
      el('circle',{cx:x,cy:y,r:s*0.8,fill:'#CFDCC2'},g);
      el('circle',{cx:x-s*0.22,cy:y-s*0.22,r:s*0.34,fill:'#DCE6D2'},g);
    },
    defs:function(defs){
      var sh=el('filter',{id:'ed-soft',x:'-20%',y:'-20%',width:'140%',height:'140%'},defs);
      el('feDropShadow',{dx:'0',dy:'0.3','stdDeviation':'0.35','flood-color':'#1A1D1C',
        'flood-opacity':'0.10'},sh);
    },
    furniture:function(g,world,pal,svg){
      svg.querySelectorAll('[data-layer="build"]').forEach(function(n){
        n.setAttribute('filter','url(#ed-soft)'); });
      var INK='#1A1D1C', SUB='#8D9693', ACC='#2E6F5E';
      function tx(x,y,s,sz,col,w,anchor){ var n=el('text',{x:x,y:y,fill:col||INK,'font-size':sz,
        'font-family':UI,'font-weight':w||400,'text-anchor':anchor||'start'},g); n.textContent=s; return n; }
      /* title lockup */
      tx(-6,-10.2,'The Steading',5.6,INK,700);
      tx(-6,-6.4,'An AI agent ecosystem, mapped as a working farm',2.3,SUB,400);
      el('line',{x1:-6,y1:-4.2,x2:36,y2:-4.2,stroke:ACC,'stroke-width':0.5},g);
      /* figures, right-aligned against the title */
      var stats=[[world.zones.length,'zones'],[world.stations.length,'stations'],
                 [world.roles.length,'roles'],[world.tasks.length,'tasks']];
      stats.forEach(function(s,i){
        var x=62+i*12.4;
        tx(x,-8,String(s[0]),4.6,ACC,700);
        tx(x,-5,s[1],1.8,SUB,500);
      });
      /* numbered zone callouts — the zones are a set, not a sequence, so the
         numbers key to the legend rather than implying an order */
      world.zones.forEach(function(z,i){
        var xs=z.polygon.map(function(p){return p[0];}), ys=z.polygon.map(function(p){return p[1];});
        var x=Math.max.apply(null,xs)-2.2, y=Math.max.apply(null,ys)-2.4;
        el('circle',{cx:x,cy:y,r:1.7,fill:z.color},g);
        tx(x,y+0.62,String(i+1),2,'#fff',700,'middle');
      });
      /* key */
      var kx=-6, ky=78.5;
      world.zones.forEach(function(z,i){
        var col=i%4, row=Math.floor(i/4), x=kx+col*27.4, y=ky+row*5.4;
        el('circle',{cx:x+1,cy:y-0.62,r:1.2,fill:z.color},g);
        tx(x+2.8,y,String(i+1)+'  '+z.name.replace(/^The /,''),1.9,INK,600);
        tx(x+2.8,y+2.4,z.domain,1.6,SUB,400);
      });
    }
  });

})(window.GEOM);

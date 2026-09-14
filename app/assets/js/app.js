/* =============================================================
   app.js — wires the simulation to the screen.
   ============================================================= */

const world    = new World();
const renderer = new Renderer(document.getElementById('stage'));

let selected = null, hovered = null, last = performance.now();

/* ---------- inspector ---------- */
const $inspect = document.getElementById('inspect');

function wireList(items) {
  return `<div class="wire"><div class="h">To make this real</div><ul>${
    items.map(i => `<li>${i}</li>`).join('')}</ul></div>`;
}

function kv(k, v) { return `<div class="kv"><span>${k}</span><span>${v}</span></div>`; }

function renderInspector() {
  if (!selected) {
    $inspect.innerHTML = `<div class="empty">Click any desk, operator or courier<br>to see what it does.</div>`;
    return;
  }

  if (selected.kind === 'station') {
    const s = world.byId[selected.id];
    const z = ZONES[s.zone];
    $inspect.innerHTML = `<div class="card">
      <div class="zone" style="color:${z.color}">${z.name}</div>
      <h3>${s.name}</h3>
      <div class="role">${
        s.terminal === 'post' && world.stats.postsToday >= 9
          ? `Day's quota met — ${s.input.length} held for tomorrow`
          : s.working ? s.role + '…' : 'Idle — waiting on work'}</div>
      <p>${s.agent}</p>
      ${kv('Operator', OPERATOR_NAMES[s.id] || '—')}
      ${kv('Jobs finished', s.jobsDone)}
      ${kv('Takes', s.takes ? ITEMS[s.takes].label : 'Starts the line')}
      ${kv('Makes', s.makes ? ITEMS[s.makes].label : (s.terminal ? 'Publishes it' : 'Internal work'))}
      ${kv('Waiting in', s.input.length)}
      ${kv('Ready to collect', s.tray.length)}
      ${kv('Time per job', s.dur + 's')}
      ${wireList(s.wire)}
    </div>`;
    return;
  }

  if (selected.kind === 'operator') {
    const o = world.operators.find(o => o.station.id === selected.id);
    const s = o.station, z = ZONES[s.zone];
    $inspect.innerHTML = `<div class="card">
      <div class="zone" style="color:${z.color}">${z.name} · Operator</div>
      <h3>${o.name}</h3>
      <div class="role">${s.working ? s.role + ' at ' + s.name : 'On break at ' + s.name}</div>
      <p>${s.agent}</p>
      ${kv('Station', s.name)}
      ${kv('Jobs finished', s.jobsDone)}
      ${wireList(s.wire)}
    </div>`;
    return;
  }

  const c = world.couriers.find(c => c.name === selected.id);
  $inspect.innerHTML = `<div class="card">
    <div class="zone" style="color:${c.color}">${ZONES[c.zone].name} · Courier</div>
    <h3>${c.name}</h3>
    <div class="role">${
      c.phase === 'idle'    ? 'Free — waiting for a pickup' :
      c.phase === 'pickup'  ? 'Heading to ' + c.job.from.name :
                              'Carrying to ' + c.job.to.name}</div>
    <p>Couriers move finished work from one desk to the next. When a desk fills its output tray, the nearest free courier collects it.</p>
    ${kv('Carrying', c.carrying ? ITEMS[c.carrying].label : 'Nothing')}
    ${kv('Deliveries', c.delivered)}
  </div>`;
}

/* ---------- legend ---------- */
document.getElementById('legend').innerHTML = Object.entries(ITEMS)
  .map(([, v]) => `<div><i style="background:${v.color}"></i>${v.label}</div>`).join('');

/* ---------- hud + log ---------- */
const $ = id => document.getElementById(id);
let logLen = -1;

function renderHud() {
  $('s-day').textContent   = world.day;
  $('s-rev').textContent   = '$' + world.stats.revenue.toFixed(2);
  $('s-list').textContent  = world.stats.listingsLive;
  $('s-posts').textContent = `${world.stats.postsToday}/9`;
  $('s-hand').textContent  = world.stats.handoffs;

  if (world.log.length !== logLen) {
    logLen = world.log.length;
    $('log').innerHTML = world.log.map(l =>
      `<div class="row"><span class="d">day ${String(l.day).padStart(2,'0')}</span><span style="color:${l.color}">${l.text}</span></div>`
    ).join('');
  }
}

/* ---------- input ---------- */
const stage = document.getElementById('stage');

stage.addEventListener('click', e => {
  const p = renderer.toWorld(e.clientX, e.clientY);
  selected = renderer.pick(world, p.x, p.y);
  renderInspector();
});

stage.addEventListener('mousemove', e => {
  const p = renderer.toWorld(e.clientX, e.clientY);
  hovered = renderer.pick(world, p.x, p.y);
  stage.style.cursor = hovered ? 'pointer' : 'default';
});

document.querySelectorAll('.speed button').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.speed button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    const v = Number(b.dataset.speed);
    world.paused = v === 0;
    if (v > 0) world.speed = v;
  });
});

window.addEventListener('resize', () => renderer.resize());

/* ---------- loop ---------- */
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  world.update(dt);
  renderer.draw(world, selected, hovered, dt);
  renderHud();
  if (selected) renderInspector();
  requestAnimationFrame(frame);
}

renderer.resize();
requestAnimationFrame(frame);

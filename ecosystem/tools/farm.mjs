#!/usr/bin/env node
/* ============================================================
   farm — the Steading's work ledger, memory and trace store.
   No dependencies. Every agent on the farm talks to this.

     node ecosystem/tools/farm.mjs help
   ============================================================ */
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT  = join(dirname(fileURLToPath(import.meta.url)), '..');
const FARM  = join(ROOT, 'farm');
const BOARD = join(FARM, 'board.json');
const EPIS  = join(FARM, 'episodes.jsonl');
const FACTS = join(FARM, 'facts.jsonl');
const TRACES= join(FARM, 'traces');
const WORLD = JSON.parse(readFileSync(join(ROOT, 'world/farm.world.json'), 'utf8'));

/* ---------- the state machine from docs/02-PROTOCOL.md ---------- */
const LEGAL = {
  OPEN:     ['CLAIMED', 'REJECTED'],
  CLAIMED:  ['RUNNING', 'OPEN'],
  RUNNING:  ['DONE', 'BLOCKED', 'FAILED'],
  BLOCKED:  ['RUNNING', 'FAILED'],
  FAILED:   ['GLEANING', 'RUNNING'],
  GLEANING: ['DONE', 'REJECTED'],
  DONE:     [],
  REJECTED: []
};
const TERMINAL = ['DONE', 'REJECTED'];

/* ---------- store ---------- */
const ensure = () => {
  mkdirSync(FARM, { recursive: true }); mkdirSync(TRACES, { recursive: true });
  mkdirSync(join(FARM, 'artifacts'), { recursive: true });
  if (!existsSync(BOARD)) writeFileSync(BOARD, JSON.stringify({ seq: 0, goals: [], chores: [] }, null, 2));
};
const load = () => { ensure(); return JSON.parse(readFileSync(BOARD, 'utf8')); };
const save = (b) => writeFileSync(BOARD, JSON.stringify(b, null, 2));
const now  = () => new Date().toISOString();
const nid  = (b, p) => `${p}-${String(++b.seq).padStart(4, '0')}`;
const die  = (m) => { console.error(`farm: ${m}`); process.exit(1); };

/* ---------- arg parsing ---------- */
const argv = process.argv.slice(2);
const cmd  = argv[0];
const pos  = [];
const flag = {};
for (let i = 1; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    const k = argv[i].slice(2);
    const v = (argv[i + 1] && !argv[i + 1].startsWith('--')) ? argv[++i] : true;
    flag[k] = v;
  } else pos.push(argv[i]);
}
const need = (k) => flag[k] !== undefined ? flag[k] : die(`missing --${k}`);

const findChore = (b, id) => b.chores.find((c) => c.id === id) || die(`no chore ${id}`);
const roleName  = (id) => (WORLD.roles.find((r) => r.id === id) || {}).name || id;

function transition(b, chore, to, by, note) {
  const from = chore.state;
  if (TERMINAL.includes(from)) die(`${chore.id} is ${from} and cannot move. A finished chore stays finished.`);
  if (!(LEGAL[from] || []).includes(to))
    die(`illegal transition ${from} → ${to} for ${chore.id}. Legal from ${from}: ${LEGAL[from].join(', ') || '(none)'}`);
  chore.state = to;
  chore.history.push({ at: now(), from, to, by: by || null, note: note || null });
  return chore;
}

function episode(kind, text, extra) {
  ensure();
  appendFileSync(EPIS, JSON.stringify({ at: now(), kind, text, ...(extra || {}) }) + '\n');
}

/* ---------- commands ---------- */
const CMD = {};

CMD.goal = () => {
  const b = load();
  const text = pos.join(' ') || die('usage: farm goal "what you want done"');
  const g = { id: nid(b, 'g'), text, success: flag.success || null, at: now(), state: 'OPEN' };
  b.goals.push(g); save(b);
  episode('goal', text, { goal: g.id });
  console.log(`${g.id}  ${text}`);
  if (!g.success) console.log(`  note: no --success given. A goal without a checkable success condition is a wish.`);
};

CMD.post = () => {
  const b = load();
  const title = pos.join(' ') || die('usage: farm post "title" --goal g-0001 --zone fields --role r-reaper --done "..."');
  const goal = need('goal');
  if (!b.goals.find((g) => g.id === goal)) die(`no goal ${goal}`);
  const zone = flag.zone || null, station = flag.station || null, role = flag.role || null;
  if (zone && !WORLD.zones.find((z) => z.id === zone)) die(`no zone "${zone}"`);
  if (station && !WORLD.stations.find((s) => s.id === station)) die(`no station "${station}"`);
  if (role && !WORLD.roles.find((r) => r.id === role)) die(`no role "${role}"`);
  const c = {
    id: nid(b, 'ch'), goal, parent: flag.parent || null, title,
    assignment: { zone, station, role, tier: flag.tier || null },
    spec: { input: flag.input || null, doneWhen: flag.done || null },
    state: 'OPEN', owner: null, blockedOn: null, attempts: 0,
    trace: null, artifact: null,
    history: [{ at: now(), from: null, to: 'OPEN', by: flag.by || 'r-farmer', note: null }]
  };
  b.chores.push(c); save(b);
  episode('post', title, { chore: c.id, goal });
  console.log(`${c.id}  OPEN  ${title}`);
  if (!c.spec.doneWhen) console.log(`  warn: no --done. "Done when" must be checkable or nobody can tell you finished.`);
};

CMD.claim = () => {
  const b = load(); const c = findChore(b, pos[0] || die('usage: farm claim ch-0001 --by r-reaper'));
  const by = need('by');
  if (c.owner && c.owner !== by) die(`${c.id} is already held by ${roleName(c.owner)}`);
  transition(b, c, 'CLAIMED', by); c.owner = by; save(b);
  console.log(`${c.id}  CLAIMED by ${roleName(by)}`);
};

CMD.start = () => {
  const b = load(); const c = findChore(b, pos[0] || die('usage: farm start ch-0001'));
  transition(b, c, 'RUNNING', c.owner);
  if (!c.trace) { c.trace = c.id.replace('ch', 'tr'); writeFileSync(join(TRACES, `${c.trace}.json`), JSON.stringify({ trace: c.trace, chore: c.id, spans: [] }, null, 2)); }
  c.attempts += 1; save(b);
  console.log(`${c.id}  RUNNING  attempt ${c.attempts}  trace ${c.trace}`);
};

CMD.block = () => {
  const b = load(); const c = findChore(b, pos[0] || die('usage: farm block ch-0001 --on "..."'));
  const on = need('on');
  transition(b, c, 'BLOCKED', c.owner, on); c.blockedOn = on; save(b);
  console.log(`${c.id}  BLOCKED on ${on}`);
};
CMD.unblock = () => {
  const b = load(); const c = findChore(b, pos[0] || die('usage: farm unblock ch-0001'));
  transition(b, c, 'RUNNING', c.owner); c.blockedOn = null; save(b);
  console.log(`${c.id}  RUNNING`);
};

CMD.done = () => {
  const b = load(); const c = findChore(b, pos[0] || die('usage: farm done ch-0001 --artifact path/or/text'));
  const art = flag.artifact;
  /* A DONE whose artifact does not exist is a false DONE — the most expensive
     kind, because everything downstream trusts it. Check before allowing it. */
  if (art && art !== true && /[\/\\]|\.[a-z0-9]{1,5}$/i.test(String(art)) && !flag.force) {
    const abs = String(art).startsWith('/') ? String(art) : join(ROOT, '..', String(art));
    if (!existsSync(abs))
      die(`${c.id} claims artifact "${art}" but no such file exists.\n` +
          `       A DONE with a missing artifact is a false DONE. Produce it, or:\n` +
          `       --artifact "a description of what was produced"   (for non-file output)\n` +
          `       --force                                            (if you mean it)`);
  }
  transition(b, c, 'DONE', c.owner, flag.note || null);
  c.artifact = art === true ? null : (art || null); save(b);
  episode('done', c.title, { chore: c.id, goal: c.goal });
  console.log(`${c.id}  DONE${c.artifact ? `  → ${c.artifact}` : ''}`);
};

CMD.fail = () => {
  const b = load(); const c = findChore(b, pos[0] || die('usage: farm fail ch-0001 --why "..."'));
  const why = need('why');
  transition(b, c, 'FAILED', c.owner, why); save(b);
  episode('fail', why, { chore: c.id, goal: c.goal });
  console.log(`${c.id}  FAILED  ${why}`);
  console.log(`  next: farm glean ${c.id}  (a second pass must use a DIFFERENT approach, not the same one again)`);
};

CMD.glean = () => {
  const b = load(); const c = findChore(b, pos[0] || die('usage: farm glean ch-0001'));
  transition(b, c, 'GLEANING', 'r-gleaner'); c.owner = 'r-gleaner'; save(b);
  console.log(`${c.id}  GLEANING  handed to the Gleaner`);
};

CMD.reject = () => {
  const b = load(); const c = findChore(b, pos[0] || die('usage: farm reject ch-0001 --why "..."'));
  const why = need('why');
  transition(b, c, 'REJECTED', c.owner || 'r-gleaner', why); save(b);
  episode('reject', why, { chore: c.id, goal: c.goal });
  console.log(`${c.id}  REJECTED  ${why}`);
  console.log(`  the Composter owes this a reproducible eval case before it is forgotten.`);
};

CMD.span = () => {
  ensure();
  const b = load(); const c = findChore(b, need('chore'));
  if (!c.trace) die(`${c.id} has no trace — run: farm start ${c.id}`);
  const f = join(TRACES, `${c.trace}.json`);
  const t = JSON.parse(readFileSync(f, 'utf8'));
  const span = {
    span: `sp-${String(t.spans.length + 1).padStart(4, '0')}`,
    role: flag.role || c.owner || null,
    saw: flag.saw ? String(flag.saw).split('|').map((s) => s.trim()) : [],
    reason: flag.reason || null,
    outcome: flag.outcome || 'ok',
    at: now()
  };
  if (!span.reason) console.log(`  warn: a span without --reason records that it happened, not why. That is the part you will want at 2am.`);
  t.spans.push(span); writeFileSync(f, JSON.stringify(t, null, 2));
  console.log(`${c.trace}/${span.span}  ${span.outcome}`);
};

CMD.trace = () => {
  const b = load(); const c = findChore(b, pos[0] || die('usage: farm trace ch-0001'));
  if (!c.trace) die(`${c.id} has no trace yet`);
  const t = JSON.parse(readFileSync(join(TRACES, `${c.trace}.json`), 'utf8'));
  console.log(`${c.trace}  ${c.title}  [${c.state}]`);
  t.spans.forEach((s) => {
    console.log(`  ${s.span}  ${(roleName(s.role) || '?').padEnd(22)} ${s.outcome}`);
    if (s.saw.length) console.log(`      saw    ${s.saw.join(', ')}`);
    if (s.reason)     console.log(`      reason ${s.reason}`);
  });
  if (!t.spans.length) console.log('  (no spans — nothing recorded why it did what it did)');
};

CMD.board = () => {
  const b = load();
  let cs = b.chores;
  if (flag.goal)  cs = cs.filter((c) => c.goal === flag.goal);
  if (flag.state) cs = cs.filter((c) => c.state === String(flag.state).toUpperCase());
  if (flag.open)  cs = cs.filter((c) => !TERMINAL.includes(c.state));
  if (!b.goals.length) return console.log('board is empty. start with: farm goal "..."');
  b.goals.forEach((g) => {
    const mine = cs.filter((c) => c.goal === g.id);
    if (flag.goal && g.id !== flag.goal) return;
    console.log(`\n${g.id}  ${g.text}`);
    if (g.success) console.log(`     success: ${g.success}`);
    if (!mine.length) return console.log('     (no chores)');
    mine.forEach((c) => {
      console.log(`  ${c.id}  ${c.state.padEnd(9)} ${c.title}`);
      const a = c.assignment;
      if (a.zone || a.role) console.log(`             ${[a.zone, a.role && roleName(a.role), a.tier].filter(Boolean).join(' · ')}`);
      if (c.blockedOn) console.log(`             blocked on: ${c.blockedOn}`);
      if (c.spec.doneWhen) console.log(`             done when: ${c.spec.doneWhen}`);
    });
  });
  const open = b.chores.filter((c) => !TERMINAL.includes(c.state)).length;
  console.log(`\n${b.chores.length} chores · ${open} open · ${b.chores.filter((c) => c.state === 'DONE').length} done · ${b.chores.filter((c) => c.state === 'REJECTED').length} rejected`);
};

CMD.episode = () => { episode(flag.kind || 'note', pos.join(' ') || die('usage: farm episode "what happened"'), { chore: flag.chore || null }); console.log('recorded'); };

CMD.fact = () => {
  ensure();
  const text = pos.join(' ') || die('usage: farm fact "what is true" --source ch-0001');
  if (!flag.source) die('--source required. A fact with no provenance is a rumour.');
  appendFileSync(FACTS, JSON.stringify({ at: now(), text, source: flag.source }) + '\n');
  console.log(`fact recorded, sourced to ${flag.source}`);
};

CMD.recall = () => {
  ensure();
  const q = pos.join(' ').toLowerCase();
  const read = (f) => existsSync(f) ? readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
  const facts = read(FACTS).filter((x) => !q || x.text.toLowerCase().includes(q));
  const eps   = read(EPIS).filter((x) => !q || x.text.toLowerCase().includes(q));
  console.log(`facts (${facts.length}) — what is true`);
  facts.slice(-20).forEach((f) => console.log(`  ${f.text}   [${f.source}]`));
  console.log(`\nepisodes (${eps.length}) — what happened, in order`);
  eps.slice(-25).forEach((e) => console.log(`  ${e.at.slice(5, 16).replace('T', ' ')}  ${e.kind.padEnd(7)} ${e.text}${e.chore ? `  [${e.chore}]` : ''}`));
  if (!facts.length && !eps.length) console.log('  nothing recorded yet.');
};

CMD.report = () => {
  const b = load();
  if (flag.goal && !b.goals.find((g) => g.id === flag.goal)) die(`no goal ${flag.goal}`);
  const read = (f) => existsSync(f) ? readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
  const cs = flag.goal ? b.chores.filter((c) => c.goal === flag.goal) : b.chores;
  const gs = flag.goal ? b.goals.filter((g) => g.id === flag.goal) : b.goals;
  const mine = new Set(cs.map((c) => c.id));
  const scoped = (rows) => flag.goal ? rows.filter((r) => (r.chore && mine.has(r.chore)) || r.goal === flag.goal || (r.source && mine.has(r.source))) : rows;
  const by = (s) => cs.filter((c) => c.state === s).length;
  const all = existsSync(TRACES) ? readdirSync(TRACES).filter((f) => f.endsWith('.json')) : [];
  const traces = all.filter((f) => !flag.goal || mine.has(f.replace('tr', 'ch').replace('.json', '')));
  const spansOf = (f) => { try { return JSON.parse(readFileSync(join(TRACES, f), 'utf8')).spans || []; } catch { return []; } };
  const spans = traces.reduce((n, f) => n + spansOf(f).length, 0);
  const noReason = traces.reduce((n, f) => n + spansOf(f).filter((s) => !s.reason).length, 0);
  /* a DONE chore whose artifact is gone is the finding that matters most */
  const ghosts = cs.filter((c) => c.state === 'DONE' && c.artifact && /[\/\\]/.test(c.artifact)
    && !existsSync(c.artifact.startsWith('/') ? c.artifact : join(ROOT, '..', c.artifact)));
  const noTrace = cs.filter((c) => ['DONE', 'REJECTED'].includes(c.state) && (!c.trace || !spansOf(`${c.trace}.json`).length));
  console.log(`THE WATCHTOWER — what happened${flag.goal ? `  (${flag.goal})` : ''}\n`);
  console.log(`  goals      ${gs.length}`);
  console.log(`  chores     ${cs.length}   open ${cs.filter((c) => !TERMINAL.includes(c.state)).length}`);
  ['DONE', 'REJECTED', 'BLOCKED', 'FAILED', 'RUNNING', 'CLAIMED', 'OPEN'].forEach((s) => { if (by(s)) console.log(`    ${s.padEnd(10)} ${by(s)}`); });
  console.log(`  retried    ${cs.filter((c) => c.attempts > 1).length}  (chores that took more than one attempt)`);
  console.log(`  traces     ${traces.length}   spans ${spans}`);
  console.log(`  episodes   ${scoped(read(EPIS)).length}   facts ${scoped(read(FACTS)).length}`);
  const undone = cs.filter((c) => !c.spec.doneWhen && !TERMINAL.includes(c.state));
  console.log('');
  if (ghosts.length) { console.log(`  ⚠ ${ghosts.length} DONE chore(s) claim an artifact that does not exist — a false DONE:`);
                       ghosts.forEach((c) => console.log(`      ${c.id}  ${c.artifact}`)); }
  if (noTrace.length) console.log(`  ⚠ ${noTrace.length} finished chore(s) have no spans. Nothing records why they ended that way.`);
  if (noReason)      console.log(`  ⚠ ${noReason} span(s) recorded without a reason. You will not be able to explain those later.`);
  if (undone.length) console.log(`  ⚠ ${undone.length} open chore(s) have no checkable "done when".`);
  const rej = cs.filter((c) => c.state === 'REJECTED');
  if (rej.length)    console.log(`  ⚠ ${rej.length} rejected chore(s) owe the Compost Heap an eval case.`);
  const zeroRetry = cs.filter((c) => c.attempts > 1).length === 0 && rej.length > 0;
  if (zeroRetry) console.log(`  ⚠ nothing was retried, but ${rej.length} chore(s) were rejected — failures were abandoned, not recovered.`);
  if (!noReason && !undone.length && !rej.length && !ghosts.length && !noTrace.length) console.log('  no warnings.');
};

CMD.zones = () => {
  WORLD.zones.forEach((z) => {
    const rs = WORLD.roles.filter((r) => r.zone === z.id);
    console.log(`${z.id.padEnd(12)} ${z.name.padEnd(18)} ${z.domain}`);
    console.log(`             ${rs.map((r) => r.id).join(' ')}`);
  });
};

CMD.roles = () => {
  const zs = flag.zone ? WORLD.zones.filter((z) => z.id === flag.zone) : WORLD.zones;
  zs.forEach((z) => {
    console.log(`\n${z.name} — ${z.domain}`);
    WORLD.roles.filter((r) => r.zone === z.id).forEach((r) =>
      console.log(`  ${r.id.padEnd(18)} ${r.name.padEnd(22)} ${r.title}`));
  });
};

CMD.reset = () => {
  if (!flag.yes) die('this erases the board, episodes, facts and traces. Re-run with --yes if you mean it.');
  ensure();
  writeFileSync(BOARD, JSON.stringify({ seq: 0, goals: [], chores: [] }, null, 2));
  writeFileSync(EPIS, ''); writeFileSync(FACTS, '');
  readdirSync(TRACES).filter((f) => f.endsWith('.json')).forEach((f) => rmSync(join(TRACES, f)));
  console.log('farm reset.');
};

CMD.help = () => console.log(`
farm — the Steading's work ledger, memory and traces

  WORK
    goal "text" [--success "how you'll know"]     open a goal
    post "title" --goal g-1 [--zone|--station|--role|--tier|--done|--input]
    claim ch-1 --by r-reaper                      take a chore
    start ch-1                                    begin work (opens the trace)
    block ch-1 --on "..."   |  unblock ch-1
    done ch-1 [--artifact path] [--note "..."]
    fail ch-1 --why "..."   |  glean ch-1  |  reject ch-1 --why "..."
    board [--goal g-1] [--state OPEN] [--open]

  TRACE
    span --chore ch-1 [--role r-x] [--saw "a|b"] [--reason "..."] [--outcome ok]
    trace ch-1
    report [--goal g-1]

  MEMORY
    episode "what happened" [--kind x] [--chore ch-1]
    fact "what is true" --source ch-1
    recall [query]

  REFERENCE
    zones  |  roles [--zone fields]  |  reset --yes

  States: OPEN → CLAIMED → RUNNING → DONE
          RUNNING → BLOCKED/FAILED · FAILED → GLEANING → DONE/REJECTED
  Illegal transitions are refused, not warned about.
`);

(CMD[cmd] || CMD.help)();

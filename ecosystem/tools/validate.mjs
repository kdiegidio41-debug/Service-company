/* Structural checks on the world model. No dependencies.
   Run: node tools/validate.mjs                                   */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = existsSync(join(root, 'world/active.world.json')) ? 'world/active.world.json' : 'world/farm.world.json';
const W = JSON.parse(readFileSync(join(root, src), 'utf8'));

const errs = [], warns = [];
const set = (a) => new Set(a.map((x) => x.id));
const Z = set(W.zones), S = set(W.stations), R = set(W.roles), T = set(W.tasks);

const dupes = (arr, what) => {
  const seen = new Set();
  arr.forEach((x) => { if (seen.has(x.id)) errs.push(`duplicate ${what} id: ${x.id}`); seen.add(x.id); });
};
[['zones', W.zones], ['stations', W.stations], ['roles', W.roles], ['tasks', W.tasks]]
  .forEach(([k, v]) => dupes(v, k.slice(0, -1)));

W.stations.forEach((s) => {
  if (!Z.has(s.zone)) errs.push(`station ${s.id}: unknown zone "${s.zone}"`);
  (s.tasks || []).forEach((t) => { if (!T.has(t)) errs.push(`station ${s.id}: unknown task "${t}"`); });
  const z = W.zones.find((q) => q.id === s.zone);
  if (z && !inside(s.x, s.y, z.polygon)) warns.push(`station ${s.id} sits outside its zone polygon (${s.zone})`);
});
W.roles.forEach((r) => {
  if (!Z.has(r.zone)) errs.push(`role ${r.id}: unknown zone "${r.zone}"`);
  if (!S.has(r.station)) errs.push(`role ${r.id}: unknown station "${r.station}"`);
  const st = W.stations.find((q) => q.id === r.station);
  if (st && st.zone !== r.zone) errs.push(`role ${r.id}: station ${r.station} is in zone ${st.zone}, not ${r.zone}`);
  if (r.escalatesTo.startsWith('r-') && !R.has(r.escalatesTo))
    errs.push(`role ${r.id}: escalates to unknown role "${r.escalatesTo}"`);
  if (!W.modelTiers[r.tier]) errs.push(`role ${r.id}: unknown tier "${r.tier}"`);
});
W.tasks.forEach((t) => {
  if (!S.has(t.station)) errs.push(`task ${t.id}: unknown station "${t.station}"`);
  if (!R.has(t.owner)) errs.push(`task ${t.id}: unknown owner "${t.owner}"`);
  const st = W.stations.find((q) => q.id === t.station);
  if (st && !(st.tasks || []).includes(t.id))
    errs.push(`task ${t.id} is not listed on its station ${t.station}`);
  const ow = W.roles.find((q) => q.id === t.owner);
  if (ow && st && ow.zone !== st.zone)
    warns.push(`task ${t.id}: owner ${t.owner} works in ${ow.zone} but the task is in ${st.zone}`);
});
W.flows.forEach((f, i) => {
  if (!S.has(f.from)) errs.push(`flow ${i}: unknown from "${f.from}"`);
  if (!S.has(f.to)) errs.push(`flow ${i}: unknown to "${f.to}"`);
  if (!W.flowKinds[f.kind]) errs.push(`flow ${i}: unknown kind "${f.kind}"`);
  if (f.from === f.to) errs.push(`flow ${i}: connects ${f.from} to itself`);
});

/* every role must be reachable from a station, and every station should have someone */
W.stations.forEach((s) => {
  if (!W.roles.some((r) => r.station === s.id) && !W.tasks.some((t) => t.station === s.id))
    warns.push(`station ${s.id} has no roles and no tasks`);
});

/* live agents must have a file, and claim only roles that exist */
if (W.agents) {
  for (const [name, a] of Object.entries(W.agents)) {
    if (!existsSync(join(root, '..', a.file))) errs.push(`agent ${name}: no file at ${a.file}`);
    a.roles.forEach((rid) => {
      const r = W.roles.find((q) => q.id === rid);
      if (!r) errs.push(`agent ${name}: claims unknown role "${rid}"`);
      else if (r.agent !== name) errs.push(`role ${rid} says agent "${r.agent}" but ${name} claims it`);
    });
  }
  W.roles.filter((r) => r.agent).forEach((r) => {
    if (!W.agents[r.agent]) errs.push(`role ${r.id}: agent "${r.agent}" is not registered`);
  });
}

/* escalation chains must terminate */
W.roles.forEach((r) => {
  const seen = new Set([r.id]);
  let cur = r;
  while (cur && cur.escalatesTo.startsWith('r-')) {
    if (seen.has(cur.escalatesTo)) { errs.push(`escalation cycle through ${r.id} → ${cur.escalatesTo}`); break; }
    seen.add(cur.escalatesTo);
    cur = W.roles.find((q) => q.id === cur.escalatesTo);
  }
});

function inside(x, y, poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

console.log(`${src}`);
console.log(`  ${W.zones.length} zones · ${W.stations.length} stations · ${W.roles.length} roles · ` +
            `${W.tasks.length} tasks · ${W.flows.length} flows`);
warns.forEach((w) => console.log(`  warn  ${w}`));
if (errs.length) { errs.forEach((e) => console.log(`  ERROR ${e}`)); process.exit(1); }
console.log(`  ok — every reference resolves${warns.length ? `, ${warns.length} warning(s)` : ''}`);

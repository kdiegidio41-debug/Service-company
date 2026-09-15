/* Applies a name overlay to the world model.
   Usage: node tools/apply-theme.mjs starship | farm   */
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const which = (process.argv[2] || 'farm').toLowerCase();
const active = join(root, 'world/active.world.json');

if (which === 'farm' || which === 'steading' || which === 'default') {
  if (existsSync(active)) rmSync(active);
  console.log('theme: farm (default). Removed world/active.world.json.');
  process.exit(0);
}

const themeFile = join(root, `world/${which === 'starship' || which === 'vessel' ? 'starship' : which}.theme.json`);
if (!existsSync(themeFile)) {
  console.error(`No theme at ${themeFile}`);
  process.exit(1);
}

const W = JSON.parse(readFileSync(join(root, 'world/farm.world.json'), 'utf8'));
const T = JSON.parse(readFileSync(themeFile, 'utf8'));

/* A theme may rename and recolour. It may not add, remove or re-wire. */
const guard = (kind, map) => {
  const ids = new Set(W[kind].map((x) => x.id));
  for (const k of Object.keys(map || {}))
    if (!ids.has(k)) { console.error(`theme names a ${kind.slice(0, -1)} that does not exist: ${k}`); process.exit(1); }
};
guard('zones', T.zones); guard('stations', T.stations); guard('roles', T.roles);

const apply = (arr, map) => arr.forEach((x) => Object.assign(x, (map || {})[x.id] || {}));
apply(W.zones, T.zones); apply(W.stations, T.stations); apply(W.roles, T.roles);
W.name = T.name || W.name;
W.tagline = T.tagline || W.tagline;
W.theme = T.id;

writeFileSync(active, JSON.stringify(W, null, 2));
console.log(`theme: ${T.name} → world/active.world.json`);
console.log('run `node tools/build-map.mjs` to rebuild the map.');

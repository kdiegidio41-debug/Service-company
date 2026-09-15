/* Assembles the map sources into one self-contained page.
   No dependencies; run with `node tools/build-map.mjs`. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const src = existsSync(join(root, 'world/active.world.json')) ? 'world/active.world.json' : 'world/farm.world.json';
const world = JSON.parse(read(src));
const scripts = [
  'map/src/geom.js',
  'map/src/render-plan.js',
  'map/src/styles-plan.js',
  'map/src/render-iso.js',
  'map/src/app.js'
];

const out = `<title>The Steading</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<style>
${read('map/src/styles.css')}
</style>

${read('map/src/body.html')}

<script>window.WORLD = ${JSON.stringify(world)};</script>
${scripts.map((s) => `<script>\n${read(s)}\n</script>`).join('\n')}
`;

writeFileSync(join(root, 'map/steading-map.html'), out, 'utf8');
const kb = (Buffer.byteLength(out) / 1024).toFixed(1);
console.log(`built map/steading-map.html  ${kb} KB`);
console.log(`  ${world.zones.length} zones · ${world.stations.length} stations · ` +
            `${world.roles.length} roles · ${world.tasks.length} tasks · ${world.flows.length} flows`);

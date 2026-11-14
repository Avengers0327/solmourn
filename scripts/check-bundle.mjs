// The campaign is preloaded, so DM content ships with the app - but it must stay in its own
// lazily loaded chunk. This fails the build if spoilers appear in the entry bundle, CSS or HTML
// (the code Presenter mode and every player-facing surface run from), or if the DM chunk is missing.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

const FORBIDDEN = ['Ilan Rook', 'Exchange 17', 'Vesperdeep', 'Mahwah', 'Ramapo', 'Manhattan', 'New York', 'Kharos', 'Concordance', 'Tomas Venn', 'Mercy Decree', 'Unbound'];
const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const html = readFileSync('dist/index.html', 'utf8');
const entry = /src="\.\/(assets\/index-[^"]+\.js)"/.exec(html)?.[1];
if (!entry) { console.error('Could not find the entry script in dist/index.html'); process.exit(1); }

let leaks = 0;
let dmChunks = 0;
for (const file of walk('dist')) {
  if (!/\.(js|css|html|webmanifest)$/.test(file) || /(^|[\\/])(sw|workbox-[^\\/]*)\.js$/.test(file)) continue;
  const text = readFileSync(file, 'utf8');
  const hits = FORBIDDEN.filter((w) => text.includes(w));
  const playerFacing = basename(file) === basename(entry) || !file.endsWith('.js');
  if (playerFacing && hits.length) { console.error(`SPOILER LEAK in player-facing file ${file}: ${hits.join(', ')}`); leaks++; }
  if (!playerFacing && hits.length) dmChunks++;
}
if (leaks) process.exit(1);
if (!dmChunks) { console.error('The DM seed chunk is missing from dist/: the campaign would not preload.'); process.exit(1); }
console.log(`bundle check: entry bundle is spoiler-free; DM content isolated in ${dmChunks} lazy chunk(s)`);

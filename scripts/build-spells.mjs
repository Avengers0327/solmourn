// Converts a raw SRD 5.1 spell dump (from the open 5e SRD API, CC-BY-4.0 content) into the
// compact data file the app ships. Only whitelisted plain-text fields are copied.
// Usage: node scripts/build-spells.mjs <path-to-spells.json>
import { readFileSync, writeFileSync } from 'node:fs';

const src = process.argv[2];
if (!src) throw new Error('Pass the path to the raw SRD spells JSON.');
const raw = JSON.parse(readFileSync(src, 'utf8')).data.spells;
const str = (v) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b-\u001f]/g, '') : '');
const out = raw
  .map((s) => ({
    i: str(s.index),
    n: str(s.name),
    l: Number(s.level) || 0,
    s: str(s.school?.name),
    t: str(s.casting_time),
    r: str(s.range),
    c: !!s.concentration,
    ri: !!s.ritual,
    d: str(s.duration),
    co: (s.components ?? []).map(str).join(', '),
    m: str(s.material),
    x: (s.desc ?? []).map(str).join('\n\n'),
    h: (s.higher_level ?? []).map(str).join('\n\n'),
  }))
  .sort((a, b) => a.n.localeCompare(b.n));
writeFileSync('src/content/spells.srd.json', JSON.stringify(out));
console.log(`wrote ${out.length} SRD spells`);

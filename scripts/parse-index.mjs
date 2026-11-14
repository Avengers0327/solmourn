// Parses a saved spell index page into rows (metadata only: name, level, school, casting time, range, duration, components).
import { readFileSync, writeFileSync } from 'node:fs';
const html = readFileSync(process.argv[2], 'utf8');
const decode = (s) => s.replace(/&#8217;|&rsquo;/g, "'").replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const levels = [];
const parts = html.split(/<div id="wiki-tab-0-(\d+)">/).slice(1);
for (let i = 0; i < parts.length; i += 2) {
  const lvl = Number(parts[i]);
  for (const row of parts[i + 1].split('<tr>').slice(2)) {
    const c = [...row.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
    if (c.length < 6) continue;
    const slug = /href="\/spell:([^"]+)"/.exec(c[0])?.[1];
    if (!slug) continue;
    levels.push({ slug, name: decode(c[0]), level: lvl, school: decode(c[1]), time: decode(c[2]), range: decode(c[3]), duration: decode(c[4]), components: decode(c[5]) });
  }
}
writeFileSync(process.argv[3], JSON.stringify(levels));
const by = {}; levels.forEach((r) => (by[r.level] = (by[r.level] || 0) + 1));
console.log(levels.length, by);

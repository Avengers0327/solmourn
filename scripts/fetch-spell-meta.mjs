// Collects spell METADATA ONLY (name, level, school, casting time, range, duration, components
// keywords, concentration, ritual, listed source books) from a public index, for cross-checking.
// Spell descriptions are never read into the output.
// Usage: node scripts/fetch-spell-meta.mjs <index.json> <out.json>
import { readFileSync, writeFileSync } from 'node:fs';
const idx = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const clean = (s) => s.replace(/&#8217;|&rsquo;/g, "'").replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const out = [];
const failed = [];
let next = 0;
async function one(r) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://dnd5e.wikidot.com/spell:${r.slug}`, { headers: { 'User-Agent': 'generic-client' } });
      if (!res.ok) throw new Error(String(res.status));
      const h = await res.text();
      const src = [...h.matchAll(/<p>Source:\s*([^<]+)<\/p>/g)].map((m) => clean(m[1]));
      const lv = /<p><em>([^<]*?)<\/em><\/p>/.exec(h)?.[1] ?? '';
      const field = (k) => clean(new RegExp(`<strong>${k}:</strong>\s*([^<]*)`).exec(h)?.[1] ?? '');
      const comp = new RegExp('<strong>Components:</strong>\s*([^<]*)').exec(h)?.[1] ?? '';
      const dur = field('Duration');
      out.push({ slug: r.slug, name: r.name, sources: src, levelLine: clean(lv), time: field('Casting Time'), range: field('Range'), duration: dur, components: clean(comp), indexSchool: r.school });
      return;
    } catch (e) {
      if (attempt === 2) failed.push({ slug: r.slug, error: String(e) });
      await new Promise((r2) => setTimeout(r2, 800));
    }
  }
}
async function worker() {
  while (next < idx.length) {
    const r = idx[next++];
    await one(r);
    await new Promise((r2) => setTimeout(r2, 150));
  }
}
await Promise.all([worker(), worker(), worker()]);
writeFileSync(process.argv[3], JSON.stringify({ fetchedAt: new Date().toISOString(), rows: out, failed }));
console.log('fetched', out.length, 'failed', failed.length);

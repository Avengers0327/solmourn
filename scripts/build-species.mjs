// Converts SRD 5.1 species records (from the open 5e SRD API, CC-BY-4.0) into the compact data
// file the app ships. Only whitelisted plain-text fields are copied. Flavour fields about
// alignment are deliberately dropped: species have no compulsory morality in Solmourn.
// Usage: node scripts/build-species.mjs <dir containing race-*.json, sub-*.json, trait-*.json>
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) throw new Error('Pass the directory with the raw SRD species JSON.');
const read = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const str = (v) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b-\u001f]/g, '') : '');
const traits = Object.fromEntries(readdirSync(dir).filter((f) => f.startsWith('trait-')).map((f) => { const t = read(f); return [t.index, { i: t.index, n: str(t.name), x: (t.desc ?? []).map(str).join('\n\n') }]; }));
const bonuses = (list) => Object.fromEntries((list ?? []).map((b) => [b.ability_score.index.toUpperCase(), b.bonus]));
const races = readdirSync(dir).filter((f) => f.startsWith('race-')).map((f) => {
  const r = read(f);
  return {
    i: r.index, n: str(r.name), speed: r.speed, size: str(r.size), sizeMd: str(r.size_description), ageMd: str(r.age), langMd: str(r.language_desc),
    asi: bonuses(r.ability_bonuses),
    asiChoice: r.ability_bonus_options ? { choose: r.ability_bonus_options.choose, from: r.ability_bonus_options.from.options.map((o) => o.ability_score.index.toUpperCase()), bonus: r.ability_bonus_options.from.options[0].bonus } : null,
    languages: (r.languages ?? []).map((l) => str(l.name)),
    traits: (r.traits ?? []).map((t) => t.index).filter((t) => traits[t]),
    subraces: (r.subraces ?? []).map((s) => s.index),
  };
});
const subraces = readdirSync(dir).filter((f) => f.startsWith('sub-')).map((f) => {
  const s = read(f);
  return { i: s.index, n: str(s.name), race: s.race.index, x: str(s.desc), asi: bonuses(s.ability_bonuses), traits: (s.racial_traits ?? []).map((t) => t.index).filter((t) => traits[t]) };
});
const used = new Set([...races.flatMap((r) => r.traits), ...subraces.flatMap((s) => s.traits)]);
const out = { races: races.sort((a, b) => a.n.localeCompare(b.n)), subraces, traits: Object.fromEntries(Object.entries(traits).filter(([k]) => used.has(k))) };
writeFileSync('src/content/species.srd.json', JSON.stringify(out));
console.log(`wrote ${out.races.length} species, ${out.subraces.length} subraces, ${Object.keys(out.traits).length} traits`);

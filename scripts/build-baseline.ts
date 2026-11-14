// One-off: content hashes of the original import-based starter pack (seed v1), so installs
// that imported it can be upgraded without overwriting edits. Output is committed.
import { writeFileSync } from 'node:fs';
import { buildPack } from '../tests/fixtures/seedV1';
import { loadDocs } from '../tests/fixtures/loadDocsV1';
import { contentHash } from '../src/data/seedEngine';
import type { TableName } from '../src/domain/types';

const pack = buildPack(loadDocs());
const out: Record<string, string> = {};
for (const [name, rows] of Object.entries(pack.tables)) {
  if (['audit', 'meta', 'pcs', 'events', 'encounters', 'trials'].includes(name)) continue;
  for (const r of rows as { id: string }[]) out[`${name}:${r.id}`] = contentHash(name as TableName, r);
}
writeFileSync('src/seed/baselineV1.json', JSON.stringify(out));
console.log('baseline keys', Object.keys(out).length);

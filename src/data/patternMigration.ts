// Idempotent migration of characters' Pattern selections to the discipline-independent ids.
// It only renames ids; it never removes a selection (unknown ids are kept and reported).
import { db } from './db';
import { isKnownPatternId, normalizePatternId } from '../content/spells';
import { newId, nowIso } from './repo';
import { CAMPAIGN_ID } from '../domain/types';

export interface PatternMigrationReport { charactersChanged: number; idsRenamed: number; unknown: { pc: string; id: string }[] }

export async function migratePatternSelections(): Promise<PatternMigrationReport> {
  const report: PatternMigrationReport = { charactersChanged: 0, idsRenamed: 0, unknown: [] };
  await db.transaction('rw', db.pcs, db.audit, async () => {
    for (const pc of await db.pcs.toArray()) {
      let renamed = 0;
      const fix = (list: string[] = []) => {
        const out: string[] = [];
        for (const id of list) {
          const next = normalizePatternId(id);
          if (next !== id) renamed++;
          if (!isKnownPatternId(next)) report.unknown.push({ pc: pc.name, id });
          if (!out.includes(next)) out.push(next);
        }
        return out;
      };
      const patternIds = fix(pc.patternIds);
      const preparedIds = fix(pc.preparedIds);
      if (renamed === 0) continue;
      await db.pcs.put({ ...pc, patternIds, preparedIds, updatedAt: nowIso(), revision: (pc.revision ?? 1) + 1 });
      await db.audit.add({
        id: newId('aud'), campaignId: CAMPAIGN_ID, timestamp: nowIso(), actor: 'IMPORT', eventType: 'pattern-migration', entityType: 'pcs', entityId: pc.id,
        summary: `${pc.name}: ${renamed} Pattern selection id${renamed === 1 ? '' : 's'} moved to the discipline-independent scheme (nothing removed)`,
        beforeJson: JSON.stringify({ patternIds: pc.patternIds, preparedIds: pc.preparedIds }), afterJson: JSON.stringify({ patternIds, preparedIds }),
      });
      report.charactersChanged++;
      report.idsRenamed += renamed;
    }
  });
  return report;
}

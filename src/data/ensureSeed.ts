// Called on every launch. Loads the DM seed chunk only when the stored seed version is behind.
import { applySeed, getSeedReport, getSeedVersion, type SeedReport } from './seedEngine';
import { requestPersistence } from './db';
import { migratePatternSelections } from './patternMigration';
import { SEED_VERSION } from '../seedVersion';

export async function ensureSeed(): Promise<SeedReport | undefined> {
  let report: SeedReport | undefined;
  if ((await getSeedVersion()) === SEED_VERSION) report = await getSeedReport();
  else {
    const { buildSeed } = await import('../seed/index');
    report = await applySeed(buildSeed());
    void requestPersistence();
  }
  // Cheap and idempotent: also covers a backup restored from before the Pattern id change.
  await migratePatternSelections();
  return report;
}

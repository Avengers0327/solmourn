// Known / prepared Pattern changes for a Resonant. Shared by the Patternbook and the directory.
import { canAddToBook, canPrepare } from '../domain/rules';
import type { PC, Pattern } from '../domain/types';
import { normalizePatternId } from '../content/spells';
import { notify, update } from './repo';

const ids = (xs: string[]) => xs.map(normalizePatternId);
const save = (pc: PC, patch: Partial<PC>) => update<PC>('pcs', pc.id, patch, {});

export const isKnown = (pc: PC, p: Pattern) => ids(pc.patternIds).includes(p.id);
export const isPrepared = (pc: PC, p: Pattern) => ids(pc.preparedIds).includes(p.id);

/** Add to or remove from the Patternbook. Removing also unprepares. Never deletes anything else. */
export async function toggleBook(pc: PC, p: Pattern): Promise<void> {
  if (isKnown(pc, p)) {
    await save(pc, { patternIds: ids(pc.patternIds).filter((x) => x !== p.id), preparedIds: ids(pc.preparedIds).filter((x) => x !== p.id) });
    return;
  }
  const ok = canAddToBook(pc, p);
  if (!ok.ok) return notify(ok.error);
  await save(pc, { patternIds: [...ids(pc.patternIds), p.id] });
}
export async function togglePrep(pc: PC, p: Pattern): Promise<void> {
  if (isPrepared(pc, p)) {
    await save(pc, { preparedIds: ids(pc.preparedIds).filter((x) => x !== p.id) });
    return;
  }
  const ok = canPrepare({ ...pc, patternIds: ids(pc.patternIds), preparedIds: ids(pc.preparedIds) }, p);
  if (!ok.ok) return notify(ok.error);
  await save(pc, { preparedIds: [...ids(pc.preparedIds), p.id] });
}

// Blank-record factories for things the DM adds during play. New records are DM-only by default.
import type { CanonDecision, Clue, Location, LoreEntry, NPC, PC, Revelation, TimelineEntry } from '../domain/types';
import { syncResources } from '../domain/rules';

type New<T> = Omit<T, 'id' | 'campaignId' | 'createdAt' | 'updatedAt' | 'revision'>;

export const blankNpc = (name = 'New NPC'): New<NPC> => ({
  name, role: '', species: '', tags: [], publicInfoMd: '', privateInfoMd: '', wants: '', fears: '', knowsMd: '', mistakenBeliefsMd: '',
  relationship: '', lastSeen: '', status: 'MET', visibility: 'DM_ONLY', sourceRef: 'Improvised at the table',
});
export const blankClue = (sessionIndex: number): New<Clue> => ({
  title: 'New clue', playerTitle: '', sessionIndex, revelationIds: [], status: 'NOT_SEEN', required: false, discoveryRoutes: [],
  privateTextMd: '', playerTextMd: '', evidenceItem: '', discoveredBy: [], visibility: 'DM_ONLY', sourceRef: 'Added by DM',
});
export const blankRevelation = (sessionIndex: number): New<Revelation> => ({
  title: 'New revelation', playerTitle: '', privateTruthMd: '', playerSafeSummaryMd: '', backupMd: '', sessionIndex, status: 'NOT_SEEN',
  visibility: 'DM_ONLY', spoilerTerms: [], sourceRef: 'Added by DM',
});
export const blankLore = (): New<LoreEntry> => ({
  title: 'New lore entry', category: 'Improvised', bodyMd: '', playerMd: '', canonStatus: 'WORKING', visibility: 'DM_ONLY', tags: [], sourceRef: 'Added by DM',
});
export const blankLocation = (): New<Location> => ({ name: 'New place', bodyMd: '', playerMd: '', aliases: [], visibility: 'DM_ONLY', sourceRef: 'Added by DM' });
export const blankTimeline = (): New<TimelineEntry> => ({
  whenLabel: '', sort: 9999, title: 'New entry', bodyMd: '', playerMd: '', canonStatus: 'WORKING', visibility: 'DM_ONLY', sourceRef: 'Added by DM',
});
export const blankDecision = (): New<CanonDecision> => ({ topic: 'New decision', options: [], rejected: [], status: 'OPEN', rationaleMd: '', sourceRef: 'Added by DM' });

export function blankPc(): New<PC> {
  const pc: New<PC> = {
    name: 'New character', player: '', ancestry: 'Human', species: { entryId: 'srd-human' }, classId: 'warden', level: 3, background: 'Frostward Survivor', district: 'Frostward',
    attunement: 'UNATTUNED', specialty: '', abilities: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 }, hp: 28, maxHp: 28, tempHp: 0,
    ac: 16, speed: 30, conditions: [], exhaustion: 0, deathSaves: { successes: 0, failures: 0 }, resources: [], patternIds: [], preparedIds: [],
    highLevelUsed: [], rigIds: [], inventoryMd: '', connectionsMd: '', notesMd: '', privateNotesMd: '',
  };
  pc.resources = syncResources(pc as PC);
  return pc;
}

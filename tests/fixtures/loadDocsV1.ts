// Node-side loader for the five source documents (used by the pack script and tests).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SourceDocs } from './seedV1';

export function loadDocs(root = process.cwd()): SourceDocs {
  const read = (f: string) => readFileSync(resolve(root, f), 'utf8');
  return {
    bible: read('01_DM_STORY_BIBLE.md'),
    playerGuide: read('02_PLAYER_GUIDE.md'),
    roadmap: read('03_DM_ROADMAP.md'),
    fieldGuide: read('04_FIRST_TIME_DM_FIELD_GUIDE.md'),
    handoff: read('05_CLAUDE_CODE_IOS_APP_HANDOFF.md'),
  };
}

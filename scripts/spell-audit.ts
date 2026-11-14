// Prints the spell directory audit used in the status report.
import { SPELLS, UNMATCHED_MAPPING_NAMES, bookSummaries, spellTotals } from '../src/content/spells';
console.log(spellTotals());
console.log('unmatched mapping names:', UNMATCHED_MAPPING_NAMES);
console.table(bookSummaries());
const ids = SPELLS.map((s) => s.id);
console.log('duplicate ids:', ids.filter((x, i) => ids.indexOf(x) !== i));
console.log('ambiguous:', SPELLS.filter((s) => s.ambiguous).length, 'excluded official:', SPELLS.filter((s) => s.status === 'EXCLUDED' && s.origin !== 'UA').length);

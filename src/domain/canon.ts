// Consistency checker: explicit data-driven assertions (CanonRule records) evaluated against
// the DM's editable text. It only reports findings with evidence and a proposed correction;
// nothing is ever changed automatically.
import type { CanonDecision, CanonRule, PC, TableName } from './types';
import { speciesById } from '../content/species';
import { speciesSelectionOf } from './species';

export interface CheckTarget {
  table: TableName;
  id: string;
  label: string;
  field: string;
  text: string;
}
export interface Finding {
  ruleId: string;
  severity: 'error' | 'warning';
  message: string;
  suggestion: string;
  table: TableName;
  id: string;
  label: string;
  field: string;
  evidence: string;
  /** Present when the fix is a safe literal replacement the DM can apply with one confirmation. */
  replace?: { from: string; to: string };
}

const NEGATION = /\b(not|never|no|without|retired|superseded|isn't|wasn't|aren't|don't|doesn't|didn't|wrong|mistaken|false|rejected|myth|rather than|instead of)\b/i;
const sentences = (text: string) => text.split(/(?<=[.!?])\s+|\n+/);

export function runTextRules(rules: CanonRule[], targets: CheckTarget[]): Finding[] {
  const out: Finding[] = [];
  for (const rule of rules) {
    let re: RegExp;
    try {
      re = new RegExp(rule.pattern, rule.flags.includes('g') ? rule.flags : rule.flags + 'g');
    } catch {
      continue;
    }
    for (const t of targets) {
      if (!t.text || rule.exemptIds.includes(t.id)) continue;
      for (const sentence of sentences(t.text)) {
        re.lastIndex = 0;
        const m = re.exec(sentence);
        if (!m) continue;
        if (rule.mustEqual !== undefined && m[0] === rule.mustEqual) {
          // look for any OTHER occurrence in the sentence that is wrong
          let bad: string | null = null;
          let n: RegExpExecArray | null;
          re.lastIndex = 0;
          while ((n = re.exec(sentence))) if (n[0] !== rule.mustEqual) { bad = n[0]; break; }
          if (!bad) continue;
          m[0] = bad;
        }
        if (rule.negationAware && NEGATION.test(sentence)) continue;
        out.push({
          ruleId: rule.id, severity: rule.severity, message: rule.message, suggestion: rule.suggestion,
          table: t.table, id: t.id, label: t.label, field: t.field, evidence: sentence.trim().slice(0, 200),
          replace: rule.mustEqual !== undefined ? { from: m[0], to: rule.mustEqual } : undefined,
        });
      }
    }
  }
  return out;
}

/** Structural assertions that do not depend on free text. */
export function runStructuralChecks(decisions: CanonDecision[], pcs: PC[]): Finding[] {
  const out: Finding[] = [];
  for (const d of decisions) {
    if (d.deletedAt) continue;
    if (d.selectedOption && d.rejected.some((r) => r.toLowerCase() === d.selectedOption!.toLowerCase())) {
      out.push({
        ruleId: 'decision-rejected', severity: 'error', table: 'canonDecisions', id: d.id, label: d.topic, field: 'selectedOption',
        message: `"${d.selectedOption}" was explicitly rejected for this decision.`, suggestion: 'Choose a different option or clear the selection.',
        evidence: `Selected: ${d.selectedOption}`,
      });
    }
    if (d.status === 'LOCKED' && !d.selectedOption) {
      out.push({
        ruleId: 'decision-locked-empty', severity: 'warning', table: 'canonDecisions', id: d.id, label: d.topic, field: 'status',
        message: 'This decision is LOCKED but no option is selected.', suggestion: 'Select the approved option, or set the status back to OPEN.',
        evidence: 'Status LOCKED, selection empty',
      });
    }
  }
  for (const pc of pcs) {
    if (pc.deletedAt) continue;
    // Divergence amendment: any official species; one 2014-era rules package; unverified sources need DM review.
    const sel = speciesSelectionOf(pc);
    const entry = speciesById(sel.entryId);
    if (!entry) {
      out.push({ ruleId: 'pc-species', severity: 'error', table: 'pcs', id: pc.id, label: pc.name, field: 'species', message: 'This species is not in the catalog.', suggestion: 'Pick an official species, or use "Another official species" and name the book.', evidence: String(sel.entryId) });
    } else if (entry.status === 'NOT_SUPPORTED') {
      out.push({ ruleId: 'pc-species-2024', severity: 'error', table: 'pcs', id: pc.id, label: pc.name, field: 'species', message: '2024 species revisions are not used on the 2014 baseline.', suggestion: 'Pick the 2014-era version of the species.', evidence: entry.sourceTitle });
    } else if (entry.status === 'SOURCE_NEEDED' && !sel.dmApproved) {
      out.push({ ruleId: 'pc-species-review', severity: 'warning', table: 'pcs', id: pc.id, label: pc.name, field: 'species', message: `${entry.name}: traits were entered by hand from ${sel.manual?.bookRef || 'an unnamed book'} and need a DM review.`, suggestion: 'Check them against the book, then mark the species approved on the character.', evidence: entry.sourceTitle });
    }
    if (pc.classId === 'resonant' && pc.attunement === 'UNATTUNED') {
      out.push({
        ruleId: 'resonant-attuned', severity: 'warning', table: 'pcs', id: pc.id, label: pc.name, field: 'attunement',
        message: 'A Resonant must be Attuned to one discipline.', suggestion: 'Pick the character\'s discipline.', evidence: 'Attunement: Unattuned',
      });
    }
  }
  return out;
}

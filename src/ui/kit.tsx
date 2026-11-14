import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { CanonStatus, TableName, Visibility } from '../domain/types';
import { update } from '../data/repo';
import { useNav } from './state';

// ---------- Minimal Markdown renderer (React nodes only; no HTML injection) ----------
function inline(text: string, key = 0): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[2] !== undefined) out.push(<strong key={`${key}-${i++}`}>{inline(m[2], key + 100)}</strong>);
    else if (m[3] !== undefined) out.push(<em key={`${key}-${i++}`}>{m[3]}</em>);
    else out.push(<code key={`${key}-${i++}`}>{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
const cells = (line: string) => line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());

export function Md({ text, className = '' }: { text: string; className?: string }) {
  const lines = (text ?? '').replace(/\r/g, '').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || /^---+$/.test(line.trim())) { i++; continue; }
    if (line.startsWith('```')) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]);
      i++;
      blocks.push(<pre key={k++}>{buf.join('\n')}</pre>);
      continue;
    }
    const h = /^(#{1,4})\s+(.*)/.exec(line);
    if (h) {
      const Tag = (`h${Math.min(4, h[1].length + 1)}`) as 'h2';
      blocks.push(<Tag key={k++}>{inline(h[2], k)}</Tag>);
      i++;
      continue;
    }
    if (line.startsWith('>')) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) buf.push(lines[i++].replace(/^>\s?/, '').replace(/\s\s$/, ''));
      blocks.push(<blockquote key={k++}>{buf.map((b, j) => <div key={j}>{inline(b, j)}</div>)}</blockquote>);
      continue;
    }
    if (line.trim().startsWith('|') && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? '')) {
      const head = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]));
      // Tables become stacked cards: no horizontal scrolling on a phone.
      blocks.push(
        <div className="tbl" key={k++}>
          {rows.map((r, ri) => (
            <div className="tbl-row" key={ri}>
              {r.map((c, ci) => (c ? <div key={ci}>{ci > 0 && head[ci] ? <b className="k">{head[ci]}</b> : null}{ci === 0 ? <strong>{inline(c, ci)}</strong> : inline(c, ci)}</div> : null))}
            </div>
          ))}
        </div>,
      );
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && (/^\s*([-*]|\d+\.)\s+/.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        if (/^\s*([-*]|\d+\.)\s+/.test(lines[i])) items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''));
        else items[items.length - 1] += ' ' + lines[i].trim();
        i++;
      }
      const L = ordered ? 'ol' : 'ul';
      blocks.push(<L key={k++}>{items.map((it, j) => <li key={j}>{inline(it.replace(/^\[ \]\s*/, '☐ ').replace(/^\[x\]\s*/i, '☑ '), j)}</li>)}</L>);
      continue;
    }
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|>|```|\s*([-*]|\d+\.)\s+)/.test(lines[i]) && !lines[i].trim().startsWith('|')) buf.push(lines[i++]);
    if (!buf.length) buf.push(lines[i++]);
    blocks.push(<p key={k++}>{inline(buf.join(' '), k)}</p>);
  }
  return <div className={`md ${className}`}>{blocks}</div>;
}

// ---------- Chips ----------
const VIS: Record<Visibility, [string, string, string]> = {
  DM_ONLY: ['private', '🔒', 'DM only'],
  PLAYER_SAFE: ['safe', '✓', 'Player-safe'],
  REVEALED: ['revealed', '👁', 'Revealed'],
};
export const VisChip = ({ v }: { v: Visibility }) => <span className={`chip ${VIS[v][0]}`}><span aria-hidden>{VIS[v][1]}</span>{VIS[v][2]}</span>;
export const Chip = ({ children, tone = '' }: { children: ReactNode; tone?: string }) => <span className={`chip ${tone}`}>{children}</span>;
export const CanonChip = ({ s }: { s: CanonStatus }) => <span className={`chip ${s === 'LOCKED' ? 'amber' : s === 'RETIRED' ? 'bad' : ''}`}>{s}</span>;
export const pretty = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());

// ---------- Controls ----------
export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

/** Two-tap button for destructive or irreversible-feeling actions. */
export function ConfirmBtn({ children, confirm = 'Tap again to confirm', onConfirm, className = 'btn' }: { children: ReactNode; confirm?: string; onConfirm: () => void; className?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button type="button" className={`${className} ${armed ? 'arming' : ''}`} onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}>
      {armed ? confirm : children}
    </button>
  );
}

export function Pips({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <div className="pips" role="img" aria-label={`${label}: ${value} of ${max}`}>
      {Array.from({ length: max }, (_, i) => <span key={i} className={`pip ${i < value ? 'on' : ''}`} />)}
      <span className="small muted" style={{ marginLeft: 4 }}>{value}/{max}</span>
    </div>
  );
}

export function Sheet({ title, children, actions, short }: { title: ReactNode; children: ReactNode; actions?: ReactNode; short?: boolean }) {
  const nav = useNav();
  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && nav.close()}>
      <div className={`sheet ${short ? 'short' : ''}`} role="dialog" aria-modal="true">
        <div className="sheet-head">
          <h2 className="ellipsis">{title}</h2>
          {actions}
          <button className="btn sm" onClick={nav.close} aria-label="Close">✕</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

// ---------- Auto-saving fields ----------
type Tone = 'private' | 'safe' | '';
const toneTag = (tone: Tone) => (tone === 'private' ? <span className="chip private">🔒 DM only</span> : tone === 'safe' ? <span className="chip safe">✓ Player-safe</span> : null);

/** Text input that saves on blur (and keeps a draft in memory while typing). */
export function TextField({ label, value, onSave, area, tone = '', placeholder, type = 'text' }: {
  label: string; value: string | number; onSave: (v: string) => void; area?: boolean; tone?: Tone; placeholder?: string; type?: string;
}) {
  const [draft, setDraft] = useState(String(value ?? ''));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(String(value ?? ''));
  }, [value]);
  const common = {
    className: 'input',
    value: draft,
    placeholder,
    onFocus: () => (focused.current = true),
    onBlur: () => {
      focused.current = false;
      if (draft !== String(value ?? '')) onSave(draft);
    },
  };
  return (
    <label className={`field ${tone}`}>
      <span>{label} {toneTag(tone)}</span>
      {area ? <textarea {...common} rows={4} onChange={(e) => setDraft(e.target.value)} /> : <input {...common} type={type} inputMode={type === 'number' ? 'numeric' : undefined} onChange={(e) => setDraft(e.target.value)} />}
    </label>
  );
}

export function SelectField<T extends string>({ label, value, options, onSave }: { label: string; value: T; options: { value: T; label: string }[]; onSave: (v: T) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select className="input" value={value} onChange={(e) => onSave(e.target.value as T)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export interface FieldSpec {
  key: string;
  label: string;
  kind?: 'text' | 'area' | 'number' | 'list' | 'select';
  tone?: Tone;
  options?: string[];
  placeholder?: string;
}
/** Generic record editor: every field saves itself through the audited repo. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function RecordForm({ table, record, fields }: { table: TableName; record: any; fields: FieldSpec[] }) {
  const save = (key: string, v: unknown) => update(table, record.id, { [key]: v } as never);
  return (
    <div>
      {fields.map((f) =>
        f.kind === 'select' ? (
          <SelectField key={f.key} label={f.label} value={String(record[f.key] ?? '')} options={(f.options ?? []).map((o) => ({ value: o, label: pretty(o) }))} onSave={(v) => save(f.key, v)} />
        ) : (
          <TextField
            key={f.key}
            label={f.kind === 'list' ? `${f.label} (one per line)` : f.label}
            tone={f.tone}
            placeholder={f.placeholder}
            area={f.kind === 'area' || f.kind === 'list'}
            type={f.kind === 'number' ? 'number' : 'text'}
            value={f.kind === 'list' ? (record[f.key] ?? []).join('\n') : record[f.key] ?? ''}
            onSave={(v) => save(f.key, f.kind === 'list' ? v.split('\n').map((x) => x.trim()).filter(Boolean) : f.kind === 'number' ? Number(v) || 0 : v)}
          />
        ),
      )}
    </div>
  );
}

const VIS_HELP: Record<Visibility, string> = {
  DM_ONLY: 'Nothing from this record appears in Presenter mode or exports.',
  PLAYER_SAFE: 'Only the name and the player-safe text are shareable. DM-only fields never are.',
  REVEALED: 'Revealed in play: only the name and the player-safe text are shareable. DM-only fields never are.',
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function VisibilityControl({ table, record, label }: { table: TableName; record: any; label: string }) {
  const v = record.visibility as Visibility;
  return (
    <div className="card">
      <div className="label">Who can see this</div>
      <Seg
        label="Visibility"
        value={v}
        options={[{ value: 'DM_ONLY', label: '🔒 DM only' }, { value: 'PLAYER_SAFE', label: '✓ Player-safe' }, { value: 'REVEALED', label: '👁 Revealed' }]}
        onChange={(nv) => update(table, record.id, { visibility: nv } as never, { summary: `${label}: ${VIS[nv][2]}`, undoable: true, eventType: 'visibility' })}
      />
      <p className="small muted" style={{ marginTop: 8 }}>{VIS_HELP[v]}</p>
    </div>
  );
}

export const Empty = ({ children }: { children: ReactNode }) => <p className="muted center" style={{ padding: '24px 12px' }}>{children}</p>;

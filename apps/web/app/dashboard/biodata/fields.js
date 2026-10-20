'use client';

// Small controlled inputs for the biodata form. Each takes `value` and `onChange(value)`.
import { useId } from 'react';
import { options } from '@/lib/format';

export function Text({ label, value, onChange, required, hint, type = 'text', max, ...rest }) {
  const auto = useId();
  const id = rest.id || auto;
  return (
    <div className="field">
      <label htmlFor={id} className={`label${required ? ' req' : ''}`}>{label}</label>
      <input id={id} type={type} className="input" value={value ?? ''} maxLength={max} onChange={(e) => onChange(e.target.value)} {...rest} />
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Num({ label, value, onChange, min, max, required, hint }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id} className={`label${required ? ' req' : ''}`}>{label}</label>
      <input id={id} type="number" inputMode="numeric" className="input" min={min} max={max} value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Area({ label, value, onChange, max = 1000, hint, rows = 4 }) {
  const id = useId();
  return (
    <div className="field" style={{ gridColumn: '1 / -1' }}>
      <label htmlFor={id} className="label">{label}</label>
      <textarea id={id} className="textarea" rows={rows} maxLength={max} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      <span className="hint">{hint ? `${hint} · ` : ''}{(value || '').length}/{max}</span>
    </div>
  );
}

export function Pick({ label, value, onChange, list, lang, required, chooseLabel, items }) {
  const id = useId();
  const opts = items || options(list);
  return (
    <div className="field">
      <label htmlFor={id} className={`label${required ? ' req' : ''}`}>{label}</label>
      <select id={id} className="select" value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">{chooseLabel}</option>
        {opts.map((o) => <option key={o.value} value={o.value}>{o[lang] ?? o.label}</option>)}
      </select>
    </div>
  );
}

export function YesNo({ label, value, onChange, required, t }) {
  return (
    <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className={`label${required ? ' req' : ''}`} style={{ marginBottom: 6 }}>{label}</legend>
      <div className="choice-grid">
        {[[true, t.common.yes], [false, t.common.no]].map(([v, l]) => (
          <label key={String(v)} className="choice"><input type="radio" checked={value === v} onChange={() => onChange(v)} />{l}</label>
        ))}
      </div>
    </fieldset>
  );
}

export function Multi({ label, value, onChange, list, lang, items, scroll }) {
  const set = new Set(value || []);
  const opts = items || options(list);
  const toggle = (v) => {
    const n = new Set(set);
    n.has(v) ? n.delete(v) : n.add(v);
    onChange(n.size ? [...n] : undefined);
  };
  return (
    <fieldset className="field" style={{ border: 0, padding: 0, margin: 0, gridColumn: '1 / -1' }}>
      <legend className="label" style={{ marginBottom: 6 }}>{label}</legend>
      <div className="choice-grid" style={scroll ? { maxHeight: 220, overflowY: 'auto', padding: 4, border: '1px solid var(--line)', borderRadius: 16 } : undefined}>
        {opts.map((o) => (
          <label key={o.value} className="choice"><input type="checkbox" checked={set.has(o.value)} onChange={() => toggle(o.value)} />{o[lang]}</label>
        ))}
      </div>
    </fieldset>
  );
}

export function Height({ label, value, onChange, required, t, lang }) {
  const ft = value ? Math.floor(value / 12) : '';
  const inch = value ? value % 12 : '';
  const set = (f, i) => {
    if (f === '' || f === undefined) return onChange(undefined);
    onChange(Number(f) * 12 + Number(i || 0));
  };
  const d = (n) => (lang === 'bn' ? String(n).replace(/\d/g, (x) => '০১২৩৪৫৬৭৮৯'[x]) : n);
  return (
    <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className={`label${required ? ' req' : ''}`} style={{ marginBottom: 6 }}>{label}</legend>
      <div className="grid grid-2" style={{ gap: 8 }}>
        <select className="select" aria-label={t.form.heightFt} value={ft} onChange={(e) => set(e.target.value, inch)}>
          <option value="">{t.form.heightFt}</option>
          {[4, 5, 6, 7].map((f) => <option key={f} value={f}>{d(f)} {t.form.heightFt}</option>)}
        </select>
        <select className="select" aria-label={t.form.heightIn} value={inch} onChange={(e) => set(ft || 5, e.target.value)}>
          <option value="">{t.form.heightIn}</option>
          {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{d(i)} {t.form.heightIn}</option>)}
        </select>
      </div>
    </fieldset>
  );
}

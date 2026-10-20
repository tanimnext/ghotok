'use client';
/** One input for one schema field. Emits plain values: strings, numbers, booleans, arrays. */
import { useState } from 'react';
import { fieldLabel, height, HEIGHTS, digits } from '@ghotok/shared';
import { uiText } from '../i18n.js';
import { optionsFor } from './options.js';

const LONG_LIST = 14;

function YesNo({ name, value, onChange, lang, disabled }) {
  const t = uiText(lang);
  return (
    <div className="choice-grid" role="radiogroup">
      {[
        [true, t.yes],
        [false, t.no],
      ].map(([v, l]) => (
        <label key={String(v)} className="choice">
          <input type="radio" name={name} checked={value === v} disabled={disabled} onChange={() => onChange(v)} />
          {l}
        </label>
      ))}
    </div>
  );
}

function MultiSelect({ name, value, onChange, opts, lang, disabled }) {
  const t = uiText(lang);
  const [q, setQ] = useState('');
  const selected = new Set(value || []);
  const toggle = (v) => {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(opts.map((o) => o.value).filter((x) => next.has(x)));
  };
  const long = opts.length > LONG_LIST;
  const shown = q ? opts.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : opts;
  return (
    <div className="stack gap-8">
      {long && (
        <div className="row gap-8">
          <input
            className="input"
            type="search"
            value={q}
            placeholder={t.search}
            aria-label={t.search}
            onChange={(e) => setQ(e.target.value)}
          />
          {selected.size > 0 && (
            <span className="pill pill-rose">
              {digits(selected.size, lang)} {t.selected}
            </span>
          )}
        </div>
      )}
      <div className={`choice-grid${long ? ' choice-scroll' : ''}`}>
        {shown.map((o) => (
          <label key={o.value} className="choice">
            <input
              type="checkbox"
              name={name}
              value={o.value}
              checked={selected.has(o.value)}
              disabled={disabled}
              onChange={() => toggle(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function Entries({ field, value, onChange, lang, disabled, type }) {
  const t = uiText(lang);
  const items = value || [];
  const set = (i, key, v) => onChange(items.map((it, j) => (j === i ? { ...it, [key]: v } : it)));
  return (
    <div className="stack gap-12">
      {items.map((item, i) => (
        <fieldset key={i} className="entry">
          <legend className="small muted">
            {t.entry} {digits(i + 1, lang)}
          </legend>
          <div className="grid grid-auto-200" style={{ gap: 12 }}>
            {field.itemFields.map((f) => (
              <label key={f.key} className="field">
                <span className="label">{fieldLabel(f, lang, type)}</span>
                <Control
                  field={f}
                  value={item[f.key]}
                  onChange={(v) => set(i, f.key, v)}
                  lang={lang}
                  type={type}
                  disabled={disabled}
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={disabled}
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            {t.remove}
          </button>
        </fieldset>
      ))}
      {items.length < (field.maxItems || 10) && (
        <button
          type="button"
          className="btn btn-outline btn-sm"
          style={{ alignSelf: 'flex-start' }}
          disabled={disabled}
          onClick={() => onChange([...items, {}])}
        >
          + {t.add}
        </button>
      )}
    </div>
  );
}

/** The bare control (no label). */
export function Control({ field, value, onChange, lang, sectionValues, type, disabled, inputProps = {} }) {
  const t = uiText(lang);
  const common = { disabled, ...inputProps };
  switch (field.type) {
    case 'textarea':
      return (
        <>
          <textarea
            className="textarea"
            value={value ?? ''}
            maxLength={field.max}
            onChange={(e) => onChange(e.target.value)}
            {...common}
          />
          {field.max && (value?.length || 0) > field.max * 0.8 && (
            <span className="hint">
              {digits(field.max - (value?.length || 0), lang)} {t.charsLeft}
            </span>
          )}
        </>
      );
    case 'number':
      return (
        <input
          className="input"
          type="number"
          inputMode="numeric"
          min={field.min}
          max={field.max}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          {...common}
        />
      );
    case 'height':
      return (
        <select
          className="select"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          {...common}
        >
          <option value="">{t.choose}</option>
          {HEIGHTS.map((h) => (
            <option key={h} value={h}>
              {height(h, lang)}
            </option>
          ))}
        </select>
      );
    case 'date':
      return (
        <input
          className="input"
          type="date"
          max={new Date().toISOString().slice(0, 10)}
          value={value ? String(value).slice(0, 10) : ''}
          onChange={(e) => onChange(e.target.value || null)}
          {...common}
        />
      );
    case 'select': {
      const opts = optionsFor(field, sectionValues, lang, type);
      return (
        <select className="select" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} {...common}>
          <option value="">{t.choose}</option>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    case 'multiselect':
      return (
        <MultiSelect
          name={field.key}
          value={value}
          onChange={onChange}
          opts={optionsFor(field, sectionValues, lang, type)}
          lang={lang}
          disabled={disabled}
        />
      );
    case 'yesno':
      return <YesNo name={field.key} value={value} onChange={onChange} lang={lang} disabled={disabled} />;
    case 'entries':
      return <Entries field={field} value={value} onChange={onChange} lang={lang} disabled={disabled} type={type} />;
    case 'phone':
      return (
        <input
          className="input"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="01XXXXXXXXX"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          {...common}
        />
      );
    case 'email':
      return (
        <input
          className="input"
          type="email"
          autoComplete="email"
          value={value ?? ''}
          maxLength={field.max}
          onChange={(e) => onChange(e.target.value)}
          {...common}
        />
      );
    default:
      return (
        <input
          className="input"
          type="text"
          value={value ?? ''}
          maxLength={field.max}
          onChange={(e) => onChange(e.target.value)}
          {...common}
        />
      );
  }
}

/** Labelled field with hint and error. `check` fields render as a single checkbox sentence. */
export function FieldInput({ field, value, onChange, lang, sectionValues, type, error, disabled }) {
  const label = fieldLabel(field, lang, type);
  const hint = field.help?.[lang];
  const id = `f-${field.key}`;
  if (field.type === 'check') {
    return (
      <div className="field">
        <label className="check">
          <input
            type="checkbox"
            checked={value === true}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className={field.required ? 'req' : undefined}>{label}</span>
        </label>
        {error && <span className="field-error">{error}</span>}
      </div>
    );
  }
  const group = ['yesno', 'multiselect', 'entries'].includes(field.type);
  const Wrapper = group ? 'fieldset' : 'div';
  return (
    <Wrapper className={`field${group ? ' fieldset' : ''}${field.type === 'textarea' || group ? ' field-wide' : ''}`}>
      {group ? (
        <legend className={`label${field.required ? ' req' : ''}`}>{label}</legend>
      ) : (
        <label className={`label${field.required ? ' req' : ''}`} htmlFor={id}>
          {label}
        </label>
      )}
      <Control
        field={field}
        value={value}
        onChange={onChange}
        lang={lang}
        sectionValues={sectionValues}
        type={type}
        disabled={disabled}
        inputProps={
          group
            ? {}
            : {
                id,
                'aria-invalid': error ? true : undefined,
                'aria-describedby': error || hint ? `${id}-note` : undefined,
              }
        }
      />
      {(error || hint) && (
        <span id={`${id}-note`} className={error ? 'field-error' : 'hint'}>
          {error || hint}
        </span>
      )}
    </Wrapper>
  );
}

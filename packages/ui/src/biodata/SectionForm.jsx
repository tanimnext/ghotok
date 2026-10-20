'use client';
/** All active fields of one biodata section. Changing a parent location clears its children. */
import { isActive } from '@ghotok/shared';
import { FieldInput } from './FieldInput.jsx';
import { dependentsOf } from './options.js';

/**
 * @param section  a section from @ghotok/shared SECTIONS
 * @param biodata  the whole biodata being edited (for showIf rules and gendered labels)
 * @param onChange (nextSectionValues) => void
 * @param errors   { 'section.field': message }
 */
export function SectionForm({ section, biodata, onChange, lang, errors = {}, disabled }) {
  const values = biodata?.[section.key] || {};
  const set = (key, v) => {
    const next = { ...values, [key]: v };
    for (const child of dependentsOf(section, key)) next[child] = null;
    onChange(next);
  };
  const preview = { ...biodata, [section.key]: values };
  return (
    <div className="form-grid">
      {section.fields
        .filter((f) => isActive(f, preview))
        .map((f) => (
          <FieldInput
            key={f.key}
            field={f}
            value={values[f.key]}
            onChange={(v) => set(f.key, v)}
            lang={lang}
            sectionValues={values}
            type={biodata?.type}
            error={errors[`${section.key}.${f.key}`]}
            disabled={disabled}
          />
        ))}
    </div>
  );
}

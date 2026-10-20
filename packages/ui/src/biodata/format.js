/** Turn stored biodata values into display text. Pure functions (safe on the server). */
import {
  label,
  labels,
  digits,
  height,
  yesNo,
  date,
  monthYear,
  place,
  fieldLabel,
  isActive,
  SECTIONS,
} from '@ghotok/shared';
import { uiText } from '../i18n.js';

export function formatValue(field, value, lang, type) {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) return null;
  const t = uiText(lang);
  switch (field.type) {
    case 'select':
      return label(field.options, value, lang, type);
    case 'multiselect':
      return labels(field.options, value, lang);
    case 'yesno':
    case 'check':
      return yesNo(value, lang);
    case 'number':
      return field.unit === 'kg' ? `${digits(value, lang)} ${t.kg}` : digits(value, lang);
    case 'height':
      return height(value, lang);
    case 'date':
      return date(value, lang, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    case 'entries':
      return value
        .map((it) =>
          field.itemFields
            .map((f) => formatValue(f, it[f.key], lang, type))
            .filter(Boolean)
            .join(' · ')
        )
        .filter(Boolean)
        .join('\n');
    default:
      return String(value);
  }
}

const rangeText = (min, max, fmt) => (min || max ? `${min ? fmt(min) : '…'} – ${max ? fmt(max) : '…'}` : null);

/**
 * Rows to show for one section: [{ key, label, value }]. Combines address parts into
 * "permanent / present address" and min–max pairs into one range row.
 */
export function sectionRows(section, biodata, lang) {
  const t = uiText(lang);
  const s = biodata?.[section.key] || {};
  const type = biodata?.type;
  const rows = [];
  const skip = new Set();

  if (section.key === 'general') {
    rows.push({ key: 'type', label: t.biodataType, value: label('type', type, lang) });
    if (s.age) rows.push({ key: 'age', label: t.age, value: `${digits(s.age, lang)} ${t.years}` });
    if (s.birthMonth && !s.dateOfBirth)
      rows.push({ key: 'birthMonth', label: t.birthMonth, value: monthYear(`${s.birthMonth}-01`, lang) });
  }
  if (section.key === 'address') {
    rows.push({ key: 'permanent', label: t.permanentAddress, value: place(s, 'permanent', lang) || null });
    rows.push({ key: 'present', label: t.presentAddress, value: place(s, 'present', lang) || null });
    for (const k of [
      'permanentDivision',
      'permanentDistrict',
      'permanentUpazila',
      'permanentArea',
      'presentCountry',
      'presentDivision',
      'presentDistrict',
      'presentUpazila',
      'presentArea',
    ])
      skip.add(k);
  }
  if (section.key === 'expectation') {
    rows.push({ key: 'age', label: t.ageRange, value: rangeText(s.ageMin, s.ageMax, (v) => digits(v, lang)) });
    rows.push({
      key: 'height',
      label: t.heightRange,
      value: rangeText(s.heightMin, s.heightMax, (v) => height(v, lang)),
    });
    for (const k of ['ageMin', 'ageMax', 'heightMin', 'heightMax']) skip.add(k);
  }
  for (const f of section.fields) {
    if (skip.has(f.key) || !isActive(f, biodata)) continue;
    rows.push({ key: f.key, label: fieldLabel(f, lang, type), value: formatValue(f, s[f.key], lang, type) });
  }
  return rows.filter((r) => r.value !== null && r.value !== undefined && r.value !== '');
}

/** Sections to display: public ones, plus private ones (contact, pledge) when allowed. */
export const viewSections = ({ showPrivate = false } = {}) => SECTIONS.filter((s) => showPrivate || !s.private);

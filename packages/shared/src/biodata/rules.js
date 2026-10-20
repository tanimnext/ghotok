/**
 * Business rules derived from the biodata schema. Pure functions, shared by API and UI.
 */
import { SECTIONS, isActive } from './schema.js';
import { LISTS, values, UPAZILAS, DISTRICTS } from '../options.js';
import { normalizeBdPhone } from '../phone.js';

/** Legal minimum marriage age in Bangladesh. */
export const MIN_AGE = { bride: 18, groom: 21 };

export function ageFromDob(dob, now = new Date()) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age -= 1;
  return age;
}

const optionSet = new Map(Object.entries(LISTS).map(([k, list]) => [k, new Set(values(list))]));

/** Parse a date-only value into UTC midnight (so no timezone shifts the day). */
export function toCalendarDate(v) {
  if (!v) return undefined;
  const s = String(v instanceof Date ? v.toISOString() : v).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Coerce one field value from user input. Returns { value } or { error }.
 * `undefined` value means "clear this field".
 */
export function coerceField(field, raw) {
  if (raw === undefined || raw === null || raw === '') return { value: undefined };
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'email': {
      const s = String(raw).trim();
      if (!s) return { value: undefined };
      if (field.max && s.length > field.max) return { error: 'too_long' };
      if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return { error: 'invalid_email' };
      return { value: s };
    }
    case 'phone': {
      const p = normalizeBdPhone(raw);
      return p ? { value: p } : { error: 'invalid_phone' };
    }
    case 'number':
    case 'height': {
      const n = Number(raw);
      if (!Number.isFinite(n)) return { error: 'invalid_number' };
      if (field.min !== undefined && n < field.min) return { error: 'too_small' };
      if (field.max !== undefined && n > field.max) return { error: 'too_large' };
      return { value: Math.round(n) };
    }
    case 'yesno':
    case 'check':
      if (raw === true || raw === 'true' || raw === 'yes') return { value: true };
      if (raw === false || raw === 'false' || raw === 'no') return { value: false };
      return { error: 'invalid_choice' };
    case 'select': {
      const v = String(raw);
      return optionSet.get(field.options)?.has(v) ? { value: v } : { error: 'invalid_choice' };
    }
    case 'multiselect': {
      const arr = (Array.isArray(raw) ? raw : [raw]).map(String);
      const set = optionSet.get(field.options);
      if (arr.some((v) => !set?.has(v))) return { error: 'invalid_choice' };
      const uniq = [...new Set(arr)];
      return { value: uniq.length ? uniq : undefined };
    }
    case 'date': {
      const d = toCalendarDate(raw);
      return d ? { value: d } : { error: 'invalid_date' };
    }
    case 'entries': {
      if (!Array.isArray(raw)) return { error: 'invalid_list' };
      const items = [];
      for (const item of raw.slice(0, field.maxItems || 10)) {
        const out = {};
        for (const f of field.itemFields) {
          const r = coerceField(f, item?.[f.key]);
          if (r.error) return { error: r.error };
          if (r.value !== undefined) out[f.key] = r.value;
        }
        if (Object.keys(out).length) items.push(out);
      }
      return { value: items };
    }
    default:
      return { error: 'unknown_type' };
  }
}

/**
 * Whitelist and coerce a (partial) biodata update coming from a user.
 * Only known sections/fields are accepted. Returns { set, unset, errors }
 * where set/unset use dotted paths ready for a MongoDB update.
 */
export function sanitizeBiodataInput(body) {
  const set = {};
  const unset = {};
  const errors = {};
  if (body?.type !== undefined) {
    if (['groom', 'bride'].includes(body.type)) set.type = body.type;
    else errors.type = 'invalid_choice';
  }
  for (const section of SECTIONS) {
    const src = body?.[section.key];
    if (!src || typeof src !== 'object') continue;
    for (const field of section.fields) {
      if (!(field.key in src)) continue;
      const path = `${section.key}.${field.key}`;
      const r = coerceField(field, src[field.key]);
      if (r.error) errors[path] = r.error;
      else if (r.value === undefined) unset[path] = 1;
      else set[path] = r.value;
    }
  }
  return { set, unset, errors };
}

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const empty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

/**
 * Everything that blocks submitting a biodata for review.
 * Returns problem keys such as "general.dateOfBirth" or "general.dateOfBirth:underage".
 */
export function submissionProblems(b, { ownerPhone } = {}) {
  const problems = [];
  if (!b?.type) problems.push('type');
  for (const section of SECTIONS) {
    for (const field of section.fields) {
      if (!field.required || !isActive(field, b)) continue;
      const v = get(b, `${section.key}.${field.key}`);
      if (field.type === 'check' || field.type === 'yesno') {
        if (v !== true) problems.push(`${section.key}.${field.key}`);
      } else if (empty(v)) problems.push(`${section.key}.${field.key}`);
    }
  }
  const age = ageFromDob(b?.general?.dateOfBirth);
  if (age !== null && b?.type && age < MIN_AGE[b.type]) problems.push('general.dateOfBirth:underage');
  const gp = normalizeBdPhone(b?.contact?.guardianPhone);
  if (gp && ownerPhone && gp === normalizeBdPhone(ownerPhone)) problems.push('contact.guardianPhone:same_as_own');
  const x = b?.expectation || {};
  if (x.ageMin && x.ageMax && x.ageMin > x.ageMax) problems.push('expectation.ageMax:range');
  if (x.heightMin && x.heightMax && x.heightMin > x.heightMax) problems.push('expectation.heightMax:range');
  const a = b?.address || {};
  if (a.permanentUpazila && UPAZILAS.find((u) => u.value === a.permanentUpazila)?.district !== a.permanentDistrict) {
    problems.push('address.permanentUpazila:mismatch');
  }
  if (
    a.permanentDistrict &&
    a.permanentDivision &&
    DISTRICTS.find((d) => d.value === a.permanentDistrict)?.division !== a.permanentDivision
  ) {
    problems.push('address.permanentDistrict:mismatch');
  }
  return problems;
}

/** Fields that are visible publicly for a given biodata. */
export function publicFields(b) {
  return SECTIONS.filter((s) => !s.private).map((s) => ({
    ...s,
    fields: s.fields.filter((f) => !f.private && isActive(f, b)),
  }));
}

/** Short biodata code shown everywhere, e.g. GH-1001. */
export const biodataCode = (no) => (no ? `GH-${no}` : null);

/** Parse "GH-1001", "gh1001" or "1001" into 1001. */
export function parseBiodataCode(input) {
  const n = parseInt(String(input ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

import * as C from './constants.js';

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export const digits = (v, lang) => (lang === 'bn' ? String(v ?? '').replace(/\d/g, (d) => BN_DIGITS[d]) : String(v ?? ''));
export const num = (v, lang) => digits(Number(v || 0).toLocaleString('en-US'), lang);
export const taka = (v, lang) => `৳${num(v, lang)}`;

const LISTS = {
  type: C.BIODATA_TYPES, marital: C.MARITAL_STATUS, religion: C.RELIGIONS, complexion: C.COMPLEXIONS, blood: C.BLOOD_GROUPS,
  medium: C.EDUCATION_MEDIUM, education: C.EDUCATION_LEVELS, occupation: C.OCCUPATIONS, economic: C.ECONOMIC_STATUS,
  relation: C.GUARDIAN_RELATIONS, method: C.PAYMENT_METHODS, report: C.REPORT_REASONS, hide: C.HIDE_REASONS, delete: C.DELETE_REASONS,
  division: C.DIVISIONS, district: C.DISTRICTS,
};

/** Label for an option value, e.g. label('religion', 'hindu', 'bn') → 'হিন্দু' */
export function label(list, value, lang) {
  if (value === undefined || value === null || value === '') return null;
  const o = (LISTS[list] || []).find((x) => x.value === value);
  return o ? o[lang] || o.en : value;
}
export const labels = (list, values, lang) => (values || []).map((v) => label(list, v, lang)).filter(Boolean).join(', ');
export const options = (list) => LISTS[list] || [];

export function height(inches, lang) {
  if (!inches) return null;
  const ft = Math.floor(inches / 12);
  const inch = inches % 12;
  return digits(`${ft}′ ${inch}″`, lang);
}
export const HEIGHTS = Array.from({ length: 43 }, (_, i) => 48 + i); // 4'0" – 7'6"

export function date(d, lang, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!d) return '';
  return new Date(d).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', { timeZone: 'Asia/Dhaka', ...opts });
}
export const dateTime = (d, lang) => date(d, lang, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export const yesNo = (v, lang) => (v === true ? (lang === 'bn' ? 'হ্যাঁ' : 'Yes') : v === false ? (lang === 'bn' ? 'না' : 'No') : null);

export const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

/** Display helpers shared by the website and admin panel. */
import { LISTS, WIDOWED_LABEL } from './options.js';

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/** Convert ASCII digits to Bangla digits when lang is 'bn'. */
export const digits = (v, lang) =>
  lang === 'bn' ? String(v ?? '').replace(/\d/g, (d) => BN_DIGITS[d]) : String(v ?? '');
export const num = (v, lang) => digits(Number(v || 0).toLocaleString('en-US'), lang);
export const taka = (v, lang) => `৳${num(v, lang)}`;

/** Label for an option value, e.g. label('religion', 'hindu', 'bn') → 'হিন্দু'. */
export function label(list, value, lang = 'en', biodataType) {
  if (value === undefined || value === null || value === '') return null;
  if (list === 'marital' && value === 'widowed' && biodataType) return WIDOWED_LABEL[biodataType][lang];
  const opt = (LISTS[list] || []).find((x) => x.value === value);
  return opt ? opt[lang] || opt.en : String(value);
}
export const labels = (list, vals, lang) =>
  (vals || [])
    .map((v) => label(list, v, lang))
    .filter(Boolean)
    .join(', ');
export const options = (list) => LISTS[list] || [];

/** 63 → 5′ 3″ */
export function height(inches, lang) {
  if (!inches) return null;
  return digits(`${Math.floor(inches / 12)}′ ${inches % 12}″`, lang);
}
/** Heights offered in pickers: 4′0″ to 7′6″. */
export const HEIGHTS = Array.from({ length: 43 }, (_, i) => 48 + i);

export function date(d, lang, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!d) return '';
  return new Date(d).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', { timeZone: 'Asia/Dhaka', ...opts });
}
export const dateTime = (d, lang) =>
  date(d, lang, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
export const monthYear = (d, lang) => date(d, lang, { month: 'long', year: 'numeric', timeZone: 'UTC' });

export const yesNo = (v, lang) =>
  v === true ? (lang === 'bn' ? 'হ্যাঁ' : 'Yes') : v === false ? (lang === 'bn' ? 'না' : 'No') : null;

/** Replace {name} placeholders. */
export const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

/** "Sadar, Gazipur, Dhaka" from a biodata address (permanent or present). */
export function place(address, which, lang) {
  if (!address) return '';
  if (which === 'present' && address.livesAbroad) {
    return [address.presentArea, label('country', address.presentCountry, lang)].filter(Boolean).join(', ');
  }
  const p = which === 'present' ? 'present' : 'permanent';
  return [
    address[`${p}Area`],
    label('upazila', address[`${p}Upazila`], lang),
    label('district', address[`${p}District`], lang),
    label('division', address[`${p}Division`], lang),
  ]
    .filter((v, i, all) => v && all.indexOf(v) === i) // "Dhaka, Dhaka" → "Dhaka"
    .join(', ');
}

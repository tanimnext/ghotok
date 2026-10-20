// Bangladeshi mobile numbers: 01[3-9]XXXXXXXX, optionally prefixed with +88 / 88.
// Bangla digits are accepted and converted.
const BD_MOBILE = /^(?:\+?88)?(01[3-9]\d{8})$/;
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

export function normalizeBdPhone(input) {
  if (input === undefined || input === null) return null;
  const s = String(input)
    .replace(/[\s()-]/g, '')
    .replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
  const m = s.match(BD_MOBILE);
  return m ? m[1] : null;
}

export const isBdPhone = (s) => normalizeBdPhone(s) !== null;

/** 017XXXXXXXX → 017••••••XX (for showing a phone without revealing it). */
export const maskPhone = (p) => (p ? `${p.slice(0, 3)}••••••${p.slice(-2)}` : '');

/**
 * Mobile-wallet account numbers. bKash and Nagad use the plain mobile number;
 * a Rocket account is the mobile number followed by one check digit (12 digits).
 */
export function normalizeWalletNumber(method, input) {
  if (method !== 'rocket') return normalizeBdPhone(input);
  if (input === undefined || input === null) return null;
  const s = String(input)
    .replace(/[\s()-]/g, '')
    .replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)))
    .replace(/^\+?88(?=01)/, '');
  return /^01[3-9]\d{8,9}$/.test(s) ? s : null;
}

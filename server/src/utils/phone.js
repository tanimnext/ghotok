// Bangladeshi mobile numbers: 01[3-9]XXXXXXXX, optionally with +88 / 88.
const BD_MOBILE = /^(?:\+?88)?(01[3-9]\d{8})$/;

export function normalizeBdPhone(input) {
  if (!input) return null;
  const digits = String(input).replace(/[\s-]/g, '').replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d));
  const m = digits.match(BD_MOBILE);
  return m ? m[1] : null;
}

export const isBdPhone = (s) => normalizeBdPhone(s) !== null;

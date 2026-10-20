/** Helpers shared by the admin routes. */
export const USER_BRIEF = 'name email phone role status connections createdAt';

const cell = (v) => {
  if (v === null || v === undefined) return '';
  const s = v instanceof Date ? v.toISOString() : String(v);
  // Quote when needed and neutralise spreadsheet formulas (CSV injection).
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** Rows of plain values → CSV text with a header line (UTF-8 BOM so Excel shows Bangla correctly). */
export function toCsv(columns, rows) {
  const head = columns.map((c) => cell(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => cell(c.value(r))).join(','));
  return `\uFEFF${[head, ...body].join('\r\n')}\r\n`;
}

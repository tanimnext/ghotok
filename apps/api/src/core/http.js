/**
 * HTTP primitives: a typed application error, an async wrapper and paging helpers.
 * Errors carry a stable `code` (see @ghotok/shared ERRORS) so clients can localise them.
 */
export class AppError extends Error {
  /**
   * @param {number} status HTTP status
   * @param {string} code   stable error code, e.g. 'BIODATA_NOT_FOUND'
   * @param {Record<string,string>} [fields] field path → field error code
   */
  constructor(status, code, fields) {
    super(code);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const badRequest = (code = 'BAD_REQUEST', fields) => new AppError(400, code, fields);
export const unauthorized = (code = 'UNAUTHORIZED') => new AppError(401, code);
export const forbidden = (code = 'FORBIDDEN') => new AppError(403, code);
export const notFound = (code = 'NOT_FOUND') => new AppError(404, code);
export const conflict = (code = 'CONFLICT', fields) => new AppError(409, code, fields);
export const validationError = (fields) => new AppError(400, 'VALIDATION', fields);

/** Wrap an async handler so rejections reach the error middleware. */
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** page/limit query params with bounds. */
export function paging(query = {}, defLimit = 20, maxLimit = 100) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export const pageMeta = (total, page, limit) => ({ total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });

export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Comma-separated query value → array. */
export const csv = (v) =>
  v === undefined || v === null || v === ''
    ? []
    : (Array.isArray(v) ? v : String(v).split(',')).map((s) => String(s).trim()).filter(Boolean);

/** Current calendar day in Bangladesh (UTC+6), e.g. '2026-10-21'. */
export const dhakaDay = (offsetDays = 0) =>
  new Date(Date.now() + 6 * 3600 * 1000 - offsetDays * 86400000).toISOString().slice(0, 10);

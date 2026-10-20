export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (msg = 'Bad request', details) => new HttpError(400, msg, details);
export const unauthorized = (msg = 'Please log in') => new HttpError(401, msg);
export const forbidden = (msg = 'You do not have permission to do this') => new HttpError(403, msg);
export const notFound = (msg = 'Not found') => new HttpError(404, msg);
export const conflict = (msg = 'Conflict') => new HttpError(409, msg);

/** Wrap an async route handler so rejected promises reach the error middleware. */
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Parse `data` with a zod schema or throw a 400 with field errors. */
export function parse(schema, data) {
  const r = schema.safeParse(data);
  if (!r.success) {
    const fields = {};
    for (const issue of r.error.issues) {
      const key = issue.path.join('.') || '_';
      if (!fields[key]) fields[key] = issue.message;
    }
    throw badRequest('Please check the highlighted fields', fields);
  }
  return r.data;
}

/** Read page/limit query params with sane bounds. */
export function paging(query, defLimit = 20, maxLimit = 100) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export const pageMeta = (total, page, limit) => ({ total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });

export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

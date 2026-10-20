import multer from 'multer';
import { errorMessage, fieldErrorMessage } from '@ghotok/shared';
import { AppError } from '../core/http.js';
import { logger } from '../config/logger.js';

/** Pick the response language from `X-Lang` or `Accept-Language`. */
export function requestLang(req) {
  const h = String(req.headers['x-lang'] || req.headers['accept-language'] || '').toLowerCase();
  return h.startsWith('bn') ? 'bn' : 'en';
}

function send(res, req, status, code, fieldCodes) {
  const lang = requestLang(req);
  const body = { error: errorMessage(code, lang), code };
  if (fieldCodes && Object.keys(fieldCodes).length) {
    body.fieldCodes = fieldCodes;
    body.fields = Object.fromEntries(
      Object.entries(fieldCodes).map(([k, c]) => [k, fieldErrorMessage(String(c).split(':').pop(), lang)])
    );
  }
  res.status(status).json(body);
}

export function notFoundHandler(req, res) {
  send(res, req, 404, 'ROUTE_NOT_FOUND');
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) return send(res, req, err.status, err.code, err.fields);
  if (err instanceof multer.MulterError)
    return send(res, req, 400, err.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'BAD_REQUEST');
  if (err?.type === 'entity.parse.failed') return send(res, req, 400, 'BAD_REQUEST');
  if (err?.name === 'ValidationError') {
    const fields = Object.fromEntries(
      Object.entries(err.errors).map(([k, v]) => [
        k,
        v.kind === 'enum' ? 'invalid_choice' : v.kind === 'required' ? 'required' : 'invalid',
      ])
    );
    return send(res, req, 400, 'VALIDATION', fields);
  }
  if (err?.name === 'CastError') return send(res, req, 400, 'INVALID_ID');
  if (err?.code === 11000) return send(res, req, 409, 'CONFLICT');
  (req.log || logger).error({ err }, 'Unhandled error');
  send(res, req, 500, 'INTERNAL');
}

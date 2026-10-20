/**
 * A thin wrapper around express.Router that also records every route in a
 * registry (every router is mounted at /api and owns its full path), so the OpenAPI document (/api/docs) is generated from the code and
 * can never drift from it.
 *
 *   const r = createRouter({ prefix: '/biodatas', tag: 'Biodatas' });
 *   r.get('/:no', { summary: 'Public biodata', auth: 'optional' }, handler);
 *
 * Route spec:
 *   summary   one-line description (required)
 *   auth      'required' | 'optional' (default: none)
 *   role      minimum staff role: 'support' | 'admin' | 'superadmin' (implies auth)
 *   body      zod schema → validated into req.valid.body
 *   query     zod schema → validated into req.valid.query
 *   upload    multipart field name for a single file (req.file)
 *   limit     extra express middleware such as a rate limiter
 *
 * `defaults` are merged into every route spec, e.g. { auth: 'required' } for /me.
 */
import express from 'express';
import { ah } from './http.js';
import { validate } from './validate.js';
import { requireAuth, optionalAuth, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

export const registry = [];

export function createRouter({ prefix = '', tag, defaults = {} }) {
  const router = express.Router();
  const api = { router };
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    api[method] = (path, routeSpec, ...handlers) => {
      const spec = { ...defaults, ...routeSpec };
      const fullPath = path === '/' && prefix ? prefix : `${prefix}${path}`;
      if (!spec?.summary) throw new Error(`Route ${method.toUpperCase()} ${fullPath} needs a summary`);
      registry.push({ method, path: fullPath, tag, ...spec });
      const mw = [];
      if (spec.limit) mw.push(spec.limit);
      if (spec.role || spec.auth === 'required') mw.push(requireAuth);
      else if (spec.auth === 'optional') mw.push(optionalAuth);
      if (spec.role) mw.push(requireRole(spec.role));
      if (spec.upload) mw.push(upload.single(spec.upload));
      if (spec.query) mw.push(validate('query', spec.query));
      if (spec.body) mw.push(validate('body', spec.body));
      router[method](fullPath, ...mw, ...handlers.map((h) => ah(h)));
    };
  }
  return api;
}

/**
 * Express application: security middleware, request logging, every module's routes,
 * health checks and the generated API documentation at /api/docs.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import crypto from 'node:crypto';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { dbReady } from './config/db.js';
import { limiter } from './core/limits.js';
import { buildOpenApi, docsHtml, docsInitJs, DOCS_CSP } from './core/openapi.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

import authRoutes from './modules/auth/auth.routes.js';
import publicBiodataRoutes from './modules/biodata/public.routes.js';
import ownerBiodataRoutes from './modules/biodata/owner.routes.js';
import interactionRoutes from './modules/interactions/interactions.routes.js';
import billingRoutes from './modules/billing/billing.routes.js';
import supportRoutes from './modules/support/support.routes.js';
import contentRoutes from './modules/content/content.routes.js';
import fileRoutes from './modules/files/files.routes.js';
import adminOverviewRoutes from './modules/admin/overview.routes.js';
import adminBiodataRoutes from './modules/admin/biodatas.routes.js';
import adminBillingRoutes from './modules/admin/billing.routes.js';
import adminSupportRoutes from './modules/admin/support.routes.js';
import adminUserRoutes from './modules/admin/users.routes.js';
import adminContentRoutes from './modules/admin/content.routes.js';

/** Route modules in mount order. Each one declares its own path prefix. */
export const ROUTE_MODULES = [
  authRoutes,
  publicBiodataRoutes,
  ownerBiodataRoutes,
  interactionRoutes,
  billingRoutes,
  supportRoutes,
  contentRoutes,
  fileRoutes,
  adminOverviewRoutes,
  adminBiodataRoutes,
  adminBillingRoutes,
  adminSupportRoutes,
  adminUserRoutes,
  adminContentRoutes,
];

export function createApp() {
  const app = express();
  app.set('trust proxy', env.trustProxy);
  app.disable('x-powered-by');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(
    cors({
      origin(origin, cb) {
        cb(null, !origin || env.corsOrigins.includes(origin));
      },
      exposedHeaders: ['Content-Disposition'],
      maxAge: 600,
    })
  );
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = req.headers['x-request-id'] || crypto.randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url === '/api/health' },
      // Keep access logs small: no headers (they hold tokens and cookies) and no bodies.
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
      customLogLevel: (_req, res, err) =>
        err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
    })
  );
  app.use(express.json({ limit: '200kb' }));
  app.use('/api', limiter(1, 300)); // global safety net; sensitive routes have tighter limits

  app.get('/api/health', (_req, res) => {
    const ok = dbReady();
    res.status(ok ? 200 : 503).json({ ok, db: ok ? 'up' : 'down', time: new Date().toISOString() });
  });

  // API documentation generated from the route registry.
  app.get('/api/docs/openapi.json', (_req, res) => res.json(buildOpenApi({ serverUrl: env.apiPublicUrl })));
  app.get('/api/docs/init.js', (_req, res) => res.type('application/javascript').send(docsInitJs));
  app.get('/api/docs', (_req, res) => res.set('Content-Security-Policy', DOCS_CSP).type('html').send(docsHtml));

  for (const router of ROUTE_MODULES) app.use('/api', router);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

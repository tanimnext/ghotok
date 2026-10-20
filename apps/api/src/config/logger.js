import pino from 'pino';
import { env } from './env.js';

/** Structured JSON logger. Secrets in headers and bodies are redacted. */
export const logger = pino({
  level: env.logLevel,
  base: { service: 'ghotok-api' },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.secretHash',
    ],
    censor: '[redacted]',
  },
});

import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { errorMessage } from '@ghotok/shared';
import { requestLang } from '../middleware/error.js';

/** Rate limiter factory. Limits are relaxed in tests so suites can run many requests. */
export const limiter = (windowMinutes, max) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: env.isTest ? max * 100 : max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({ error: errorMessage('RATE_LIMITED', requestLang(req)), code: 'RATE_LIMITED' }),
  });

export const authLimiter = limiter(15, 30);
export const otpLimiter = limiter(60, 10);
export const contactLimiter = limiter(60, 5);

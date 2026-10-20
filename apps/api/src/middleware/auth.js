import jwt from 'jsonwebtoken';
import { hasRole } from '@ghotok/shared';
import { env } from '../config/env.js';
import { User } from '../modules/auth/user.model.js';
import { unauthorized, forbidden } from '../core/http.js';

export function signToken(user) {
  return jwt.sign({ sub: String(user._id), tv: user.tokenVersion || 0 }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

async function userFromRequest(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return null;
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    return null;
  }
  const user = await User.findById(payload.sub);
  if (!user || (user.tokenVersion || 0) !== (payload.tv || 0)) return null;
  return user;
}

/** Attach req.user when a valid token of an active account is present; never fails. */
export async function optionalAuth(req, _res, next) {
  try {
    const user = await userFromRequest(req);
    if (user?.status === 'active') req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}

export async function requireAuth(req, _res, next) {
  try {
    if (req.user) return next();
    const user = await userFromRequest(req);
    if (!user) return next(unauthorized());
    if (user.status === 'suspended') return next(forbidden('ACCOUNT_SUSPENDED'));
    if (user.status === 'deleted') return next(unauthorized('ACCOUNT_DELETED'));
    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}

/** Require a staff role at or above `min` (support < admin < superadmin). */
export const requireRole = (min) => (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (!hasRole(req.user.role, min)) return next(forbidden());
  next();
};

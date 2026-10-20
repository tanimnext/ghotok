import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { unauthorized, forbidden } from '../utils/http.js';

const RANK = { user: 0, support: 1, admin: 2, superadmin: 3 };

export function signToken(user) {
  return jwt.sign({ sub: String(user._id), tv: user.tokenVersion || 0 }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
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

/** Attach req.user when a valid token is present; never fails. */
export async function optionalAuth(req, _res, next) {
  try {
    const user = await userFromRequest(req);
    if (user && user.status === 'active') req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}

export async function requireAuth(req, _res, next) {
  try {
    const user = await userFromRequest(req);
    if (!user) return next(unauthorized());
    if (user.status !== 'active') return next(forbidden('Your account is suspended. Please contact support.'));
    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}

/** Require a staff role at or above `min` (support < admin < superadmin). */
export const requireRole = (min) => (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if ((RANK[req.user.role] ?? 0) < RANK[min]) return next(forbidden());
  next();
};

export const hasRole = (user, min) => (RANK[user?.role] ?? 0) >= RANK[min];

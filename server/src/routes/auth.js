import { Router } from 'express';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { User } from '../models/User.js';
import { ah, parse, badRequest, unauthorized, conflict, forbidden } from '../utils/http.js';
import { normalizeBdPhone } from '../utils/phone.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { sendMail } from '../services/mailer.js';
import { env } from '../config/env.js';

const r = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });

const password = z.string().min(8, 'At least 8 characters').max(128);

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your name').max(80),
    email: z.string().trim().toLowerCase().email('Enter a valid email').optional().or(z.literal('')),
    phone: z.string().trim().optional().or(z.literal('')),
    password,
    gender: z.enum(['male', 'female']),
    preferredLang: z.enum(['en', 'bn']).optional(),
  })
  .refine((d) => d.email || d.phone, { message: 'Enter an email or mobile number', path: ['email'] });

r.post(
  '/register',
  limiter,
  ah(async (req, res) => {
    const d = parse(registerSchema, req.body);
    let phone = null;
    if (d.phone) {
      phone = normalizeBdPhone(d.phone);
      if (!phone) throw badRequest('Please check the highlighted fields', { phone: 'Enter a valid Bangladeshi mobile number' });
    }
    if (d.email && (await User.exists({ email: d.email }))) throw conflict('An account with this email already exists');
    if (phone && (await User.exists({ phone }))) throw conflict('An account with this mobile number already exists');
    const user = new User({ name: d.name, email: d.email || undefined, phone: phone || undefined, gender: d.gender, preferredLang: d.preferredLang });
    await user.setPassword(d.password);
    await user.save();
    res.status(201).json({ token: signToken(user), user: user.toSafe() });
  })
);

const loginSchema = z.object({ identifier: z.string().trim().min(3), password: z.string().min(1) });

async function findByIdentifier(identifier, withSecret = false) {
  const phone = normalizeBdPhone(identifier);
  const q = phone ? { phone } : { email: identifier.toLowerCase() };
  return User.findOne(q).select(withSecret ? '+passwordHash' : '');
}

r.post(
  '/login',
  limiter,
  ah(async (req, res) => {
    const d = parse(loginSchema, req.body);
    const user = await findByIdentifier(d.identifier, true);
    if (!user || !(await user.checkPassword(d.password))) throw unauthorized('Wrong email/mobile or password');
    if (user.status !== 'active') throw forbidden('Your account is suspended. Please contact support.');
    user.lastLoginAt = new Date();
    await user.save();
    res.json({ token: signToken(user), user: user.toSafe() });
  })
);

r.get('/me', requireAuth, (req, res) => res.json({ user: req.user.toSafe() }));

r.patch(
  '/me',
  requireAuth,
  ah(async (req, res) => {
    const d = parse(z.object({ name: z.string().trim().min(2).max(80).optional(), preferredLang: z.enum(['en', 'bn']).optional() }), req.body);
    Object.assign(req.user, d);
    await req.user.save();
    res.json({ user: req.user.toSafe() });
  })
);

r.post(
  '/change-password',
  requireAuth,
  ah(async (req, res) => {
    const d = parse(z.object({ current: z.string().min(1), next: password }), req.body);
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!(await user.checkPassword(d.current))) throw badRequest('Please check the highlighted fields', { current: 'Current password is wrong' });
    await user.setPassword(d.next);
    user.tokenVersion = (user.tokenVersion || 0) + 1; // sign out other devices
    await user.save();
    res.json({ token: signToken(user) });
  })
);

r.post(
  '/forgot-password',
  limiter,
  ah(async (req, res) => {
    const d = parse(z.object({ email: z.string().trim().toLowerCase().email() }), req.body);
    const user = await User.findOne({ email: d.email });
    if (user) {
      const raw = crypto.randomBytes(32).toString('hex');
      user.resetTokenHash = crypto.createHash('sha256').update(raw).digest('hex');
      user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      const link = `${env.webUrl}/reset-password?token=${raw}`;
      await sendMail({
        to: user.email,
        subject: 'Reset your Ghotok password',
        text: `Hello ${user.name},\n\nOpen this link within one hour to set a new password:\n${link}\n\nIf you did not ask for this, ignore this email.\n\nGhotok`,
      });
    }
    // Same answer whether or not the email exists.
    res.json({ ok: true });
  })
);

r.post(
  '/reset-password',
  limiter,
  ah(async (req, res) => {
    const d = parse(z.object({ token: z.string().length(64), password }), req.body);
    const hash = crypto.createHash('sha256').update(d.token).digest('hex');
    const user = await User.findOne({ resetTokenHash: hash, resetTokenExpires: { $gt: new Date() } }).select('+resetTokenHash +resetTokenExpires');
    if (!user) throw badRequest('This reset link is invalid or has expired');
    await user.setPassword(d.password);
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    res.json({ token: signToken(user), user: user.toSafe() });
  })
);

r.post(
  '/logout-all',
  requireAuth,
  ah(async (req, res) => {
    req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
    await req.user.save();
    res.json({ ok: true });
  })
);

export default r;

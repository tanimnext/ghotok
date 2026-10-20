import { z } from 'zod';
import { createRouter } from '../../core/router.js';
import { authLimiter, otpLimiter } from '../../core/limits.js';
import { requestLang } from '../../middleware/error.js';
import { googleEnabled } from './google.js';
import { env } from '../../config/env.js';
import * as auth from './auth.service.js';

const r = createRouter({ prefix: '/auth', tag: 'Auth' });

const password = z.string().min(8).max(128);
const lang = z.enum(['en', 'bn']).optional();

r.post(
  '/register',
  {
    summary: 'Create an account with email and/or a Bangladeshi mobile number',
    limit: authLimiter,
    body: z
      .object({
        name: z.string().trim().min(2).max(80),
        email: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
        phone: z.string().trim().optional().or(z.literal('')),
        password,
        gender: z.enum(['male', 'female']),
        preferredLang: lang,
      })
      .refine((d) => d.email || d.phone, { path: ['email'], params: { code: 'required' } }),
  },
  async (req, res) => {
    const user = await auth.register(req.valid.body);
    res.status(201).json(auth.session(user));
  }
);

r.post(
  '/login',
  {
    summary: 'Log in with email or mobile number and password',
    limit: authLimiter,
    body: z.object({ identifier: z.string().trim().min(3), password: z.string().min(1) }),
  },
  async (req, res) => {
    const user = await auth.login(req.valid.body.identifier, req.valid.body.password);
    res.json(auth.session(user));
  }
);

r.get('/config', { summary: 'Which sign-in methods are enabled' }, (_req, res) => {
  res.json({ google: googleEnabled() ? { clientId: env.googleClientId } : null, phoneOtp: true });
});

r.post(
  '/google',
  {
    summary: 'Sign in or sign up with a Google ID token. New users must also send gender.',
    limit: authLimiter,
    body: z.object({
      credential: z.string().min(10),
      gender: z.enum(['male', 'female']).optional(),
      preferredLang: lang,
    }),
  },
  async (req, res) => {
    const out = await auth.googleSignIn(req.valid.body);
    if (out.needsGender) return res.status(202).json(out);
    res.json(auth.session(out.user));
  }
);

r.get('/me', { summary: 'Current user', auth: 'required' }, (req, res) => res.json({ user: req.user.toSafe() }));

r.patch(
  '/me',
  {
    summary: 'Update name or preferred language',
    auth: 'required',
    body: z.object({ name: z.string().trim().min(2).max(80).optional(), preferredLang: lang }),
  },
  async (req, res) => {
    Object.assign(req.user, req.valid.body);
    await req.user.save();
    res.json({ user: req.user.toSafe() });
  }
);

r.post(
  '/change-password',
  {
    summary: 'Change password (signs out other devices)',
    auth: 'required',
    body: z.object({ current: z.string().default(''), next: password }),
  },
  async (req, res) => {
    const user = await auth.changePassword(req.user._id, req.valid.body.current, req.valid.body.next);
    res.json(auth.session(user));
  }
);

r.post('/logout-all', { summary: 'Sign out of every device', auth: 'required' }, async (req, res) => {
  req.user.revokeTokens();
  await req.user.save();
  res.json({ ok: true });
});

r.post(
  '/forgot-password',
  {
    summary: 'Send a reset link (email) or a 6-digit code (mobile)',
    limit: otpLimiter,
    body: z.object({ identifier: z.string().trim().min(3) }),
  },
  async (req, res) => {
    await auth.forgotPassword(req.valid.body.identifier, requestLang(req));
    res.json({ ok: true }); // same answer whether or not the account exists
  }
);

r.post(
  '/reset-password',
  {
    summary: 'Set a new password with an email token, or a phone + SMS code',
    limit: authLimiter,
    body: z.object({
      token: z.string().length(64).optional(),
      phone: z.string().optional(),
      code: z
        .string()
        .regex(/^\d{6}$/)
        .optional(),
      password,
    }),
  },
  async (req, res) => {
    const user = await auth.resetPassword(req.valid.body);
    res.json(auth.session(user));
  }
);

r.post(
  '/email/send-verification',
  { summary: 'Email a verification link', auth: 'required', limit: otpLimiter },
  async (req, res) => {
    await auth.sendEmailVerification(req.user);
    res.json({ ok: true });
  }
);

r.post(
  '/email/verify',
  { summary: 'Verify an email with the token from the link', body: z.object({ token: z.string().length(64) }) },
  async (req, res) => {
    const user = await auth.verifyEmail(req.valid.body.token);
    res.json({ user: user.toSafe() });
  }
);

r.post(
  '/phone/send-code',
  {
    summary: 'Send an SMS code to verify the account phone (or a new phone)',
    auth: 'required',
    limit: otpLimiter,
    body: z.object({ phone: z.string().optional() }),
  },
  async (req, res) => {
    const phone = await auth.sendPhoneCode(req.user, req.valid.body.phone);
    res.json({ ok: true, phone });
  }
);

r.post(
  '/phone/verify',
  {
    summary: 'Confirm the SMS code',
    auth: 'required',
    limit: authLimiter,
    body: z.object({ phone: z.string().optional(), code: z.string().regex(/^\d{6}$/) }),
  },
  async (req, res) => {
    const user = await auth.verifyPhone(req.user, req.valid.body);
    res.json({ user: user.toSafe() });
  }
);

r.post(
  '/delete-account',
  {
    summary: 'Delete my account (biodata is removed; payment records are kept)',
    auth: 'required',
    body: z.object({ password: z.string().optional(), reason: z.string().trim().max(300).optional() }),
  },
  async (req, res) => {
    await auth.deleteAccount(req.user._id, req.valid.body);
    res.json({ ok: true });
  }
);

export default r.router;

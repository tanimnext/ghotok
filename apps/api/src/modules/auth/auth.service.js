import crypto from 'node:crypto';
import { normalizeBdPhone } from '@ghotok/shared';
import { User } from './user.model.js';
import { AuthToken } from './token.model.js';
import { verifyGoogleCredential, googleEnabled } from './google.js';
import { signToken } from '../../middleware/auth.js';
import { sendMail } from '../../services/mailer.js';
import { sendSms } from '../../services/sms.js';
import { env } from '../../config/env.js';
import { badRequest, conflict, forbidden, unauthorized, validationError } from '../../core/http.js';
import { Biodata } from '../biodata/biodata.model.js';
import { syncVerification, withdrawProposalsFor } from '../biodata/biodata.service.js';

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const LINK_TTL_MS = 60 * 60 * 1000;

export const session = (user) => ({ token: signToken(user), user: user.toSafe() });

function assertActive(user) {
  if (user.status === 'suspended') throw forbidden('ACCOUNT_SUSPENDED');
  if (user.status === 'deleted') throw unauthorized('ACCOUNT_DELETED');
}

export async function register({ name, email, phone, password, gender, preferredLang }) {
  let normalizedPhone;
  if (phone) {
    normalizedPhone = normalizeBdPhone(phone);
    if (!normalizedPhone) throw validationError({ phone: 'invalid_phone' });
  }
  if (email && (await User.exists({ email }))) throw conflict('EMAIL_TAKEN');
  if (normalizedPhone && (await User.exists({ phone: normalizedPhone }))) throw conflict('PHONE_TAKEN');
  const user = new User({ name, email: email || undefined, phone: normalizedPhone, gender, preferredLang });
  await user.setPassword(password);
  await user.save();
  if (user.email) await sendEmailVerification(user);
  return user;
}

export async function findByIdentifier(identifier, { withSecret = false } = {}) {
  const phone = normalizeBdPhone(identifier);
  const q = phone ? { phone } : { email: String(identifier).trim().toLowerCase() };
  return User.findOne(q).select(withSecret ? '+passwordHash' : '');
}

export async function login(identifier, password) {
  const user = await findByIdentifier(identifier, { withSecret: true });
  if (!user || !(await user.checkPassword(password))) throw unauthorized('INVALID_CREDENTIALS');
  assertActive(user);
  user.lastLoginAt = new Date();
  await user.save();
  return user;
}

// ---------- Email verification ----------
export async function sendEmailVerification(user) {
  if (!user.email) throw badRequest('NO_EMAIL');
  const raw = crypto.randomBytes(32).toString('hex');
  await AuthToken.deleteMany({ user: user._id, purpose: 'email_verify' });
  await AuthToken.create({
    user: user._id,
    purpose: 'email_verify',
    target: user.email,
    secretHash: sha(raw),
    expiresAt: new Date(Date.now() + 24 * LINK_TTL_MS),
  });
  const bn = user.preferredLang === 'bn';
  await sendMail({
    to: user.email,
    subject: bn ? 'ঘটক: আপনার ইমেইল যাচাই করুন' : 'Ghotok: verify your email',
    text: bn
      ? `${user.name},\n\nইমেইল যাচাই করতে এই লিংকে যান (২৪ ঘণ্টা বৈধ):\n${env.webUrl}/verify-email?token=${raw}\n\nঘটক`
      : `Hello ${user.name},\n\nOpen this link within 24 hours to verify your email:\n${env.webUrl}/verify-email?token=${raw}\n\nGhotok`,
  });
}

export async function verifyEmail(raw) {
  const t = await AuthToken.findOne({ purpose: 'email_verify', secretHash: sha(raw), expiresAt: { $gt: new Date() } });
  if (!t) throw badRequest('RESET_INVALID');
  const user = await User.findById(t.user);
  if (!user || user.email !== t.target) throw badRequest('RESET_INVALID');
  user.emailVerifiedAt = new Date();
  await user.save();
  await t.deleteOne();
  await syncVerification(user._id);
  return user;
}

// ---------- SMS one-time codes ----------
async function issueCode({ user, phone, purpose, lang }) {
  const recent = await AuthToken.findOne({
    purpose,
    target: phone,
    createdAt: { $gt: new Date(Date.now() - OTP_RESEND_MS) },
  });
  if (recent) throw badRequest('OTP_TOO_SOON');
  const code = String(crypto.randomInt(100000, 1000000));
  await AuthToken.deleteMany({ purpose, target: phone });
  await AuthToken.create({
    user: user?._id,
    purpose,
    target: phone,
    secretHash: sha(`${phone}:${code}`),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });
  await sendSms(
    phone,
    lang === 'bn'
      ? `ঘটক যাচাই কোড: ${code}। ১০ মিনিট বৈধ। কাউকে জানাবেন না।`
      : `Ghotok code: ${code}. Valid for 10 minutes. Do not share it.`
  );
}

async function consumeCode({ phone, purpose, code }) {
  const t = await AuthToken.findOne({ purpose, target: phone, expiresAt: { $gt: new Date() } });
  if (!t) throw badRequest('OTP_INVALID');
  if (t.attempts >= OTP_MAX_ATTEMPTS) throw badRequest('OTP_TOO_MANY');
  if (t.secretHash !== sha(`${phone}:${code}`)) {
    t.attempts += 1;
    await t.save();
    throw badRequest(t.attempts >= OTP_MAX_ATTEMPTS ? 'OTP_TOO_MANY' : 'OTP_INVALID');
  }
  await t.deleteOne();
  return t;
}

/** Send a code to verify the account's phone, or a new phone the user wants to switch to. */
export async function sendPhoneCode(user, newPhone) {
  let phone = user.phone;
  if (newPhone) {
    phone = normalizeBdPhone(newPhone);
    if (!phone) throw validationError({ phone: 'invalid_phone' });
    if (phone !== user.phone && (await User.exists({ phone }))) throw conflict('PHONE_TAKEN');
  }
  if (!phone) throw badRequest('NO_PHONE');
  await issueCode({ user, phone, purpose: 'phone_verify', lang: user.preferredLang });
  return phone;
}

export async function verifyPhone(user, { phone: rawPhone, code }) {
  const phone = rawPhone ? normalizeBdPhone(rawPhone) : user.phone;
  if (!phone) throw badRequest('NO_PHONE');
  const t = await consumeCode({ phone, purpose: 'phone_verify', code });
  if (String(t.user) !== String(user._id)) throw badRequest('OTP_INVALID');
  if (phone !== user.phone && (await User.exists({ phone, _id: { $ne: user._id } }))) throw conflict('PHONE_TAKEN');
  user.phone = phone;
  user.phoneVerifiedAt = new Date();
  await user.save();
  await syncVerification(user._id);
  return user;
}

// ---------- Password reset (email link or SMS code) ----------
export async function forgotPassword(identifier, lang) {
  const user = await findByIdentifier(identifier);
  if (!user || user.status !== 'active') return; // same response either way
  const phone = normalizeBdPhone(identifier);
  if (phone) {
    await issueCode({ user, phone, purpose: 'phone_reset', lang: lang || user.preferredLang });
    return;
  }
  const raw = crypto.randomBytes(32).toString('hex');
  await AuthToken.deleteMany({ user: user._id, purpose: 'password_reset' });
  await AuthToken.create({
    user: user._id,
    purpose: 'password_reset',
    target: user.email,
    secretHash: sha(raw),
    expiresAt: new Date(Date.now() + LINK_TTL_MS),
  });
  const bn = (lang || user.preferredLang) === 'bn';
  await sendMail({
    to: user.email,
    subject: bn ? 'ঘটক: পাসওয়ার্ড রিসেট' : 'Reset your Ghotok password',
    text: bn
      ? `${user.name},\n\nএক ঘণ্টার মধ্যে এই লিংকে গিয়ে নতুন পাসওয়ার্ড দিন:\n${env.webUrl}/reset-password?token=${raw}\n\nআপনি অনুরোধ না করে থাকলে এই ইমেইলটি উপেক্ষা করুন।`
      : `Hello ${user.name},\n\nOpen this link within one hour to set a new password:\n${env.webUrl}/reset-password?token=${raw}\n\nIf you did not ask for this, ignore this email.`,
  });
}

export async function resetPassword({ token, phone: rawPhone, code, password }) {
  let user;
  if (token) {
    const t = await AuthToken.findOne({
      purpose: 'password_reset',
      secretHash: sha(token),
      expiresAt: { $gt: new Date() },
    });
    if (!t) throw badRequest('RESET_INVALID');
    user = await User.findById(t.user);
    await t.deleteOne();
    if (user && !user.emailVerifiedAt && user.email === t.target) user.emailVerifiedAt = new Date(); // the link proves ownership
  } else {
    const phone = normalizeBdPhone(rawPhone);
    if (!phone || !code) throw badRequest('OTP_INVALID');
    const t = await consumeCode({ phone, purpose: 'phone_reset', code });
    user = await User.findById(t.user);
    if (user && user.phone === phone && !user.phoneVerifiedAt) user.phoneVerifiedAt = new Date();
  }
  if (!user || user.status !== 'active') throw badRequest('RESET_INVALID');
  await user.setPassword(password);
  user.revokeTokens();
  await user.save();
  await syncVerification(user._id);
  return user;
}

export async function changePassword(userId, current, next) {
  const user = await User.findById(userId).select('+passwordHash');
  if (user.passwordHash && !(await user.checkPassword(current))) throw validationError({ current: 'wrong_password' });
  await user.setPassword(next);
  user.revokeTokens();
  await user.save();
  return user;
}

// ---------- Google ----------
export async function googleSignIn({ credential, gender, preferredLang }) {
  if (!googleEnabled()) throw badRequest('GOOGLE_DISABLED');
  let g;
  try {
    g = await verifyGoogleCredential(credential);
  } catch {
    throw unauthorized('GOOGLE_INVALID');
  }
  if (!g?.sub) throw unauthorized('GOOGLE_INVALID');
  let user = await User.findOne({ googleId: g.sub });
  if (!user && g.email && g.emailVerified) {
    user = await User.findOne({ email: g.email.toLowerCase() });
    if (user) {
      user.googleId = g.sub;
      user.emailVerifiedAt ||= new Date();
    }
  }
  if (!user) {
    // New account: Google does not give us the gender, so ask once.
    if (!gender) return { needsGender: true, name: g.name, email: g.email };
    user = new User({
      name: g.name || g.email?.split('@')[0] || 'Ghotok user',
      email: g.emailVerified ? g.email.toLowerCase() : undefined,
      emailVerifiedAt: g.emailVerified ? new Date() : undefined,
      googleId: g.sub,
      gender,
      preferredLang,
    });
  }
  assertActive(user);
  user.lastLoginAt = new Date();
  await user.save();
  await syncVerification(user._id);
  return { user };
}

// ---------- Account deletion ----------
export async function deleteAccount(userId, { password, reason }) {
  const user = await User.findById(userId).select('+passwordHash +formerEmail +formerPhone');
  if (user.passwordHash && !(await user.checkPassword(password || '')))
    throw validationError({ password: 'wrong_password' });
  // Keep records needed for payments, refunds and abuse reports, but free the login identifiers.
  user.formerEmail = user.email;
  user.formerPhone = user.phone;
  user.email = undefined;
  user.phone = undefined;
  user.status = 'deleted';
  user.deletedAt = new Date();
  user.deleteReason = reason;
  user.revokeTokens();
  await user.save();
  const b = await Biodata.findOneAndUpdate(
    { owner: user._id, deletedAt: null },
    { deletedAt: new Date(), deleteReason: 'account_deleted', hidden: true }
  );
  if (b) await withdrawProposalsFor(b._id);
}

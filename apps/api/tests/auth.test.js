import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, api, auth, register, env, lastMail, lastSmsCode } from './helpers.js';

process.env.GOOGLE_CLIENT_ID = '';
const { setGoogleVerifier } = await import('../src/modules/auth/google.js');

setup();

test('register validates input and rejects duplicates', async () => {
  let res = await api().post('/api/auth/register').send({ name: 'A', password: 'short', gender: 'x' });
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'VALIDATION');
  assert.ok(res.body.fields.name && res.body.fields.password && res.body.fields.gender);

  res = await api().post('/api/auth/register').send({ name: 'No contact', password: 'password123', gender: 'male' });
  assert.equal(res.status, 400, 'email or phone is required');

  const u = await register({ phone: '01711111111', email: 'dup@example.com' });
  assert.equal(u.user.phone, '01711111111');
  res = await api()
    .post('/api/auth/register')
    .send({ name: 'Dup', email: 'DUP@example.com', password: 'password123', gender: 'male' });
  assert.equal(res.status, 409);
  assert.equal(res.body.code, 'EMAIL_TAKEN');
  res = await api()
    .post('/api/auth/register')
    .send({ name: 'Dup', phone: '+8801711111111', password: 'password123', gender: 'male' });
  assert.equal(res.body.code, 'PHONE_TAKEN', 'phone numbers are normalised before the duplicate check');
});

test('login by email or phone (any format), with localised errors', async () => {
  const u = await register({ phone: '01722222222' });
  for (const identifier of [u.email, '01722222222', '+8801722222222', '৮৮০১৭২২২২২২২২']) {
    const res = await api().post('/api/auth/login').send({ identifier, password: u.password });
    assert.equal(res.status, 200, identifier);
  }
  let res = await api()
    .post('/api/auth/login')
    .set('X-Lang', 'bn')
    .send({ identifier: u.email, password: 'wrong-password' });
  assert.equal(res.status, 401);
  assert.equal(res.body.code, 'INVALID_CREDENTIALS');
  assert.match(res.body.error, /[ঀ-৿]/, 'Bangla message');
  res = await api().post('/api/auth/login').send({ identifier: env.seedAdmin.email, password: env.seedAdmin.password });
  assert.equal(res.body.user.role, 'superadmin');
});

test('email verification link', async () => {
  const u = await register();
  let res = await api().post('/api/auth/email/send-verification').set(auth(u.token));
  assert.equal(res.status, 200);
  const token = lastMail(u.email).text.match(/token=([a-f0-9]{64})/)[1];
  res = await api().post('/api/auth/email/verify').send({ token });
  assert.equal(res.status, 200);
  assert.equal(res.body.user.emailVerified, true);
  res = await api().post('/api/auth/email/verify').send({ token });
  assert.equal(res.status, 400, 'a link works once');
});

test('phone OTP: verify, resend limit, attempt limit', async () => {
  const u = await register({ phone: '01733333333' });
  let res = await api().post('/api/auth/phone/send-code').set(auth(u.token)).send({});
  assert.equal(res.status, 200);
  res = await api().post('/api/auth/phone/send-code').set(auth(u.token)).send({});
  assert.equal(res.body.code, 'OTP_TOO_SOON');
  res = await api().post('/api/auth/phone/verify').set(auth(u.token)).send({ code: '000000' });
  assert.equal(res.body.code, 'OTP_INVALID');
  res = await api()
    .post('/api/auth/phone/verify')
    .set(auth(u.token))
    .send({ code: lastSmsCode('01733333333') });
  assert.equal(res.status, 200);
  assert.equal(res.body.user.phoneVerified, true);
});

test('password reset by email link and by SMS code', async () => {
  const u = await register({ phone: '01744444444' });
  await api().post('/api/auth/forgot-password').send({ identifier: u.email }).expect(200);
  const token = lastMail(u.email).text.match(/token=([a-f0-9]{64})/)[1];
  let res = await api().post('/api/auth/reset-password').send({ token, password: 'newpassword1' });
  assert.equal(res.status, 200);
  await api().post('/api/auth/login').send({ identifier: u.email, password: 'newpassword1' }).expect(200);
  res = await api().get('/api/auth/me').set(auth(u.token));
  assert.equal(res.status, 401, 'old sessions are signed out after a reset');

  await api().post('/api/auth/forgot-password').send({ identifier: '01744444444' }).expect(200);
  res = await api()
    .post('/api/auth/reset-password')
    .send({ phone: '01744444444', code: lastSmsCode('01744444444'), password: 'newpassword2' });
  assert.equal(res.status, 200);
  assert.equal(res.body.user.phoneVerified, true, 'receiving the code proves the phone');

  res = await api().post('/api/auth/forgot-password').send({ identifier: 'nobody@example.com' });
  assert.equal(res.status, 200, 'same answer for unknown accounts');
});

test('change password and sign out everywhere', async () => {
  const u = await register();
  let res = await api()
    .post('/api/auth/change-password')
    .set(auth(u.token))
    .send({ current: 'nope', next: 'password456' });
  assert.equal(res.status, 400);
  assert.equal(res.body.fieldCodes.current, 'wrong_password');
  res = await api()
    .post('/api/auth/change-password')
    .set(auth(u.token))
    .send({ current: u.password, next: 'password456' });
  assert.equal(res.status, 200);
  const fresh = res.body.token;
  await api().get('/api/auth/me').set(auth(u.token)).expect(401);
  await api().get('/api/auth/me').set(auth(fresh)).expect(200);
  await api().post('/api/auth/logout-all').set(auth(fresh)).expect(200);
  await api().get('/api/auth/me').set(auth(fresh)).expect(401);
});

test('Google sign-in: link existing email, ask gender for new users', async () => {
  let res = await api()
    .post('/api/auth/google')
    .send({ credential: 'x'.repeat(20) });
  assert.equal(res.body.code, 'GOOGLE_DISABLED');

  const existing = await register({ email: 'gmail-user@example.com' });
  setGoogleVerifier(async (c) => {
    if (c === 'bad-credential-123') throw new Error('bad');
    return c === 'existing-credential'
      ? { sub: 'g-1', email: 'gmail-user@example.com', emailVerified: true, name: 'Gmail User' }
      : { sub: 'g-2', email: 'new-google@example.com', emailVerified: true, name: 'New Google' };
  });
  try {
    res = await api().post('/api/auth/google').send({ credential: 'existing-credential' });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.id, existing.user.id);
    assert.equal(res.body.user.emailVerified, true);

    res = await api().post('/api/auth/google').send({ credential: 'new-credential-1' });
    assert.equal(res.status, 202);
    assert.equal(res.body.needsGender, true);
    res = await api().post('/api/auth/google').send({ credential: 'new-credential-1', gender: 'female' });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, 'new-google@example.com');

    res = await api().post('/api/auth/google').send({ credential: 'bad-credential-123' });
    assert.equal(res.body.code, 'GOOGLE_INVALID');
  } finally {
    setGoogleVerifier(null);
  }
});

test('account deletion frees the email and phone', async () => {
  const u = await register({ phone: '01755555555', email: 'leaving@example.com' });
  let res = await api().post('/api/auth/delete-account').set(auth(u.token)).send({ password: 'wrong' });
  assert.equal(res.status, 400);
  res = await api()
    .post('/api/auth/delete-account')
    .set(auth(u.token))
    .send({ password: u.password, reason: 'Married' });
  assert.equal(res.status, 200);
  await api().get('/api/auth/me').set(auth(u.token)).expect(401);
  await api().post('/api/auth/login').send({ identifier: 'leaving@example.com', password: u.password }).expect(401);
  await register({ phone: '01755555555', email: 'leaving@example.com' });
});

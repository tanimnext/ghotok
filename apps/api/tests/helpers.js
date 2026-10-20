/**
 * Test harness: one in-memory MongoDB per test file (node --test runs each file in its own process).
 *
 *   import { setup, api, auth, register, ... } from './helpers.js';
 *   setup();   // registers before/after hooks
 */
import { before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `ghotok-test-uploads-${process.pid}`);
process.env.SUPPORT_EMAIL = 'support@example.com';
// Tests must not depend on a developer's local .env (dotenv never overrides variables that are already set).
for (const k of [
  'BKASH_MERCHANT_NUMBER',
  'NAGAD_MERCHANT_NUMBER',
  'ROCKET_MERCHANT_NUMBER',
  'GOOGLE_CLIENT_ID',
  'SMTP_HOST',
])
  process.env[k] = '';
process.env.SMS_DRIVER = 'log';
process.env.BKASH_API_ENABLED = 'false';
process.env.STORAGE_DRIVER = 'local';

const { connectDb, disconnectDb } = await import('../src/config/db.js');
const { createApp } = await import('../src/app.js');
const { seed } = await import('../src/scripts/seed.js');
export const { env } = await import('../src/config/env.js');
export const { outbox } = await import('../src/services/mailer.js');
export const { smsOutbox } = await import('../src/services/sms.js');
export const { User } = await import('../src/modules/auth/user.model.js');
export const { resetSettingsCache } = await import('../src/modules/content/settings.service.js');

let mongo;
let app;

export function setup({ demo = false } = {}) {
  before(async () => {
    mongo = await MongoMemoryServer.create();
    await connectDb(mongo.getUri());
    app = createApp();
    await seed({ withDemo: demo, log: () => {} });
    resetSettingsCache();
  });
  after(async () => {
    await disconnectDb();
    await mongo.stop();
    await fs.rm(process.env.UPLOAD_DIR, { recursive: true, force: true });
  });
}

export const api = () => request(app);
export const auth = (token) => ({ Authorization: `Bearer ${token}` });

let n = 0;
/** Register a fresh user. Returns { token, user, phone, email, password }. */
export async function register({ gender = 'male', phone, email, password = 'password123', name } = {}) {
  n += 1;
  const body = {
    name: name || `Test user ${n}`,
    email: email ?? `user${n}-${process.pid}@example.com`,
    phone: phone ?? `0171${String(2000000 + n).padStart(7, '0')}`,
    password,
    gender,
  };
  const res = await api().post('/api/auth/register').send(body);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { token: res.body.token, user: res.body.user, phone: body.phone, email: body.email, password };
}

export async function loginAdmin() {
  const res = await api()
    .post('/api/auth/login')
    .send({ identifier: env.seedAdmin.email, password: env.seedAdmin.password });
  assert.equal(res.status, 200);
  return res.body.token;
}

/** Create a staff account with the given role. Returns its token. */
export async function staff(role) {
  const u = await register();
  await User.updateOne({ _id: u.user.id }, { role });
  const res = await api().post('/api/auth/login').send({ identifier: u.email, password: u.password });
  return res.body.token;
}

const isoYearsAgo = (years, monthDay = '01-15') => `${new Date().getUTCFullYear() - years}-${monthDay}`;

/** A complete biodata body that passes every submission rule. */
export function fullBiodata(type, guardianPhone, overrides = {}) {
  const groom = type === 'groom';
  const b = {
    type,
    general: {
      maritalStatus: 'never_married',
      dateOfBirth: isoYearsAgo(groom ? 30 : 25),
      heightInches: groom ? 68 : 62,
      religion: 'hindu',
      complexion: 'fair',
    },
    address: {
      permanentDivision: 'dhaka',
      permanentDistrict: 'dhaka',
      permanentUpazila: 'dhaka-savar',
      livesAbroad: false,
      presentDivision: 'dhaka',
      presentDistrict: 'gazipur',
    },
    education: {
      medium: 'general',
      highestLevel: 'masters',
      entries: [{ level: 'masters', institution: 'Dhaka University', year: 2020 }],
    },
    family: { economicStatus: 'middle', brothers: 1, sisters: 0 },
    occupation: { type: 'private_job', title: 'Engineer' },
    marriage: { guardiansAgree: true },
    contact: {
      candidateName: `${type} candidate`,
      guardianName: 'Guardian',
      guardianRelation: 'father',
      guardianPhone,
    },
    pledge: { truthful: true, guardiansKnow: true, acceptsTerms: true },
  };
  for (const [k, v] of Object.entries(overrides))
    b[k] = typeof v === 'object' && !Array.isArray(v) ? { ...b[k], ...v } : v;
  return b;
}

let gp = 0;
const nextGuardianPhone = () => `0181${String(3000000 + (gp += 1)).padStart(7, '0')}`;

/** Register a user, save + submit a full biodata and approve it. Returns { ...user, biodata: { id, code } }. */
export async function approvedBiodata(adminToken, type = 'groom', overrides = {}) {
  const u = await register({ gender: type === 'groom' ? 'male' : 'female' });
  let res = await api()
    .put('/api/me/biodata')
    .set(auth(u.token))
    .send(fullBiodata(type, nextGuardianPhone(), overrides));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.deepEqual(res.body.problems, []);
  res = await api().post('/api/me/biodata/submit').set(auth(u.token));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const id = res.body.biodata._id;
  res = await api().post(`/api/admin/biodatas/${id}/review`).set(auth(adminToken)).send({ decision: 'approved' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return { ...u, biodata: { id, code: res.body.code } };
}

/** Buy a package with a manual payment and approve it. */
export async function buyConnections(user, adminToken, connections = 3) {
  const pkgs = await api().get('/api/packages');
  const pkg = pkgs.body.items.find((p) => p.connections === connections);
  const trxId = `TRX${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  let res = await api()
    .post('/api/payments/manual')
    .set(auth(user.token))
    .send({ packageId: pkg._id, method: 'bkash', senderNumber: user.phone, trxId });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  res = await api().post(`/api/admin/payments/${res.body.payment._id}/approve`).set(auth(adminToken)).send({});
  assert.equal(res.status, 200, JSON.stringify(res.body));
}

export const lastMail = (to) => [...outbox].reverse().find((m) => m.to === to);
export const lastSmsCode = (phone) =>
  [...smsOutbox]
    .reverse()
    .find((m) => m.to === phone)
    ?.message.match(/\d{6}|[০-৯]{6}/)?.[0];

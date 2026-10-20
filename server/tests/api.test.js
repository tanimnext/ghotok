import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.UPLOAD_DIR = `/tmp/ghotok-test-uploads-${process.pid}`;

const { connectDb, disconnectDb } = await import('../src/config/db.js');
const { createApp } = await import('../src/app.js');
const { seed } = await import('../src/scripts/seed.js');
const { User } = await import('../src/models/User.js');
const { env } = await import('../src/config/env.js');

let mongo;
let app;
const api = () => request(app);
const auth = (t) => ({ Authorization: `Bearer ${t}` });

const tokens = {};
const ids = {};

before(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDb(mongo.getUri());
  app = createApp();
  await seed({ log: () => {} });
});
after(async () => {
  await disconnectDb();
  await mongo.stop();
});

function fullBiodata(type, guardianPhone) {
  const age = type === 'groom' ? 30 : 25;
  return {
    type,
    general: { maritalStatus: 'never_married', dateOfBirth: new Date(new Date().getFullYear() - age, 0, 1).toISOString(), heightInches: type === 'groom' ? 68 : 62, religion: 'hindu', complexion: 'fair' },
    address: { permanentDivision: 'dhaka', permanentDistrict: 'dhaka', presentDivision: 'dhaka', presentDistrict: 'gazipur' },
    education: { medium: 'general', highestLevel: 'masters', entries: [{ level: 'masters', institution: 'Dhaka University', year: 2020 }] },
    family: { economicStatus: 'middle', brothers: 1, sisters: 0 },
    occupation: { type: 'private_job', title: 'Engineer' },
    marriage: { guardiansAgree: true },
    contact: { candidateName: `${type} name`, guardianName: 'Guardian', guardianRelation: 'father', guardianPhone },
    pledge: { truthful: true, guardiansKnow: true, acceptsTerms: true },
  };
}

test('register and login', async () => {
  let res = await api().post('/api/auth/register').send({ name: 'Groom A', email: 'a@example.com', phone: '01711111111', password: 'password123', gender: 'male' });
  assert.equal(res.status, 201);
  tokens.a = res.body.token;
  res = await api().post('/api/auth/register').send({ name: 'Bride B', email: 'b@example.com', password: 'password123', gender: 'female' });
  assert.equal(res.status, 201);
  tokens.b = res.body.token;
  ids.b = res.body.user.id;
  res = await api().post('/api/auth/register').send({ name: 'Dup', email: 'a@example.com', password: 'password123', gender: 'male' });
  assert.equal(res.status, 409);
  res = await api().post('/api/auth/login').send({ identifier: '+8801711111111', password: 'password123' });
  assert.equal(res.status, 200, 'login by phone with +88 prefix');
  res = await api().post('/api/auth/login').send({ identifier: env.seedAdmin.email, password: env.seedAdmin.password });
  assert.equal(res.status, 200);
  assert.equal(res.body.user.role, 'superadmin');
  tokens.admin = res.body.token;
});

test('biodata validation blocks incomplete or bad submissions', async () => {
  let res = await api().put('/api/me/biodata').set(auth(tokens.a)).send({ type: 'groom', general: { religion: 'hindu' } });
  assert.equal(res.status, 200);
  assert.ok(res.body.problems.length > 3);
  res = await api().post('/api/me/biodata/submit').set(auth(tokens.a));
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'INCOMPLETE');
  // Guardian phone equal to own phone is rejected.
  res = await api().put('/api/me/biodata').set(auth(tokens.a)).send(fullBiodata('groom', '01711111111'));
  assert.ok(res.body.problems.includes('contact.guardianPhone:same_as_own'));
  // Underage groom (< 21) is rejected.
  const young = fullBiodata('groom', '01811111111');
  young.general.dateOfBirth = new Date(new Date().getFullYear() - 19, 0, 1).toISOString();
  res = await api().put('/api/me/biodata').set(auth(tokens.a)).send(young);
  assert.ok(res.body.problems.includes('general.dateOfBirth:underage'));
  // Private keys outside the whitelist are ignored.
  res = await api().put('/api/me/biodata').set(auth(tokens.a)).send({ ...fullBiodata('groom', '01811111111'), status: 'approved', stats: { views: 999 } });
  assert.equal(res.body.biodata.status, 'draft');
  assert.equal(res.body.problems.length, 0);
});

test('submit, review and public visibility', async () => {
  let res = await api().post('/api/me/biodata/submit').set(auth(tokens.a));
  assert.equal(res.status, 200);
  assert.equal(res.body.biodata.status, 'pending');
  ids.aNo = res.body.biodata.biodataNo;
  ids.aId = res.body.biodata._id;

  await api().put('/api/me/biodata').set(auth(tokens.b)).send(fullBiodata('bride', '01922222222'));
  res = await api().post('/api/me/biodata/submit').set(auth(tokens.b));
  ids.bNo = res.body.biodata.biodataNo;
  ids.bId = res.body.biodata._id;

  res = await api().get('/api/biodatas');
  assert.equal(res.body.total, 0, 'pending biodatas are not public');

  res = await api().get('/api/admin/overview').set(auth(tokens.a));
  assert.equal(res.status, 403, 'users cannot open admin');

  res = await api().post(`/api/admin/biodatas/${ids.aId}/review`).set(auth(tokens.admin)).send({ decision: 'rejected' });
  assert.equal(res.status, 400, 'rejection needs a note');
  for (const id of [ids.aId, ids.bId]) {
    res = await api().post(`/api/admin/biodatas/${id}/review`).set(auth(tokens.admin)).send({ decision: 'approved' });
    assert.equal(res.status, 200);
  }
  res = await api().get('/api/biodatas?type=groom&religion=hindu&ageMin=25&ageMax=35');
  assert.equal(res.body.total, 1);
  res = await api().get(`/api/biodatas/GH-${ids.aNo}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.biodata.contact, undefined, 'contact is private');
  assert.equal(res.body.biodata.owner, undefined);
  assert.equal(res.body.biodata.general.dateOfBirth, undefined, 'exact birth date hidden');
  assert.equal(res.body.biodata.general.age, 30);
  await api().post(`/api/biodatas/GH-${ids.aNo}/view`);
  await api().post(`/api/biodatas/GH-${ids.aNo}/view`);
  res = await api().get(`/api/biodatas/GH-${ids.aNo}`);
  assert.equal(res.body.biodata.stats.views, 1, 'same visitor is counted once per day');
  res = await api().get('/api/biodatas/stats');
  assert.deepEqual({ ...res.body }, { total: 2, grooms: 1, brides: 1, marriages: 0 });
});

test('connections: buy with manual TrxID, admin verifies, unlock contact', async () => {
  let res = await api().post(`/api/biodatas/${ids.aNo}/unlock`).set(auth(tokens.b));
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'INSUFFICIENT_CONNECTIONS');

  res = await api().get('/api/packages');
  const pkg = res.body.items.find((p) => p.connections === 5);
  res = await api().post('/api/payments/manual').set(auth(tokens.b)).send({ packageId: pkg._id, method: 'bkash', senderNumber: '01922222222', trxId: 'ABC123XYZ' });
  assert.equal(res.status, 201);
  const payId = res.body.payment._id;
  res = await api().post('/api/payments/manual').set(auth(tokens.a)).send({ packageId: pkg._id, method: 'bkash', senderNumber: '01711111111', trxId: 'abc123xyz' });
  assert.equal(res.status, 409, 'TrxID cannot be reused');

  res = await api().post(`/api/admin/payments/${payId}/approve`).set(auth(tokens.admin)).send({});
  assert.equal(res.status, 200);
  res = await api().post(`/api/admin/payments/${payId}/approve`).set(auth(tokens.admin)).send({});
  assert.equal(res.status, 400, 'cannot credit twice');

  res = await api().post(`/api/biodatas/${ids.aNo}/unlock`).set(auth(tokens.b));
  assert.equal(res.status, 200);
  assert.equal(res.body.connections, 4);
  assert.equal(res.body.contact.guardianPhone, '01811111111');
  res = await api().post(`/api/biodatas/${ids.aNo}/unlock`).set(auth(tokens.b));
  assert.equal(res.body.alreadyUnlocked, true);
  res = await api().get('/api/me/overview').set(auth(tokens.b));
  assert.equal(res.body.connections.balance, 4);
  res = await api().get(`/api/biodatas/${ids.aNo}`).set(auth(tokens.b));
  assert.equal(res.body.viewer.unlocked, true);
  assert.ok(res.body.viewer.contact.guardianPhone);
});

test('favorites, dislikes and who favorited me', async () => {
  let res = await api().post(`/api/biodatas/${ids.aNo}/favorite`).set(auth(tokens.b)).send({ kind: 'like' });
  assert.equal(res.status, 200);
  res = await api().get('/api/me/favorites').set(auth(tokens.b));
  assert.equal(res.body.items.length, 1);
  res = await api().get('/api/me/favorited-me').set(auth(tokens.a));
  assert.equal(res.body.total, 1);
  res = await api().post(`/api/biodatas/${ids.aNo}/favorite`).set(auth(tokens.b)).send({ kind: 'dislike' });
  res = await api().get('/api/biodatas').set(auth(tokens.b));
  assert.ok(!res.body.items.some((i) => i.biodataNo === ids.aNo), 'disliked biodatas are hidden from search');
  await api().delete(`/api/biodatas/${ids.aNo}/favorite`).set(auth(tokens.b));
});

test('proposal accepted gives both sides the contact', async () => {
  let res = await api().post(`/api/biodatas/${ids.bNo}/proposal`).set(auth(tokens.a)).send({ message: 'Our family would like to talk.' });
  assert.equal(res.status, 201);
  res = await api().post(`/api/biodatas/${ids.bNo}/proposal`).set(auth(tokens.a)).send({});
  assert.equal(res.status, 409);
  res = await api().get('/api/me/proposals?box=received').set(auth(tokens.b));
  assert.equal(res.body.items.length, 1);
  res = await api().post(`/api/me/proposals/${res.body.items[0].id}/respond`).set(auth(tokens.b)).send({ action: 'accept' });
  assert.equal(res.body.status, 'accepted');
  res = await api().get(`/api/biodatas/${ids.bNo}`).set(auth(tokens.a));
  assert.equal(res.body.viewer.unlocked, true);
  res = await api().get('/api/me/notifications').set(auth(tokens.a));
  assert.ok(res.body.items.some((n) => n.type === 'proposal_accepted'));
});

test('report with refund, admin approves, connection returned', async () => {
  let res = await api().post(`/api/biodatas/${ids.aNo}/report`).set(auth(tokens.b)).send({ reason: 'no_response', details: 'Called many times', requestRefund: true });
  assert.equal(res.status, 201);
  res = await api().get('/api/admin/refunds').set(auth(tokens.admin));
  assert.equal(res.body.items.length, 1);
  res = await api().post(`/api/admin/refunds/${res.body.items[0]._id}`).set(auth(tokens.admin)).send({ decision: 'approved', resolution: 'Guardian unreachable' });
  assert.equal(res.status, 200);
  res = await api().get('/api/me/overview').set(auth(tokens.b));
  assert.equal(res.body.connections.balance, 5);
  res = await api().get('/api/admin/reports?status=active').set(auth(tokens.admin));
  assert.equal(res.body.items.length, 1);
  res = await api().post(`/api/admin/reports/${res.body.items[0]._id}`).set(auth(tokens.admin)).send({ status: 'resolved', action: 'Warned the guardian' });
  assert.equal(res.status, 200);
});

test('manual connection adjustment and role permissions', async () => {
  let res = await api().post(`/api/admin/users/${ids.b}/connections`).set(auth(tokens.admin)).send({ action: 'revoke', amount: 10, reason: 'test' });
  assert.equal(res.status, 400, 'balance cannot go negative');
  res = await api().post(`/api/admin/users/${ids.b}/connections`).set(auth(tokens.admin)).send({ action: 'grant', amount: 2, reason: 'Goodwill credit' });
  assert.equal(res.body.connections, 7);

  // Make a support user: support may review, but may not approve payments.
  await api().post('/api/auth/register').send({ name: 'Support', email: 's@example.com', password: 'password123', gender: 'female' });
  const s = await User.findOne({ email: 's@example.com' });
  res = await api().post(`/api/admin/users/${s._id}/role`).set(auth(tokens.admin)).send({ role: 'support' });
  assert.equal(res.body.role, 'support');
  res = await api().post('/api/auth/login').send({ identifier: 's@example.com', password: 'password123' });
  const st = res.body.token;
  res = await api().get('/api/admin/biodatas?status=approved').set(auth(st));
  assert.equal(res.status, 200);
  res = await api().get('/api/admin/payments').set(auth(st));
  assert.equal(res.status, 403);
  res = await api().get('/api/admin/audit').set(auth(tokens.admin));
  assert.ok(res.body.items.some((a) => a.action === 'user.role'));
});

test('editing an approved biodata sends it back to review; hide works', async () => {
  // Re-saving identical data must not trigger a new review.
  let res = await api().get('/api/me/biodata').set(auth(tokens.a));
  const { general, address, education, family, occupation, marriage, contact, pledge } = res.body.biodata;
  res = await api().put('/api/me/biodata').set(auth(tokens.a)).send({ general: { ...general, dateOfBirth: general.dateOfBirth.slice(0, 10) }, address, education, family, occupation, marriage, contact, pledge });
  assert.equal(res.body.biodata.status, 'approved', 'no-op save keeps approval');
  res = await api().put('/api/me/biodata').set(auth(tokens.a)).send({ personal: { about: 'Updated about me' } });
  assert.equal(res.body.biodata.status, 'pending');
  res = await api().get(`/api/biodatas/${ids.aNo}`);
  assert.equal(res.status, 404);
  await api().post(`/api/admin/biodatas/${ids.aId}/review`).set(auth(tokens.admin)).send({ decision: 'approved' });
  res = await api().post('/api/me/biodata/visibility').set(auth(tokens.a)).send({ hidden: true, reason: 'talks_ongoing' });
  assert.equal(res.body.biodata.hidden, true);
  res = await api().get('/api/biodatas');
  assert.equal(res.body.total, 1);
  await api().post('/api/me/biodata/visibility').set(auth(tokens.a)).send({ hidden: false });
});

test('soft delete and admin-approved recovery', async () => {
  let res = await api().post('/api/me/biodata/delete').set(auth(tokens.a)).send({ reason: 'not_interested' });
  assert.equal(res.status, 200);
  res = await api().get('/api/me/overview').set(auth(tokens.a));
  assert.equal(res.body.biodata, null);
  assert.ok(res.body.deletedBiodata);
  res = await api().post('/api/me/biodata/recovery').set(auth(tokens.a)).send({ note: 'Deleted by mistake' });
  assert.equal(res.body.recovery.status, 'pending');
  res = await api().get('/api/admin/recovery').set(auth(tokens.admin));
  assert.equal(res.body.items.length, 1);
  res = await api().post(`/api/admin/recovery/${res.body.items[0]._id}`).set(auth(tokens.admin)).send({ decision: 'approve' });
  assert.equal(res.status, 200);
  res = await api().get('/api/me/biodata').set(auth(tokens.a));
  assert.equal(res.body.biodata.status, 'pending');
});

test('support tickets', async () => {
  let res = await api().post('/api/me/tickets').set(auth(tokens.b)).send({ subject: 'Payment question', category: 'payment', body: 'When will my payment be verified?' });
  assert.equal(res.status, 201);
  const id = res.body.ticket._id;
  res = await api().post(`/api/admin/tickets/${id}/messages`).set(auth(tokens.admin)).send({ body: 'It is verified now.' });
  assert.equal(res.body.status, 'answered');
  res = await api().get(`/api/me/tickets/${id}`).set(auth(tokens.b));
  assert.equal(res.body.ticket.messages.length, 2);
});

test('private photo access control', async () => {
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6300010000050001', 'hex');
  let res = await api().post('/api/me/biodata/photo').set(auth(tokens.b)).attach('file', png, { filename: 'p.png', contentType: 'image/png' });
  assert.equal(res.status, 200);
  const fake = Buffer.from('not an image at all, just text');
  res = await api().post('/api/me/biodata/photo').set(auth(tokens.b)).attach('file', fake, { filename: 'x.png', contentType: 'image/png' });
  assert.equal(res.status, 400, 'magic bytes are checked');
  res = await api().get(`/api/files/photo/${ids.bId}`).set(auth(tokens.a));
  assert.equal(res.status, 200, 'A unlocked B through the accepted proposal');
  await api().post('/api/auth/register').send({ name: 'Stranger', email: 'x@example.com', password: 'password123', gender: 'male' });
  res = await api().post('/api/auth/login').send({ identifier: 'x@example.com', password: 'password123' });
  res = await api().get(`/api/files/photo/${ids.bId}`).set(auth(res.body.token));
  assert.equal(res.status, 403);
});

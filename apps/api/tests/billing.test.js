import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, api, auth, register, loginAdmin, approvedBiodata, buyConnections } from './helpers.js';

setup();

let admin;
let target;
test('setup', async () => {
  admin = await loginAdmin();
  target = await approvedBiodata(admin, 'bride');
});

test('packages and payment numbers come from settings', async () => {
  let res = await api().get('/api/packages');
  assert.deepEqual(
    res.body.items.map((p) => [p.connections, p.price]),
    [
      [3, 300],
      [5, 500],
    ]
  );
  assert.equal(res.body.payment.bkashApi, false);
  await api()
    .put('/api/admin/settings')
    .set(auth(admin))
    .send({ paymentNumbers: { bkash: '+8801711000000', nagad: '01811000000' } })
    .expect(200);
  res = await api().get('/api/packages');
  assert.deepEqual(res.body.payment.manual, [
    { method: 'bkash', number: '01711000000' },
    { method: 'nagad', number: '01811000000' },
  ]);
});

test('manual payment: validation, duplicate TrxID, single credit on approval', async () => {
  const u = await register();
  const pkg = (await api().get('/api/packages')).body.items[0];
  const pay = (body) =>
    api()
      .post('/api/payments/manual')
      .set(auth(u.token))
      .send({ packageId: pkg._id, method: 'bkash', senderNumber: u.phone, trxId: 'ABC123XYZ', ...body });
  let res = await pay({ senderNumber: '123' });
  assert.equal(res.body.fieldCodes.senderNumber, 'invalid_phone');
  res = await pay({ trxId: 'bad id!' });
  assert.equal(res.status, 400);
  res = await pay({});
  assert.equal(res.status, 201);
  assert.equal(res.body.payment.trxId, 'ABC123XYZ');
  const id = res.body.payment._id;
  res = await pay({ trxId: 'abc123xyz' });
  assert.equal(res.body.code, 'TRX_USED', 'TrxIDs are unique per method, case-insensitive');

  const [a, b] = await Promise.all([
    api().post(`/api/admin/payments/${id}/approve`).set(auth(admin)).send({}),
    api().post(`/api/admin/payments/${id}/approve`).set(auth(admin)).send({}),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 400], 'two approvals credit once');
  res = await api().get('/api/me/overview').set(auth(u.token));
  assert.equal(res.body.connections.balance, 3);
  res = await api().get('/api/me/ledger').set(auth(u.token));
  assert.equal(res.body.items[0].type, 'purchase');
  assert.equal(res.body.items[0].balanceAfter, 3);
  res = await api().get('/api/me/payments').set(auth(u.token));
  assert.equal(res.body.items[0].status, 'approved');
});

test('rejected payments credit nothing and notify the user', async () => {
  const u = await register();
  const pkg = (await api().get('/api/packages')).body.items[1];
  let res = await api()
    .post('/api/payments/manual')
    .set(auth(u.token))
    .send({ packageId: pkg._id, method: 'nagad', senderNumber: u.phone, trxId: 'NAGAD0001' });
  res = await api()
    .post(`/api/admin/payments/${res.body.payment._id}/reject`)
    .set(auth(admin))
    .send({ note: 'No such transaction' });
  assert.equal(res.body.status, 'rejected');
  res = await api().get('/api/me/overview').set(auth(u.token));
  assert.equal(res.body.connections.balance, 0);
  res = await api().get('/api/me/notifications').set(auth(u.token));
  assert.equal(res.body.items[0].type, 'payment_rejected');
});

test('unlocking a contact spends exactly one connection', async () => {
  const u = await register();
  let res = await api().post(`/api/biodatas/${target.biodata.code}/unlock`).set(auth(u.token));
  assert.equal(res.body.code, 'INSUFFICIENT_CONNECTIONS');
  await buyConnections(u, admin, 3);

  const [a, b] = await Promise.all([
    api().post(`/api/biodatas/${target.biodata.code}/unlock`).set(auth(u.token)),
    api().post(`/api/biodatas/${target.biodata.code}/unlock`).set(auth(u.token)),
  ]);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.ok(a.body.contact.guardianPhone);
  res = await api().get('/api/me/overview').set(auth(u.token));
  assert.equal(res.body.connections.balance, 2, 'double click costs one connection');
  assert.equal(res.body.connections.used, 1);

  res = await api().get(`/api/biodatas/${target.biodata.code}`).set(auth(u.token));
  assert.equal(res.body.viewer.unlocked, true);
  assert.equal(res.body.viewer.contact.guardianPhone, a.body.contact.guardianPhone);
  res = await api().get('/api/me/unlocked').set(auth(u.token));
  assert.equal(res.body.items[0].biodata.code, target.biodata.code);
  await api().get(`/api/files/photo/${target.biodata.id}`).set(auth(u.token)).expect(404); // allowed, but no photo uploaded

  res = await api().post(`/api/biodatas/${target.biodata.code}/unlock`).set(auth(target.token));
  assert.equal(res.body.code, 'OWN_BIODATA');
});

test('refund request returns the connection once approved', async () => {
  const u = await register();
  await buyConnections(u, admin, 3);
  let res = await api().post(`/api/biodatas/${target.biodata.code}/unlock`).set(auth(u.token));
  const { unlockId } = res.body;
  res = await api().post('/api/me/refunds').set(auth(u.token)).send({ unlockId, reason: 'Number is switched off' });
  assert.equal(res.status, 201);
  res = await api().post('/api/me/refunds').set(auth(u.token)).send({ unlockId, reason: 'Again' });
  assert.equal(res.body.code, 'REFUND_PENDING');
  res = await api().get('/api/admin/refunds').set(auth(admin));
  const rr = res.body.items.find((x) => x.user._id === u.user.id);
  await api()
    .post(`/api/admin/refunds/${rr._id}`)
    .set(auth(admin))
    .send({ decision: 'approved', resolution: 'Confirmed by phone' })
    .expect(200);
  res = await api().post(`/api/admin/refunds/${rr._id}`).set(auth(admin)).send({ decision: 'approved' });
  assert.equal(res.body.code, 'REFUND_NOT_PENDING');
  res = await api().get('/api/me/overview').set(auth(u.token));
  assert.equal(res.body.connections.balance, 3);
  res = await api().post('/api/me/refunds').set(auth(u.token)).send({ unlockId, reason: 'Third time' });
  assert.equal(res.body.code, 'REFUND_NOT_ELIGIBLE');
});

test('report with refund request; a minor report hides the biodata at once', async () => {
  const u = await register();
  await buyConnections(u, admin, 3);
  const other = await approvedBiodata(admin, 'bride');
  await api().post(`/api/biodatas/${other.biodata.code}/unlock`).set(auth(u.token)).expect(200);
  let res = await api()
    .post(`/api/biodatas/${other.biodata.code}/report`)
    .set(auth(u.token))
    .send({ reason: 'wrong_number', requestRefund: true });
  assert.equal(res.status, 201);
  res = await api().post(`/api/biodatas/${other.biodata.code}/report`).set(auth(u.token)).send({ reason: 'fake_info' });
  assert.equal(res.body.code, 'REPORT_EXISTS');
  res = await api().get('/api/me/refunds').set(auth(u.token));
  assert.equal(res.body.items.length, 1);

  const reporter = await register();
  await api()
    .post(`/api/biodatas/${other.biodata.code}/report`)
    .set(auth(reporter.token))
    .send({ reason: 'minor', details: 'Looks under 18' })
    .expect(201);
  await api().get(`/api/biodatas/${other.biodata.code}`).expect(404);
  res = await api().get('/api/admin/reports').set(auth(admin)).query({ status: 'active' });
  assert.equal(res.body.items[0].priority, 'urgent', 'urgent reports first');
  res = await api().post('/api/me/biodata/visibility').set(auth(other.token)).send({ hidden: false });
  assert.equal(res.status, 400, 'the owner cannot un-hide a safety hold');
});

test('shortlist, ignore list and who shortlisted me', async () => {
  const u = await approvedBiodata(admin, 'groom');
  const b = await approvedBiodata(admin, 'bride');
  await api().post(`/api/biodatas/${b.biodata.code}/favorite`).set(auth(u.token)).send({ kind: 'like' }).expect(200);
  await api().post(`/api/biodatas/${b.biodata.code}/favorite`).set(auth(u.token)).send({ kind: 'like' }).expect(200);
  let res = await api().get('/api/me/favorites').set(auth(u.token));
  assert.equal(res.body.items.length, 1);
  res = await api().get('/api/me/favorited-me').set(auth(b.token));
  assert.equal(res.body.items[0].code, u.biodata.code);
  res = await api().get('/api/biodatas').set(auth(u.token)).query({ type: 'bride' });
  assert.equal(res.body.items.find((x) => x.code === b.biodata.code).isFavorite, true);

  await api().post(`/api/biodatas/${b.biodata.code}/favorite`).set(auth(u.token)).send({ kind: 'dislike' }).expect(200);
  res = await api().get('/api/biodatas').set(auth(u.token)).query({ type: 'bride' });
  assert.ok(!res.body.items.some((x) => x.code === b.biodata.code), 'ignored biodatas leave my search results');
  res = await api().get('/api/me/favorites').set(auth(u.token)).query({ kind: 'dislike' });
  assert.equal(res.body.items.length, 1);
  await api().delete(`/api/biodatas/${b.biodata.code}/favorite`).set(auth(u.token)).expect(200);
  res = await api().get('/api/me/overview').set(auth(u.token));
  assert.deepEqual([res.body.lists.favorites, res.body.lists.dislikes], [0, 0]);
});

test('proposals: rules, accept unlocks both contacts for free', async () => {
  const groom = await approvedBiodata(admin, 'groom');
  const bride = await approvedBiodata(admin, 'bride');
  const otherGroom = await approvedBiodata(admin, 'groom');
  const noBiodata = await register();

  let res = await api().post(`/api/biodatas/${bride.biodata.code}/proposal`).set(auth(noBiodata.token)).send({});
  assert.equal(res.body.code, 'OWN_BIODATA_REQUIRED');
  res = await api().post(`/api/biodatas/${otherGroom.biodata.code}/proposal`).set(auth(groom.token)).send({});
  assert.equal(res.body.code, 'SAME_TYPE_PROPOSAL');
  res = await api()
    .post(`/api/biodatas/${bride.biodata.code}/proposal`)
    .set(auth(groom.token))
    .send({ message: 'Our family would like to talk.' });
  assert.equal(res.status, 201);
  res = await api().post(`/api/biodatas/${bride.biodata.code}/proposal`).set(auth(groom.token)).send({});
  assert.equal(res.body.code, 'PROPOSAL_EXISTS');

  res = await api().get('/api/me/proposals').set(auth(bride.token)).query({ box: 'received' });
  assert.equal(res.body.items[0].biodata.code, groom.biodata.code);
  const pid = res.body.items[0].id;
  await api().post(`/api/me/proposals/${pid}/respond`).set(auth(bride.token)).send({ action: 'accept' }).expect(200);
  res = await api().post(`/api/me/proposals/${pid}/respond`).set(auth(bride.token)).send({ action: 'decline' });
  assert.equal(res.body.code, 'PROPOSAL_ANSWERED');

  for (const [who, other] of [
    [groom, bride],
    [bride, groom],
  ]) {
    res = await api().get(`/api/biodatas/${other.biodata.code}`).set(auth(who.token));
    assert.ok(res.body.viewer.contact.guardianPhone, 'both families see each other');
  }
  res = await api().get('/api/me/overview').set(auth(groom.token));
  assert.equal(res.body.connections.balance, 0, 'no connection spent');
});

test('admin adjusts connections by hand with an audited reason', async () => {
  const u = await register();
  let res = await api()
    .post(`/api/admin/users/${u.user.id}/connections`)
    .set(auth(admin))
    .send({ action: 'revoke', amount: 1, reason: 'Test revoke' });
  assert.equal(res.body.code, 'INSUFFICIENT_CONNECTIONS', 'balance never goes negative');
  res = await api()
    .post(`/api/admin/users/${u.user.id}/connections`)
    .set(auth(admin))
    .send({ action: 'grant', amount: 2, reason: 'Goodwill' });
  assert.equal(res.body.connections, 2);
  res = await api().get('/api/admin/audit').set(auth(admin)).query({ action: 'connections.' });
  assert.equal(res.body.items[0].meta.reason, 'Goodwill');
});

test('payments CSV export', async () => {
  const res = await api().get('/api/admin/payments/export').set(auth(admin)).query({ status: 'approved' });
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/csv/);
  assert.match(res.headers['content-disposition'], /ghotok-payments-\d{4}-\d{2}-\d{2}\.csv/);
  const lines = res.text.trim().split('\r\n');
  assert.ok(lines[0].includes('TrxID'));
  assert.ok(lines.length > 3);
});

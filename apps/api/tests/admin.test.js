import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, api, auth, register, loginAdmin, staff, approvedBiodata, lastMail, outbox } from './helpers.js';

setup();

let admin;
let support;
let adminRole;
test('setup', async () => {
  admin = await loginAdmin();
  support = await staff('support');
  adminRole = await staff('admin');
});

test('role guards on the admin API', async () => {
  const user = await register();
  await api().get('/api/admin/overview').expect(401);
  await api().get('/api/admin/overview').set(auth(user.token)).expect(403);
  await api().get('/api/admin/overview').set(auth(support)).expect(200);
  await api().get('/api/admin/payments').set(auth(support)).expect(403); // support staff cannot touch money
  await api().get('/api/admin/payments').set(auth(adminRole)).expect(200);
  await api().put('/api/admin/settings').set(auth(adminRole)).send({}).expect(403);
  await api().post(`/api/admin/users/${user.user.id}/role`).set(auth(adminRole)).send({ role: 'admin' }).expect(403);
});

test('overview queues and series', async () => {
  const res = await api().get('/api/admin/overview').set(auth(support));
  assert.equal(res.body.series.length, 14);
  for (const k of [
    'paymentsPending',
    'biodatasPending',
    'nidPending',
    'reportsOpen',
    'recoveryPending',
    'refundsPending',
    'ticketsOpen',
    'contactNew',
  ])
    assert.equal(typeof res.body.queues[k], 'number', k);
});

test('role change signs the user out; nobody changes their own role', async () => {
  const u = await register();
  await api().post(`/api/admin/users/${u.user.id}/role`).set(auth(admin)).send({ role: 'support' }).expect(200);
  await api().get('/api/auth/me').set(auth(u.token)).expect(401);
  const me = (await api().get('/api/auth/me').set(auth(admin))).body.user;
  const res = await api().post(`/api/admin/users/${me.id}/role`).set(auth(admin)).send({ role: 'user' });
  assert.equal(res.body.code, 'SELF_ACTION');
});

test('suspension hides the biodata, blocks sign-in and is reversible', async () => {
  const u = await approvedBiodata(admin, 'groom');
  await api()
    .post(`/api/admin/users/${u.user.id}/status`)
    .set(auth(adminRole))
    .send({ status: 'suspended', reason: 'Fake profile' })
    .expect(200);
  await api().get(`/api/biodatas/${u.biodata.code}`).expect(404);
  let res = await api().post('/api/auth/login').send({ identifier: u.email, password: u.password });
  assert.equal(res.body.code, 'ACCOUNT_SUSPENDED');
  const staffUser = await register();
  await api().post(`/api/admin/users/${staffUser.user.id}/role`).set(auth(admin)).send({ role: 'support' });
  res = await api()
    .post(`/api/admin/users/${staffUser.user.id}/status`)
    .set(auth(adminRole))
    .send({ status: 'suspended' });
  assert.equal(res.status, 403, 'only a super admin can suspend staff');
  await api().post(`/api/admin/users/${u.user.id}/status`).set(auth(adminRole)).send({ status: 'active' }).expect(200);
  await api().get(`/api/biodatas/${u.biodata.code}`).expect(200);
});

test('staff can verify a phone by hand and it shows on the biodata', async () => {
  const u = await approvedBiodata(admin, 'bride');
  await api().post(`/api/admin/users/${u.user.id}/verification`).set(auth(adminRole)).send({ phone: true }).expect(200);
  const res = await api().get(`/api/biodatas/${u.biodata.code}`);
  assert.equal(res.body.biodata.phoneVerified, true);
});

test('staff edit a biodata without changing its status, and it is audited', async () => {
  const u = await approvedBiodata(admin, 'groom');
  let res = await api()
    .put(`/api/admin/biodatas/${u.biodata.id}`)
    .set(auth(adminRole))
    .send({ occupation: { title: 'Senior engineer' } });
  assert.equal(res.body.biodata.occupation.title, 'Senior engineer');
  assert.equal(res.body.biodata.status, 'approved');
  res = await api().get('/api/admin/audit').set(auth(adminRole)).query({ action: 'biodata.edit' });
  assert.deepEqual(res.body.items[0].meta.fields, ['occupation.title']);
  res = await api().get('/api/admin/biodatas').set(auth(support)).query({ q: u.biodata.code });
  assert.equal(res.body.items.length, 1);
  res = await api().get(`/api/admin/biodatas/${u.biodata.id}`).set(auth(support));
  assert.ok(res.body.biodata.contact.guardianPhone, 'staff see the private contact');
});

test('support tickets: user opens, staff replies, user is notified', async () => {
  const u = await register();
  let res = await api()
    .post('/api/me/tickets')
    .set(auth(u.token))
    .send({ subject: 'Payment not added', category: 'payment', body: 'I paid 300 taka yesterday.' });
  assert.equal(res.status, 201);
  const id = res.body.ticket._id;
  await api()
    .post(`/api/admin/tickets/${id}/messages`)
    .set(auth(support))
    .send({ body: 'Added now, sorry for the delay.' })
    .expect(200);
  res = await api().get(`/api/me/tickets/${id}`).set(auth(u.token));
  assert.equal(res.body.ticket.status, 'answered');
  assert.equal(res.body.ticket.messages.length, 2);
  assert.ok(lastMail(u.email).text.includes(`/dashboard/support/${id}`), 'emailed in the user’s language with a link');
  await api().post(`/api/me/tickets/${id}/close`).set(auth(u.token)).expect(200);
  res = await api().post(`/api/me/tickets/${id}/messages`).set(auth(u.token)).send({ body: 'One more thing' });
  assert.equal(res.body.code, 'TICKET_CLOSED');
  res = await api().get('/api/me/notifications').set(auth(u.token));
  assert.equal(res.body.unread, 1);
  await api().post('/api/me/notifications/read-all').set(auth(u.token)).expect(200);
  res = await api().get('/api/me/notifications').set(auth(u.token));
  assert.equal(res.body.unread, 0);
});

test('contact form: honeypot, inbox and emailed reply', async () => {
  const before = outbox.length;
  await api()
    .post('/api/contact')
    .send({
      name: 'Bot',
      email: 'bot@example.com',
      subject: 'Spam spam',
      message: 'Buy now buy now buy now',
      website: 'x',
    })
    .expect(201);
  assert.equal(outbox.length, before, 'honeypot messages are dropped silently');
  let res = await api()
    .post('/api/contact')
    .send({
      name: 'Rahima',
      email: 'rahima@example.com',
      subject: 'Office visit',
      message: 'Can we visit your office on Saturday?',
    });
  assert.equal(res.status, 201);
  assert.equal(outbox.length, before + 1, 'support is emailed');
  res = await api().get('/api/admin/contact-messages').set(auth(support)).query({ status: 'new' });
  const msg = res.body.items.find((m) => m.email === 'rahima@example.com');
  await api()
    .post(`/api/admin/contact-messages/${msg._id}/reply`)
    .set(auth(support))
    .send({ reply: 'Yes, from 10am to 5pm.' })
    .expect(200);
  assert.ok(lastMail('rahima@example.com').text.includes('10am'));
});

test('site settings and downloadable resources', async () => {
  let res = await api()
    .put('/api/admin/settings')
    .set(auth(admin))
    .send({
      supportPhone: '01700000000',
      social: { facebook: 'https://facebook.com/ghotok' },
      announcement: { en: 'Eid office hours', bn: 'ঈদের অফিস সময়', active: true },
    });
  assert.equal(res.status, 200);
  res = await api()
    .put('/api/admin/settings')
    .set(auth(admin))
    .send({ paymentNumbers: { rocket: '12345' } });
  assert.equal(res.body.fieldCodes['paymentNumbers.rocket'], 'invalid_phone');
  res = await api().get('/api/settings');
  assert.equal(res.body.settings.social.facebook, 'https://facebook.com/ghotok');
  assert.equal(res.body.settings.announcement.bn, 'ঈদের অফিস সময়');

  const pdf = Buffer.from('%PDF-1.4\n% Ghotok biodata form\n');
  res = await api()
    .post('/api/admin/resources')
    .set(auth(admin))
    .field('titleEn', 'Printable biodata form')
    .field('titleBn', 'প্রিন্টযোগ্য বায়োডাটা ফর্ম')
    .attach('file', pdf, { filename: 'biodata-form.pdf', contentType: 'application/pdf' });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const id = res.body.resource._id;
  res = await api().get('/api/resources');
  assert.equal(res.body.items[0].title.bn, 'প্রিন্টযোগ্য বায়োডাটা ফর্ম');
  res = await api().get(`/api/resources/${id}/download`).buffer(true);
  assert.equal(res.status, 200);
  assert.match(res.headers['content-disposition'], /biodata-form\.pdf/);
  res = await api().get('/api/resources');
  assert.equal(res.body.items[0].downloads, 1);
  await api()
    .put(`/api/admin/resources/${id}`)
    .set(auth(admin))
    .field('titleEn', 'Form')
    .field('titleBn', 'ফর্ম')
    .field('published', 'false')
    .expect(200);
  await api().get(`/api/resources/${id}/download`).expect(404);
  await api().delete(`/api/admin/resources/${id}`).set(auth(admin)).expect(200);
});

test('API docs, health and error format', async () => {
  let res = await api().get('/api/health');
  assert.equal(res.body.db, 'up');
  res = await api().get('/api/docs/openapi.json');
  assert.equal(res.body.openapi, '3.1.0');
  assert.ok(Object.keys(res.body.paths).length > 80);
  assert.ok(res.body.paths['/api/biodatas/{code}/unlock'].post.security);
  res = await api().get('/api/docs');
  assert.match(res.headers['content-security-policy'], /cdnjs/);
  res = await api().get('/api/nope').set('Accept-Language', 'bn-BD');
  assert.equal(res.status, 404);
  assert.equal(res.body.code, 'ROUTE_NOT_FOUND');
  assert.match(res.body.error, /[ঀ-৿]/);
  res = await api().get('/api/admin/biodatas/not-an-id').set(auth(support));
  assert.equal(res.body.code, 'INVALID_ID');
  res = await api().post('/api/auth/login').set('Content-Type', 'application/json').send('{bad json');
  assert.equal(res.status, 400);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, api, auth, register, loginAdmin, fullBiodata, approvedBiodata } from './helpers.js';

setup();

let admin;
test('setup admin', async () => {
  admin = await loginAdmin();
});

test('saving reports what is missing; submit refuses incomplete biodata', async () => {
  const u = await register({ phone: '01711100001' });
  let res = await api()
    .put('/api/me/biodata')
    .set(auth(u.token))
    .send({ general: { religion: 'hindu' } });
  assert.equal(res.status, 400, 'first save must choose groom or bride');
  assert.equal(res.body.fieldCodes.type, 'required');

  res = await api()
    .put('/api/me/biodata')
    .set(auth(u.token))
    .send({ type: 'groom', general: { religion: 'hindu' } });
  assert.equal(res.status, 200);
  assert.equal(res.body.biodata.status, 'draft');
  assert.ok(res.body.problems.includes('general.maritalStatus'));

  res = await api().post('/api/me/biodata/submit').set(auth(u.token));
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'BIODATA_INCOMPLETE');
  assert.ok(res.body.fields['contact.guardianPhone']);

  res = await api()
    .put('/api/me/biodata')
    .set(auth(u.token))
    .send({ general: { religion: 'atheist', heightInches: 'tall' } });
  assert.equal(res.status, 400);
  assert.equal(res.body.fieldCodes['general.religion'], 'invalid_choice');
  assert.equal(res.body.fieldCodes['general.heightInches'], 'invalid_number');
});

test('business rules: legal age, own phone, ranges, location consistency', async () => {
  const u = await register({ gender: 'male', phone: '01711100002' });
  const save = (body) => api().put('/api/me/biodata').set(auth(u.token)).send(body);
  let res = await save(fullBiodata('groom', '01711100002'));
  assert.ok(res.body.problems.includes('contact.guardianPhone:same_as_own'));

  res = await save(
    fullBiodata('groom', '01811100002', { general: { dateOfBirth: `${new Date().getUTCFullYear() - 19}-01-01` } })
  );
  assert.ok(res.body.problems.includes('general.dateOfBirth:underage'), 'grooms must be 21+');

  res = await save(fullBiodata('groom', '01811100002', { expectation: { ageMin: 30, ageMax: 20 } }));
  assert.ok(res.body.problems.includes('expectation.ageMax:range'));

  res = await save(fullBiodata('groom', '01811100002', { address: { permanentUpazila: 'chattogram-anwara' } }));
  assert.ok(res.body.problems.includes('address.permanentUpazila:mismatch'));

  res = await save(fullBiodata('groom', '01811100002', { address: { livesAbroad: true, presentDistrict: null } }));
  assert.ok(res.body.problems.includes('address.presentCountry'), 'abroad needs a country instead of a district');

  res = await save(fullBiodata('groom', '01811100002', { expectation: { ageMin: 20, ageMax: 28 } }));
  assert.deepEqual(res.body.problems, []);
});

test('review flow: submit → approve assigns a code and makes it public', async () => {
  const u = await register({ gender: 'female' });
  await api().put('/api/me/biodata').set(auth(u.token)).send(fullBiodata('bride', '01811100010'));
  let res = await api().post('/api/me/biodata/submit').set(auth(u.token));
  assert.equal(res.body.biodata.status, 'pending');
  const id = res.body.biodata._id;

  res = await api().post(`/api/admin/biodatas/${id}/review`).set(auth(admin)).send({ decision: 'changes_requested' });
  assert.equal(res.status, 400, 'a note is required');
  res = await api()
    .post(`/api/admin/biodatas/${id}/review`)
    .set(auth(admin))
    .send({ decision: 'changes_requested', note: 'Add your education details' });
  assert.equal(res.body.status, 'changes_requested');
  res = await api().get('/api/me/notifications').set(auth(u.token));
  assert.equal(res.body.items[0].type, 'biodata_changes_requested');

  await api().post('/api/me/biodata/submit').set(auth(u.token)).expect(200);
  res = await api().post(`/api/admin/biodatas/${id}/review`).set(auth(admin)).send({ decision: 'approved' });
  assert.match(res.body.code, /^GH-\d{4,}$/);
  const code = res.body.code;

  res = await api().get(`/api/biodatas/${code}`);
  assert.equal(res.status, 200);
  const b = res.body.biodata;
  assert.equal(b.code, code);
  assert.equal(b.general.age, 25);
  assert.match(b.general.birthMonth, /^\d{4}-01$/);
  assert.equal(b.general.dateOfBirth, undefined, 'exact birth date is private');
  assert.equal(b.contact, undefined, 'contact is private');
  assert.equal(b.pledge, undefined);
  assert.equal(res.body.viewer.contact, undefined);
  assert.ok(!JSON.stringify(res.body).includes('01811100010'), 'guardian phone never leaks');

  res = await api().get(`/api/biodatas/${code.toLowerCase().replace('-', '')}`);
  assert.equal(res.status, 200, 'codes are case and dash insensitive');
});

test('search filters, sorting and location counts', async () => {
  await approvedBiodata(admin, 'groom', {
    general: { religion: 'muslim', maritalStatus: 'divorced' },
    address: { permanentDivision: 'chattogram', permanentDistrict: 'cumilla', permanentUpazila: 'cumilla-daudkandi' },
  });
  await approvedBiodata(admin, 'groom', {
    general: { religion: 'christian', dateOfBirth: `${new Date().getUTCFullYear() - 40}-06-01` },
    address: { livesAbroad: true, presentCountry: 'japan', presentDistrict: null },
  });
  await approvedBiodata(admin, 'bride', { general: { religion: 'buddhist' }, education: { highestLevel: 'phd' } });

  const search = (q) => api().get('/api/biodatas').query(q);
  let res = await search({ type: 'groom' });
  assert.ok(res.body.items.every((x) => x.type === 'groom'));
  res = await search({ religion: 'muslim,christian' });
  assert.deepEqual(new Set(res.body.items.map((x) => x.religion)), new Set(['muslim', 'christian']));
  res = await search({ marital: 'divorced' });
  assert.equal(res.body.total, 1);
  res = await search({ district: 'cumilla' });
  assert.equal(res.body.items[0].permanentUpazila, 'cumilla-daudkandi');
  res = await search({ upazila: 'cumilla-daudkandi' });
  assert.equal(res.body.total, 1);
  res = await search({ country: 'japan' });
  assert.equal(res.body.total, 1);
  assert.equal(res.body.items[0].livesAbroad, true);
  res = await search({ ageMin: 35 });
  assert.equal(res.body.total, 1);
  assert.equal(res.body.items[0].age, 40);
  res = await search({ ageMin: 20, ageMax: 30 });
  assert.ok(res.body.items.every((x) => x.age >= 20 && x.age <= 30));
  res = await search({ education: 'phd' });
  assert.equal(res.body.total, 1);
  res = await search({ religion: 'not-a-religion' });
  assert.ok(res.body.total >= 4, 'unknown filter values are ignored');
  res = await search({ sort: 'age_desc' });
  const ages = res.body.items.map((x) => x.age);
  assert.deepEqual(
    ages,
    [...ages].sort((a, b) => b - a)
  );

  res = await api().get('/api/biodatas/location-counts').query({ level: 'division' });
  assert.equal(res.body.counts.chattogram, 1);
  res = await api().get('/api/biodatas/location-counts').query({ level: 'district', parent: 'dhaka' });
  assert.ok(res.body.counts.dhaka >= 2);
  res = await api().get('/api/biodatas/location-counts').query({ level: 'country', which: 'present' });
  assert.equal(res.body.counts.japan, 1);
  res = await api().get('/api/biodatas/location-counts').query({ level: 'division', type: 'bride' });
  assert.equal(res.body.counts.chattogram, undefined, 'counts respect the other filters');

  res = await api().get('/api/biodatas/stats');
  assert.ok(res.body.total >= 4 && res.body.grooms >= 2 && res.body.brides >= 2);
  res = await api().get('/api/biodatas/recent');
  assert.ok(res.body.items.length >= 4);
});

test('visits are counted once per viewer per day and never for the owner', async () => {
  const owner = await approvedBiodata(admin, 'bride');
  const viewer = await register();
  await api().post(`/api/biodatas/${owner.biodata.code}/view`).set(auth(viewer.token)).expect(204);
  await api().post(`/api/biodatas/${owner.biodata.code}/view`).set(auth(viewer.token)).expect(204);
  await api().post(`/api/biodatas/${owner.biodata.code}/view`).set(auth(owner.token)).expect(204);
  await api().post(`/api/biodatas/${owner.biodata.code}/view`).set('User-Agent', 'anon').expect(204);
  const res = await api().get('/api/me/overview').set(auth(owner.token));
  assert.deepEqual(res.body.views, { today: 2, week: 2, month: 2, total: 2 });
});

test('editing an approved biodata sends it back to review; unchanged saves do not', async () => {
  const u = await approvedBiodata(admin, 'groom');
  let res = await api()
    .put('/api/me/biodata')
    .set(auth(u.token))
    .send({ general: { complexion: 'fair' } });
  assert.equal(res.body.changed, false);
  assert.equal(res.body.biodata.status, 'approved');
  res = await api()
    .put('/api/me/biodata')
    .set(auth(u.token))
    .send({ personal: { hobbies: 'Gardening' } });
  assert.equal(res.body.changed, true);
  assert.equal(res.body.biodata.status, 'pending');
  await api().get(`/api/biodatas/${u.biodata.code}`).expect(404);
});

test('hide, delete and restore', async () => {
  const u = await approvedBiodata(admin, 'bride');
  let res = await api().post('/api/me/biodata/visibility').set(auth(u.token)).send({ hidden: true });
  assert.equal(res.body.fieldCodes.reason, 'required');
  await api()
    .post('/api/me/biodata/visibility')
    .set(auth(u.token))
    .send({ hidden: true, reason: 'talks_ongoing' })
    .expect(200);
  await api().get(`/api/biodatas/${u.biodata.code}`).expect(404);
  res = await api().get(`/api/biodatas/${u.biodata.code}`).set(auth(u.token));
  assert.equal(res.status, 200, 'the owner can still open it');
  await api().post('/api/me/biodata/visibility').set(auth(u.token)).send({ hidden: false }).expect(200);
  await api().get(`/api/biodatas/${u.biodata.code}`).expect(200);

  await api().post('/api/me/biodata/delete').set(auth(u.token)).send({ reason: 'married_here' }).expect(200);
  res = await api().get('/api/me/overview').set(auth(u.token));
  assert.equal(res.body.biodata, null);
  assert.equal(res.body.deletedBiodata.code, u.biodata.code);
  res = await api().put('/api/me/biodata').set(auth(u.token)).send({ type: 'bride' });
  assert.equal(res.body.code, 'BIODATA_DELETED_EXISTS');
  res = await api().get('/api/biodatas/stats');
  assert.ok(res.body.marriages >= 1, 'marriages through Ghotok are counted');

  await api().post('/api/me/biodata/recovery').set(auth(u.token)).send({ note: 'Please restore' }).expect(200);
  res = await api().post('/api/me/biodata/recovery').set(auth(u.token)).send({});
  assert.equal(res.body.code, 'RESTORE_PENDING');
  res = await api().get('/api/admin/recovery').set(auth(admin));
  const item = res.body.items.find((x) => x.code === u.biodata.code);
  await api().post(`/api/admin/recovery/${item._id}`).set(auth(admin)).send({ decision: 'approve' }).expect(200);
  res = await api().get('/api/me/biodata').set(auth(u.token));
  assert.equal(res.body.biodata.status, 'pending', 'restored biodatas are reviewed again');
});

test('photo and NID uploads check the file contents and stay private', async () => {
  const u = await approvedBiodata(admin, 'groom');
  const png = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6300010000000500010d0a2db40000000049454e44ae426082',
    'hex'
  );
  let res = await api()
    .post('/api/me/biodata/photo')
    .set(auth(u.token))
    .attach('file', Buffer.from('not really a png'), { filename: 'x.png', contentType: 'image/png' });
  assert.equal(res.body.code, 'FILE_INVALID');
  res = await api()
    .post('/api/me/biodata/photo')
    .set(auth(u.token))
    .attach('file', Buffer.from('%PDF-1.4 test'), { filename: 'x.pdf', contentType: 'application/pdf' });
  assert.equal(res.body.code, 'FILE_TYPE', 'photos must be images');
  res = await api()
    .post('/api/me/biodata/photo')
    .set(auth(u.token))
    .attach('file', png, { filename: 'me.png', contentType: 'image/png' });
  assert.equal(res.status, 200);

  const stranger = await register();
  await api().get(`/api/files/photo/${u.biodata.id}`).set(auth(stranger.token)).expect(403);
  res = await api().get(`/api/files/photo/${u.biodata.id}`).set(auth(u.token));
  assert.equal(res.status, 200);
  assert.equal(res.headers['content-type'], 'image/png');
  assert.equal(res.headers['cache-control'], 'private, no-store');

  res = await api()
    .post('/api/me/biodata/nid')
    .set(auth(u.token))
    .attach('file', Buffer.from('%PDF-1.4 nid'), { filename: 'nid.pdf', contentType: 'application/pdf' });
  assert.equal(res.body.nid.status, 'submitted');
  await api().get(`/api/files/nid/${u.biodata.id}`).set(auth(stranger.token)).expect(403);
  await api()
    .post(`/api/admin/biodatas/${u.biodata.id}/nid`)
    .set(auth(admin))
    .send({ decision: 'verified' })
    .expect(200);
  res = await api().get(`/api/biodatas/${u.biodata.code}`);
  assert.equal(res.body.biodata.nidVerified, true);
  res = await api().get('/api/biodatas').query({ verified: '1' });
  assert.ok(res.body.items.some((x) => x.code === u.biodata.code));
});

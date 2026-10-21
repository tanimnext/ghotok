import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeBdPhone,
  maskPhone,
  ageFromDob,
  toCalendarDate,
  sanitizeBiodataInput,
  submissionProblems,
  publicFields,
  parseBiodataCode,
  biodataCode,
  SECTIONS,
  FORM_STEPS,
  LISTS,
  DIVISIONS,
  DISTRICTS,
  UPAZILAS,
  upazilasOf,
  label,
  height,
  digits,
  fieldLabel,
  sectionByKey,
  errorMessage,
  ERRORS,
} from '../src/index.js';

test('phone normalisation accepts local, +88 and Bangla digits', () => {
  assert.equal(normalizeBdPhone('01711-222333'), '01711222333');
  assert.equal(normalizeBdPhone('+8801711222333'), '01711222333');
  assert.equal(normalizeBdPhone('০১৭১১২২২৩৩৩'), '01711222333');
  assert.equal(normalizeBdPhone('01211222333'), null, 'operator prefix 012 is not valid');
  assert.equal(normalizeBdPhone('1711222333'), null);
  assert.equal(maskPhone('01711222333'), '017••••••33');
});

test('calendar dates ignore timezones', () => {
  assert.equal(toCalendarDate('1995-05-10').toISOString(), '1995-05-10T00:00:00.000Z');
  assert.equal(toCalendarDate('1995-05-10T18:00:00.000Z').toISOString(), '1995-05-10T00:00:00.000Z');
  assert.equal(toCalendarDate('10/05/1995'), null);
  const now = new Date('2026-10-21T00:00:00Z');
  assert.equal(ageFromDob('2000-10-21', now), 26);
  assert.equal(ageFromDob('2000-10-22', now), 25);
});

test('sanitize keeps only schema fields and coerces types', () => {
  const r = sanitizeBiodataInput({
    type: 'groom',
    status: 'approved',
    general: { religion: 'hindu', heightInches: '68', dateOfBirth: '1994-05-10', hacker: 1 },
    contact: { guardianPhone: '+8801811222333' },
    expectation: { religions: ['hindu', 'hindu', 'muslim'] },
    personal: { about: '   ' },
    stats: { views: 9 },
  });
  assert.deepEqual(r.errors, {});
  assert.equal(r.set.type, 'groom');
  assert.equal(r.set['general.heightInches'], 68);
  assert.equal(r.set['contact.guardianPhone'], '01811222333');
  assert.deepEqual(r.set['expectation.religions'], ['hindu', 'muslim']);
  assert.equal(r.unset['personal.about'], 1, 'blank text clears the field');
  assert.equal('status' in r.set, false);
  assert.equal('general.hacker' in r.set, false);
  assert.equal(
    Object.keys(r.set).some((k) => k.startsWith('stats')),
    false
  );
});

test('sanitize reports invalid values per field', () => {
  const r = sanitizeBiodataInput({
    general: { religion: 'pastafarian', heightInches: 200 },
    contact: { guardianPhone: '12345', email: 'nope' },
  });
  assert.equal(r.errors['general.religion'], 'invalid_choice');
  assert.equal(r.errors['general.heightInches'], 'too_large');
  assert.equal(r.errors['contact.guardianPhone'], 'invalid_phone');
  assert.equal(r.errors['contact.email'], 'invalid_email');
});

const complete = () => ({
  type: 'bride',
  general: { maritalStatus: 'never_married', dateOfBirth: '1998-01-01', heightInches: 62, religion: 'muslim' },
  address: { permanentDivision: 'dhaka', permanentDistrict: 'gazipur', presentDistrict: 'dhaka' },
  education: { medium: 'general', highestLevel: 'masters' },
  family: { economicStatus: 'middle' },
  occupation: { type: 'teacher' },
  marriage: { guardiansAgree: true },
  contact: { guardianName: 'A', guardianRelation: 'father', guardianPhone: '01811222333' },
  pledge: { guardiansKnow: true, truthful: true, acceptsTerms: true },
});

test('a complete biodata has no problems', () => {
  assert.deepEqual(submissionProblems(complete(), { ownerPhone: '01711222333' }), []);
});

test('submission rules: required, age, own phone, ranges, location consistency', () => {
  const b = complete();
  b.type = 'groom';
  b.general.dateOfBirth = `${new Date().getUTCFullYear() - 20}-01-01`;
  b.contact.guardianPhone = '01711222333';
  b.expectation = { ageMin: 30, ageMax: 20 };
  b.address.permanentUpazila = 'barguna-amtali';
  delete b.occupation.type;
  const p = submissionProblems(b, { ownerPhone: '+8801711222333' });
  assert.ok(p.includes('general.dateOfBirth:underage'));
  assert.ok(p.includes('contact.guardianPhone:same_as_own'));
  assert.ok(p.includes('expectation.ageMax:range'));
  assert.ok(p.includes('address.permanentUpazila:mismatch'));
  assert.ok(p.includes('occupation.type'));
});

test('conditional required fields follow showIf', () => {
  const b = complete();
  b.address = { permanentDistrict: 'gazipur', livesAbroad: true };
  assert.ok(submissionProblems(b).includes('address.presentCountry'), 'country required when abroad');
  assert.ok(!submissionProblems(b).includes('address.presentDistrict'), 'present district not required when abroad');
});

test('public fields never include private sections or the birth date', () => {
  const sections = publicFields(complete());
  assert.ok(!sections.some((s) => s.key === 'contact' || s.key === 'pledge'));
  assert.ok(!sections.find((s) => s.key === 'general').fields.some((f) => f.key === 'dateOfBirth'));
  const faith = sections.find((s) => s.key === 'faith').fields.map((f) => f.key);
  assert.ok(faith.includes('prayer'), 'muslim questions shown for a muslim biodata');
  assert.ok(!faith.includes('gotra'), 'hindu questions hidden for a muslim biodata');
  assert.ok(faith.includes('coverage') && !faith.includes('beard'), 'bride-specific question');
});

test('schema integrity: unique keys, known option lists, labels in both languages', () => {
  for (const s of SECTIONS) {
    const keys = s.fields.map((f) => f.key);
    assert.equal(new Set(keys).size, keys.length, `duplicate key in ${s.key}`);
    for (const f of s.fields) {
      if (f.options) assert.ok(LISTS[f.options], `unknown list ${f.options}`);
      for (const lang of ['en', 'bn'])
        assert.ok(fieldLabel(f, lang, 'groom') && fieldLabel(f, lang, 'bride'), `${s.key}.${f.key} ${lang}`);
    }
  }
  for (const step of FORM_STEPS) if (step !== 'photo') assert.ok(sectionByKey[step], step);
});

test('location data is complete and consistent', () => {
  assert.equal(DIVISIONS.length, 8);
  assert.equal(DISTRICTS.length, 64);
  assert.ok(UPAZILAS.length >= 490);
  assert.equal(new Set(UPAZILAS.map((u) => u.value)).size, UPAZILAS.length);
  assert.ok(upazilasOf('gazipur').some((u) => u.en === 'Kaliakair'));
  assert.ok(DISTRICTS.every((d) => d.bn && d.en));
});

test('formatting helpers', () => {
  assert.equal(parseBiodataCode('GH-1001'), 1001);
  assert.equal(parseBiodataCode('abc'), null);
  assert.equal(biodataCode(1001), 'GH-1001');
  assert.equal(label('religion', 'hindu', 'bn'), 'হিন্দু');
  assert.equal(label('marital', 'widowed', 'en', 'bride'), 'Widow');
  assert.equal(label('marital', 'widowed', 'en', 'groom'), 'Widower');
  assert.equal(height(63, 'en'), '5′ 3″');
  assert.equal(digits('2026', 'bn'), '২০২৬');
});

test('every error code has both languages', () => {
  for (const [code, m] of Object.entries(ERRORS)) assert.ok(m.en && m.bn, code);
  assert.equal(errorMessage('NOPE', 'bn'), ERRORS.INTERNAL.bn);
});

test('wallet numbers: Rocket accounts carry a check digit', async () => {
  const { normalizeWalletNumber } = await import('../src/phone.js');
  assert.equal(normalizeWalletNumber('bkash', '+8801711000000'), '01711000000');
  assert.equal(normalizeWalletNumber('bkash', '017110000001'), null);
  assert.equal(normalizeWalletNumber('rocket', '017110000001'), '017110000001');
  assert.equal(normalizeWalletNumber('rocket', '০১৭১১০০০০০০১'), '017110000001');
  assert.equal(normalizeWalletNumber('rocket', '01211000000'), null);
});

test('status labels exist in both languages', async () => {
  const { STATUS, statusLabel } = await import('../src/i18n/labels.js');
  for (const [kind, values] of Object.entries(STATUS)) {
    for (const [v, l] of Object.entries(values)) assert.ok(l.en && l.bn, `${kind}.${v}`);
  }
  assert.equal(statusLabel('payment', 'pending', 'bn'), 'যাচাইয়ের অপেক্ষায়');
  assert.equal(statusLabel('payment', 'mystery', 'en'), 'mystery');
});

test('place() skips repeated names', async () => {
  const { place } = await import('../src/format.js');
  const a = { permanentUpazila: 'dhaka-dhamrai', permanentDistrict: 'dhaka', permanentDivision: 'dhaka' };
  assert.equal(place(a, 'permanent', 'en'), 'Dhamrai, Dhaka');
  assert.equal(
    place({ livesAbroad: true, presentCountry: 'japan', presentArea: 'Tokyo' }, 'present', 'en'),
    'Tokyo, Japan'
  );
});

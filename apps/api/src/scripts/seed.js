/**
 * Seed the connection packages and the first super admin.
 *   npm run seed            packages + super admin (safe to run repeatedly)
 *   npm run seed -- --demo  also 24 sample approved biodatas for local testing
 * Never run --demo against production.
 */
import { pathToFileURL } from 'node:url';
import { sanitizeBiodataInput, submissionProblems, upazilasOf, divisionOfDistrict } from '@ghotok/shared';
import { env } from '../config/env.js';
import { connectDb, disconnectDb } from '../config/db.js';
import { User } from '../modules/auth/user.model.js';
import { Biodata } from '../modules/biodata/biodata.model.js';
import { nextSeq } from '../modules/biodata/counter.model.js';
import { Package } from '../modules/billing/billing.models.js';
import { Resource } from '../modules/content/content.models.js';

export const DEFAULT_PACKAGES = [
  { name: { en: 'Starter', bn: 'স্টার্টার' }, connections: 3, price: 300, sort: 1 },
  { name: { en: 'Standard', bn: 'স্ট্যান্ডার্ড' }, connections: 5, price: 500, sort: 2, highlight: true },
];

export const DEMO_PASSWORD = 'demo12345';

// type, religion, district, age, height (in), education, occupation, title, marital, medium
const PEOPLE = [
  ['bride', 'hindu', 'dhaka', 26, 63, 'masters', 'private_job', 'Marketing executive', 'never_married', 'general'],
  ['groom', 'muslim', 'chattogram', 31, 68, 'bachelor', 'engineer', 'Software engineer', 'never_married', 'general'],
  ['bride', 'christian', 'sylhet', 29, 62, 'mbbs', 'doctor', 'Medical officer', 'never_married', 'english'],
  ['groom', 'buddhist', 'rajshahi', 34, 67, 'masters', 'govt_job', 'Bank officer', 'divorced', 'general'],
  ['bride', 'muslim', 'khulna', 23, 61, 'bachelor', 'student', 'Honours student', 'never_married', 'madrasa_alia'],
  ['groom', 'hindu', 'barishal', 29, 70, 'masters', 'teacher', 'College lecturer', 'never_married', 'general'],
  ['bride', 'buddhist', 'rangamati', 27, 60, 'bachelor', 'teacher', 'School teacher', 'never_married', 'general'],
  ['groom', 'christian', 'gazipur', 32, 69, 'bachelor', 'business', 'Shop owner', 'never_married', 'english_version'],
  ['bride', 'muslim', 'cumilla', 25, 62, 'hsc', 'homemaker', '', 'never_married', 'madrasa_qawmi'],
  [
    'groom',
    'muslim',
    'sylhet',
    30,
    66,
    'bachelor',
    'expatriate',
    'Site supervisor (Qatar)',
    'never_married',
    'general',
  ],
  ['bride', 'hindu', 'mymensingh', 28, 64, 'masters', 'govt_job', 'Upazila officer', 'never_married', 'general'],
  ['groom', 'hindu', 'dhaka', 35, 68, 'phd', 'teacher', 'Assistant professor', 'widowed', 'english'],
  ['bride', 'muslim', 'rangpur', 30, 63, 'bachelor', 'private_job', 'HR officer', 'divorced', 'general'],
  ['groom', 'muslim', 'bogura', 27, 67, 'diploma', 'engineer', 'Diploma engineer', 'never_married', 'technical'],
  ['bride', 'christian', 'dhaka', 24, 61, 'bachelor', 'student', 'Masters student', 'never_married', 'english'],
  ['groom', 'buddhist', 'chattogram', 30, 66, 'bachelor', 'freelancer', 'Graphic designer', 'never_married', 'general'],
  ['bride', 'muslim', 'jashore', 22, 60, 'hsc', 'student', 'Student', 'never_married', 'general'],
  [
    'groom',
    'muslim',
    'narayanganj',
    33,
    71,
    'masters',
    'business',
    'Garments merchandiser',
    'never_married',
    'general',
  ],
  ['bride', 'hindu', 'faridpur', 31, 62, 'mbbs', 'doctor', 'Dental surgeon', 'never_married', 'general'],
  [
    'groom',
    'muslim',
    'noakhali',
    28,
    65,
    'bachelor',
    'religious_teacher',
    'Madrasa teacher',
    'never_married',
    'madrasa_qawmi',
  ],
  ['bride', 'muslim', 'tangail', 26, 63, 'masters', 'teacher', 'Primary school teacher', 'never_married', 'general'],
  [
    'groom',
    'christian',
    'khulna',
    36,
    69,
    'masters',
    'private_job',
    'NGO programme manager',
    'divorced',
    'english_version',
  ],
  [
    'bride',
    'buddhist',
    'coxsbazar',
    25,
    61,
    'bachelor',
    'private_job',
    'Hotel front-office executive',
    'never_married',
    'general',
  ],
  ['groom', 'hindu', 'dinajpur', 29, 67, 'bachelor', 'govt_job', 'Police sub-inspector', 'never_married', 'general'],
];

function demoBiodata([type, religion, district, age, height, edu, occ, title, marital, medium], i) {
  const groom = type === 'groom';
  const upazila = upazilasOf(district)[i % Math.max(1, upazilasOf(district).length)]?.value;
  const abroad = occ === 'expatriate';
  const now = new Date();
  const dob = `${now.getUTCFullYear() - age - 1}-${String((i % 12) + 1).padStart(2, '0')}-15`;
  const faith = {
    muslim: { prayer: 'mostly', recitesQuran: true, ...(groom ? { beard: true } : { coverage: 'hijab' }) },
    hindu: { gotra: 'Kashyap', worship: 'Joins family puja and festivals.' },
    buddhist: { worship: 'Visits the vihara on full-moon days.' },
    christian: { denomination: 'catholic', churchAttendance: true },
  }[religion];
  return {
    type,
    general: {
      maritalStatus: marital,
      dateOfBirth: dob,
      heightInches: height,
      weightKg: groom ? 68 : 54,
      complexion: ['fair', 'wheatish', 'very_fair', 'wheatish_dark'][i % 4],
      bloodGroup: ['A+', 'B+', 'O+', 'AB+'][i % 4],
      religion,
      nationality: 'Bangladeshi',
    },
    address: {
      permanentDivision: divisionOfDistrict(district),
      permanentDistrict: district,
      permanentUpazila: upazila,
      permanentArea: 'Sadar',
      livesAbroad: abroad,
      ...(abroad
        ? { presentCountry: 'qatar' }
        : { presentDivision: divisionOfDistrict(district), presentDistrict: district, presentUpazila: upazila }),
      grewUpAt: 'Grew up with family in the home district.',
    },
    education: {
      medium,
      highestLevel: edu,
      entries: [
        { level: edu, institution: 'Demo University', subject: 'General', year: 2015 + (i % 8), result: 'First class' },
      ],
    },
    family: {
      fatherAlive: true,
      fatherOccupation: 'Retired service holder',
      motherAlive: true,
      motherOccupation: 'Homemaker',
      brothers: i % 3,
      sisters: (i + 1) % 3,
      economicStatus: ['middle', 'upper_middle', 'lower_middle'][i % 3],
      religiousEnvironment: 'Practising, respectful family.',
    },
    personal: {
      about: 'Family-oriented, calm and caring. Enjoys reading and travelling.',
      hobbies: 'Reading, cooking, travel',
      smokes: false,
      diet: 'Mixed',
    },
    faith,
    occupation: {
      type: occ,
      title,
      monthlyIncome: occ === 'student' || occ === 'homemaker' ? '' : 'Prefer to discuss',
    },
    marriage: {
      guardiansAgree: true,
      ...(marital !== 'never_married' && {
        previousMarriageInfo: 'Happy to share details with the family.',
        children: 0,
      }),
      studyAfterMarriage: 'yes',
      jobAfterMarriage: groom ? 'discuss' : 'yes',
      ...(groom && { expectsDowry: false }),
      willingToRelocate: true,
    },
    expectation: {
      ageMin: groom ? 20 : age,
      ageMax: groom ? age : age + 8,
      religions: [religion],
      qualities: 'Kind, honest and respectful to family.',
    },
    contact: {
      candidateName: `Demo Candidate ${i + 1}`,
      guardianName: `Demo Guardian ${i + 1}`,
      guardianRelation: 'father',
      guardianPhone: `0171${String(1000000 + i).padStart(7, '0')}`,
      email: `guardian${i + 1}@example.com`,
    },
    pledge: { guardiansKnow: true, truthful: true, acceptsTerms: true },
  };
}

export async function seed({ withDemo = false, log = console.log } = {}) {
  if (!(await Package.exists({}))) {
    await Package.insertMany(DEFAULT_PACKAGES);
    log('Created packages: 3 connections for ৳300, 5 for ৳500');
  }

  if (!(await User.exists({ email: env.seedAdmin.email }))) {
    const admin = new User({
      name: env.seedAdmin.name,
      email: env.seedAdmin.email,
      emailVerifiedAt: new Date(),
      gender: 'male',
      role: 'superadmin',
    });
    await admin.setPassword(env.seedAdmin.password);
    await admin.save();
    log(`Created super admin ${env.seedAdmin.email}`);
  }

  if (!withDemo || (await User.exists({ email: 'demo1@example.com' }))) return;

  for (const [i, person] of PEOPLE.entries()) {
    const input = demoBiodata(person, i);
    const u = new User({
      name: `Demo ${person[0]} ${i + 1}`,
      email: `demo${i + 1}@example.com`,
      emailVerifiedAt: i % 3 ? new Date() : undefined,
      gender: person[0] === 'groom' ? 'male' : 'female',
      connections: i < 2 ? 5 : 0,
    });
    await u.setPassword(DEMO_PASSWORD);
    await u.save();
    const { set, errors } = sanitizeBiodataInput(input);
    if (Object.keys(errors).length) throw new Error(`Demo biodata ${i + 1} is invalid: ${JSON.stringify(errors)}`);
    const b = new Biodata({
      owner: u._id,
      type: input.type,
      termsAcceptedAt: new Date(),
      verification: { email: Boolean(u.emailVerifiedAt) },
    });
    for (const [path, value] of Object.entries(set)) b.set(path, value);
    const problems = submissionProblems(b.toObject(), {});
    if (problems.length) throw new Error(`Demo biodata ${i + 1} is incomplete: ${problems.join(', ')}`);
    Object.assign(b, {
      status: 'approved',
      biodataNo: await nextSeq('biodataNo', 1000),
      submittedAt: new Date(),
      approvedAt: new Date(Date.now() - i * 3600000),
      nid: { status: i % 2 ? 'verified' : 'none' },
    });
    await b.save();
  }
  log(
    `Created ${PEOPLE.length} demo biodatas (demo1@example.com … demo${PEOPLE.length}@example.com, password ${DEMO_PASSWORD})`
  );
  if (!(await Resource.exists({}))) log('No downloadable resources yet — add them in Admin › Resources.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await connectDb(env.mongoUri);
  await seed({ withDemo: process.argv.includes('--demo') });
  await disconnectDb();
}

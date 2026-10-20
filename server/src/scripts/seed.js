// Seed packages and the first super admin. Pass --demo to also create sample
// approved biodatas for local testing (never run --demo on production).
import { env } from '../config/env.js';
import { connectDb, disconnectDb } from '../config/db.js';
import { User } from '../models/User.js';
import { Biodata } from '../models/Biodata.js';
import { Package } from '../models/commerce.js';
import { nextSeq } from '../models/support.js';

const demo = process.argv.includes('--demo');

export async function seed({ withDemo = false, log = console.log } = {}) {
  if (!(await Package.exists({}))) {
    await Package.insertMany([
      { name: { en: 'Starter', bn: 'স্টার্টার' }, connections: 3, price: 300, sort: 1 },
      { name: { en: 'Standard', bn: 'স্ট্যান্ডার্ড' }, connections: 5, price: 500, sort: 2, highlight: true },
    ]);
    log('Created packages: 3 for ৳300, 5 for ৳500');
  }

  let admin = await User.findOne({ email: env.seedAdmin.email });
  if (!admin) {
    admin = new User({ name: env.seedAdmin.name, email: env.seedAdmin.email, gender: 'male', role: 'superadmin' });
    await admin.setPassword(env.seedAdmin.password);
    await admin.save();
    log(`Created super admin ${env.seedAdmin.email}`);
  }

  if (withDemo && !(await Biodata.exists({ status: 'approved' }))) {
    const people = [
      ['bride', 'hindu', 'dhaka', 'dhaka', 26, 63, 'masters', 'private_job', 'Marketing manager'],
      ['groom', 'muslim', 'chattogram', 'chattogram', 31, 68, 'bachelor', 'engineer', 'Software engineer'],
      ['bride', 'christian', 'sylhet', 'sylhet', 29, 62, 'mbbs', 'doctor', 'Medical officer'],
      ['groom', 'buddhist', 'rajshahi', 'rajshahi', 34, 67, 'masters', 'govt_job', 'Bank officer'],
      ['bride', 'muslim', 'khulna', 'khulna', 24, 61, 'bachelor', 'student', 'Student'],
      ['groom', 'hindu', 'barishal', 'barishal', 29, 70, 'masters', 'teacher', 'Lecturer'],
      ['bride', 'buddhist', 'chattogram', 'rangamati', 27, 60, 'bachelor', 'teacher', 'School teacher'],
      ['groom', 'christian', 'dhaka', 'gazipur', 32, 69, 'bachelor', 'business', 'Business owner'],
    ];
    let i = 0;
    for (const [type, religion, division, district, age, height, edu, occ, title] of people) {
      i += 1;
      const u = new User({ name: `Demo ${type} ${i}`, email: `demo${i}@example.com`, gender: type === 'groom' ? 'male' : 'female' });
      await u.setPassword('demo12345');
      await u.save();
      const dob = new Date(Date.UTC(new Date().getFullYear() - age, 4, 10));
      await Biodata.create({
        owner: u._id, type, status: 'approved', biodataNo: await nextSeq('biodataNo', 1000),
        approvedAt: new Date(Date.now() - i * 3600000), submittedAt: new Date(),
        general: { maritalStatus: 'never_married', dateOfBirth: dob, heightInches: height, complexion: 'fair', religion, bloodGroup: 'B+' },
        address: { permanentDivision: division, permanentDistrict: district, presentDivision: division, presentDistrict: district, presentArea: 'Sadar' },
        education: { medium: 'general', highestLevel: edu },
        family: { fatherAlive: true, fatherOccupation: 'Retired', motherAlive: true, motherOccupation: 'Homemaker', brothers: 1, sisters: 1, economicStatus: 'middle' },
        personal: { about: 'Family-oriented, calm and caring. Enjoys reading and travelling.', hobbies: 'Reading, cooking, travel' },
        occupation: { type: occ, title, monthlyIncome: 'Prefer to discuss' },
        marriage: { guardiansAgree: true, willingToRelocate: true },
        expectation: { ageMin: type === 'groom' ? 20 : 26, ageMax: type === 'groom' ? age : age + 8, qualities: 'Kind, honest and respectful to family.' },
        contact: { candidateName: `Demo ${i}`, guardianName: `Guardian ${i}`, guardianRelation: 'father', guardianPhone: `0171000000${i}`, email: `guardian${i}@example.com` },
        pledge: { truthful: true, guardiansKnow: true, acceptsTerms: true },
        nid: { status: i % 2 ? 'verified' : 'none' },
      });
    }
    log(`Created ${people.length} demo biodatas (password for demo users: demo12345)`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await connectDb(env.mongoUri);
  await seed({ withDemo: demo });
  await disconnectDb();
}

import { normalizeBdPhone } from './phone.js';
import { ageFromDob } from '../models/Biodata.js';

// Fields a user may write in each biodata section. Anything else is dropped.
export const SECTION_FIELDS = {
  general: ['maritalStatus', 'dateOfBirth', 'heightInches', 'weightKg', 'complexion', 'bloodGroup', 'religion', 'community', 'nationality'],
  address: ['permanentDivision', 'permanentDistrict', 'permanentArea', 'presentDivision', 'presentDistrict', 'presentArea', 'livesAbroad', 'presentCountry', 'grewUpAt'],
  education: ['medium', 'highestLevel', 'entries', 'other'],
  family: ['fatherAlive', 'fatherOccupation', 'motherAlive', 'motherOccupation', 'brothers', 'brothersInfo', 'sisters', 'sistersInfo', 'economicStatus', 'details'],
  personal: ['about', 'hobbies', 'religiousPractice', 'healthNotes', 'smokes', 'diet'],
  occupation: ['type', 'title', 'details', 'monthlyIncome'],
  marriage: ['guardiansAgree', 'previousMarriageInfo', 'children', 'willingToRelocate', 'careerAfterMarriage', 'thoughts'],
  expectation: ['ageMin', 'ageMax', 'heightMin', 'heightMax', 'religions', 'maritalStatuses', 'complexions', 'educationMin', 'occupations', 'districts', 'economicStatuses', 'qualities'],
  contact: ['candidateName', 'guardianName', 'guardianRelation', 'guardianPhone', 'guardianPhone2', 'email'],
  pledge: ['truthful', 'guardiansKnow', 'acceptsTerms'],
};

const clean = (v) => {
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? undefined : t;
  }
  return v;
};

/** Copy only allowed fields from the request body into a $set object. */
export function buildBiodataUpdate(body) {
  const set = {};
  const unset = {};
  if (body.type) set.type = body.type;
  for (const [section, fields] of Object.entries(SECTION_FIELDS)) {
    const src = body[section];
    if (!src || typeof src !== 'object') continue;
    for (const f of fields) {
      if (!(f in src)) continue;
      let v = clean(src[f]);
      if (f === 'entries' && Array.isArray(v)) {
        v = v.slice(0, 8).map((e) => ({
          level: clean(e.level), institution: clean(e.institution), subject: clean(e.subject),
          year: e.year ? Number(e.year) : undefined, result: clean(e.result),
        }));
      }
      if ((f === 'guardianPhone' || f === 'guardianPhone2') && v) v = normalizeBdPhone(v) || v;
      if (f === 'dateOfBirth' && v) {
        // Store birth dates as a plain calendar date (UTC midnight) so no timezone shifts the day.
        const day = String(v instanceof Date ? v.toISOString() : v).slice(0, 10);
        v = /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(`${day}T00:00:00.000Z`) : v;
      }
      if (v === undefined || v === null) unset[`${section}.${f}`] = 1;
      else set[`${section}.${f}`] = v;
    }
  }
  const update = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(unset).length) update.$unset = unset;
  return update;
}

/** Return a list of missing/invalid items that block submission for review. */
export function submissionProblems(b, ownerPhone) {
  const p = [];
  const need = (cond, key) => { if (!cond) p.push(key); };
  need(b.type, 'type');
  const g = b.general || {};
  need(g.maritalStatus, 'general.maritalStatus');
  need(g.dateOfBirth, 'general.dateOfBirth');
  const age = ageFromDob(g.dateOfBirth);
  if (g.dateOfBirth) {
    // Legal minimum marriage age in Bangladesh: 18 for women, 21 for men.
    const min = b.type === 'groom' ? 21 : 18;
    if (age < min) p.push('general.dateOfBirth:underage');
  }
  need(g.heightInches, 'general.heightInches');
  need(g.religion, 'general.religion');
  need(b.address?.permanentDistrict, 'address.permanentDistrict');
  need(b.address?.presentDistrict || b.address?.livesAbroad, 'address.presentDistrict');
  need(b.education?.highestLevel, 'education.highestLevel');
  need(b.family?.economicStatus, 'family.economicStatus');
  need(b.occupation?.type, 'occupation.type');
  need(b.marriage?.guardiansAgree === true, 'marriage.guardiansAgree');
  const c = b.contact || {};
  need(c.guardianName, 'contact.guardianName');
  need(c.guardianRelation, 'contact.guardianRelation');
  const gp = normalizeBdPhone(c.guardianPhone);
  need(gp, 'contact.guardianPhone');
  if (gp && ownerPhone && gp === normalizeBdPhone(ownerPhone)) p.push('contact.guardianPhone:same_as_own');
  const pl = b.pledge || {};
  need(pl.truthful && pl.guardiansKnow && pl.acceptsTerms, 'pledge');
  return p;
}

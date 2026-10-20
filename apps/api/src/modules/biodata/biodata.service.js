import crypto from 'node:crypto';
import {
  sanitizeBiodataInput,
  submissionProblems,
  parseBiodataCode,
  EDUCATION_LEVELS,
  values,
  LISTS,
} from '@ghotok/shared';
import { Biodata, PUBLIC_FILTER } from './biodata.model.js';
import { nextSeq } from './counter.model.js';
import { ProfileView, Proposal } from '../interactions/interaction.models.js';
import { User } from '../auth/user.model.js';
import { notFound, badRequest, conflict, validationError, csv, dhakaDay } from '../../core/http.js';

export async function findByCode(code, { includeDeleted = false } = {}) {
  const n = parseBiodataCode(code);
  if (!n) throw notFound('BIODATA_NOT_FOUND');
  const b = await Biodata.findOne({ biodataNo: n, ...(includeDeleted ? {} : { deletedAt: null }) });
  if (!b) throw notFound('BIODATA_NOT_FOUND');
  return b;
}

export const findOwn = (userId) => Biodata.findOne({ owner: userId, deletedAt: null });

// ---------- Search ----------
const valid = (list, arr) => arr.filter((v) => values(LISTS[list]).includes(v));

function dobRangeForAges(minAge, maxAge, now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const q = {};
  if (minAge) q.$lte = new Date(Date.UTC(y - minAge, m, d));
  if (maxAge) q.$gt = new Date(Date.UTC(y - maxAge - 1, m, d));
  return q;
}

/** Build a MongoDB filter from search query parameters. Unknown values are ignored. */
export function buildSearch(query = {}) {
  const f = { ...PUBLIC_FILTER };
  const types = csv(query.type).filter((t) => ['groom', 'bride'].includes(t));
  if (types.length === 1) f.type = types[0];
  const inList = (key, list, path) => {
    const v = valid(list, csv(query[key]));
    if (v.length) f[path] = { $in: v };
  };
  inList('marital', 'marital', 'general.maritalStatus');
  inList('religion', 'religion', 'general.religion');
  inList('complexion', 'complexion', 'general.complexion');
  inList('occupation', 'occupation', 'occupation.type');
  inList('economic', 'economic', 'family.economicStatus');
  inList('medium', 'medium', 'education.medium');
  inList('division', 'division', 'address.permanentDivision');
  inList('district', 'district', 'address.permanentDistrict');
  inList('upazila', 'upazila', 'address.permanentUpazila');
  inList('presentDivision', 'division', 'address.presentDivision');
  inList('presentDistrict', 'district', 'address.presentDistrict');
  inList('presentUpazila', 'upazila', 'address.presentUpazila');
  inList('country', 'country', 'address.presentCountry');
  const cats = valid('category', csv(query.category));
  if (cats.length) f['general.categories'] = { $in: cats };
  if (query.abroad === '1') f['address.livesAbroad'] = true;
  if (query.education) {
    const order = values(EDUCATION_LEVELS);
    const idx = order.indexOf(query.education);
    if (idx >= 0) f['education.highestLevel'] = { $in: order.slice(idx) };
  }
  const ageMin = parseInt(query.ageMin, 10);
  const ageMax = parseInt(query.ageMax, 10);
  if (ageMin || ageMax) f['general.dateOfBirth'] = dobRangeForAges(ageMin, ageMax);
  const hMin = parseInt(query.heightMin, 10);
  const hMax = parseInt(query.heightMax, 10);
  if (hMin || hMax) f['general.heightInches'] = { ...(hMin && { $gte: hMin }), ...(hMax && { $lte: hMax }) };
  if (query.verified === '1') f['nid.status'] = 'verified';
  if (query.q) {
    const n = parseBiodataCode(query.q);
    if (n) f.biodataNo = n;
  }
  return f;
}

export const SORTS = {
  newest: { approvedAt: -1 },
  age_asc: { 'general.dateOfBirth': -1 },
  age_desc: { 'general.dateOfBirth': 1 },
};

/**
 * Counts of public biodatas per location for the location picker.
 * level: division | district | upazila | country ; which: permanent | present
 */
export async function locationCounts({ level, which = 'permanent', parent, query = {} }) {
  const prefix = which === 'present' ? 'present' : 'permanent';
  const base = buildSearch({
    ...query,
    division: undefined,
    district: undefined,
    upazila: undefined,
    presentDivision: undefined,
    presentDistrict: undefined,
    presentUpazila: undefined,
    country: undefined,
  });
  let field;
  const match = { ...base };
  if (level === 'country') {
    const [abroad, home] = await Promise.all([
      Biodata.aggregate([
        { $match: { ...match, 'address.livesAbroad': true } },
        { $group: { _id: '$address.presentCountry', n: { $sum: 1 } } },
      ]),
      prefix === 'present'
        ? Biodata.countDocuments({ ...match, 'address.livesAbroad': { $ne: true } })
        : Biodata.countDocuments(match),
    ]);
    const out = Object.fromEntries(abroad.filter((x) => x._id).map((x) => [x._id, x.n]));
    out.bangladesh = home;
    return out;
  }
  if (level === 'division') field = `${prefix}Division`;
  else if (level === 'district') {
    field = `${prefix}District`;
    if (parent) match[`address.${prefix}Division`] = parent;
  } else if (level === 'upazila') {
    field = `${prefix}Upazila`;
    if (parent) match[`address.${prefix}District`] = parent;
  } else throw badRequest();
  const rows = await Biodata.aggregate([{ $match: match }, { $group: { _id: `$address.${field}`, n: { $sum: 1 } } }]);
  return Object.fromEntries(rows.filter((x) => x._id).map((x) => [x._id, x.n]));
}

// ---------- Views ----------
/** Count one visit per viewer per biodata per day. Owners are not counted. */
export async function recordView(b, req) {
  if (req.user && String(req.user._id) === String(b.owner)) return false;
  const who = req.user ? `u:${req.user._id}` : `ip:${req.ip}|${req.headers['user-agent'] || ''}`;
  const viewerKey = crypto.createHash('sha256').update(who).digest('hex').slice(0, 32);
  try {
    await ProfileView.create({ biodata: b._id, day: dhakaDay(), viewerKey });
    await Biodata.updateOne({ _id: b._id }, { $inc: { 'stats.views': 1 } });
    return true;
  } catch (e) {
    if (e.code === 11000) return false;
    throw e;
  }
}

// ---------- Owner edits ----------
const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const same = (a, b) =>
  JSON.stringify(a instanceof Date ? a.toISOString() : a) === JSON.stringify(b instanceof Date ? b.toISOString() : b);

/**
 * Apply a (partial) biodata update for its owner. Creates the biodata on first save.
 * Saving unchanged values is a no-op; any real change to an approved biodata sends it back to review.
 */
export async function saveOwnBiodata(user, body) {
  let b = await findOwn(user._id);
  if (!b) {
    if (await Biodata.exists({ owner: user._id })) throw conflict('BIODATA_DELETED_EXISTS');
    if (!['groom', 'bride'].includes(body?.type)) throw validationError({ type: 'required' });
    b = await Biodata.create({
      owner: user._id,
      type: body.type,
      status: 'draft',
      termsAcceptedAt: new Date(),
      verification: { phone: Boolean(user.phoneVerifiedAt), email: Boolean(user.emailVerifiedAt) },
    });
  }
  const { set, unset, errors } = sanitizeBiodataInput(body);
  if (Object.keys(errors).length) throw validationError(errors);
  const current = b.toObject();
  for (const [k, v] of Object.entries(set)) if (same(v, getPath(current, k))) delete set[k];
  for (const k of Object.keys(unset))
    if (getPath(current, k) === undefined || getPath(current, k) === null) delete unset[k];
  const changed = Object.keys(set).length + Object.keys(unset).length > 0;
  if (changed) {
    if (b.status === 'approved') Object.assign(set, { status: 'pending', submittedAt: new Date() });
    const update = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;
    b = await Biodata.findByIdAndUpdate(b._id, update, { new: true, runValidators: true });
  }
  return { biodata: b, changed, problems: submissionProblems(b.toObject(), { ownerPhone: user.phone }) };
}

export async function submitOwnBiodata(user) {
  const b = await findOwn(user._id);
  if (!b) throw notFound('BIODATA_REQUIRED');
  if (b.status === 'pending') return b;
  if (b.status === 'approved') throw badRequest('BIODATA_ALREADY_APPROVED');
  const problems = submissionProblems(b.toObject(), { ownerPhone: user.phone });
  if (problems.length) {
    const fields = Object.fromEntries(problems.map((p) => [p.split(':')[0], p.includes(':') ? p : 'required']));
    const err = badRequest('BIODATA_INCOMPLETE', fields);
    throw err;
  }
  if (!b.biodataNo) b.biodataNo = await nextSeq('biodataNo', 1000);
  b.status = 'pending';
  b.submittedAt = new Date();
  await b.save();
  return b;
}

/** Withdraw pending proposals that involve a biodata (on delete / hide by staff). */
export const withdrawProposalsFor = (biodataId) =>
  Proposal.updateMany(
    { $or: [{ fromBiodata: biodataId }, { toBiodata: biodataId }], status: 'pending' },
    { status: 'withdrawn' }
  );

/** Copy the owner's verified phone/email flags onto their biodata. */
export async function syncVerification(userId) {
  const u = await User.findById(userId).select('phoneVerifiedAt emailVerifiedAt').lean();
  if (!u) return;
  await Biodata.updateOne(
    { owner: userId },
    { 'verification.phone': Boolean(u.phoneVerifiedAt), 'verification.email': Boolean(u.emailVerifiedAt) }
  );
}

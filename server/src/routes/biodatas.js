import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { Biodata, toPublic, toCard } from '../models/Biodata.js';
import { Favorite, Proposal, ProfileView } from '../models/social.js';
import { Unlock, RefundRequest } from '../models/commerce.js';
import { Report } from '../models/support.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { adjustConnections } from '../services/connections.js';
import { notify } from '../services/notify.js';
import { ah, parse, paging, pageMeta, notFound, badRequest, conflict } from '../utils/http.js';
import { values, REPORT_REASONS, EDUCATION_LEVELS } from '../constants.js';

const r = Router();

export const PUBLIC_FILTER = { status: 'approved', hidden: false, deletedAt: null };
const list = (v) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : []);

function dobRangeForAges(minAge, maxAge) {
  const now = new Date();
  const q = {};
  if (minAge) q.$lte = new Date(now.getFullYear() - minAge, now.getMonth(), now.getDate());
  if (maxAge) q.$gt = new Date(now.getFullYear() - maxAge - 1, now.getMonth(), now.getDate());
  return q;
}

export function buildSearch(query) {
  const f = { ...PUBLIC_FILTER };
  if (query.type && ['groom', 'bride'].includes(query.type)) f.type = query.type;
  const marital = list(query.marital);
  if (marital.length) f['general.maritalStatus'] = { $in: marital };
  const religion = list(query.religion);
  if (religion.length) f['general.religion'] = { $in: religion };
  const complexion = list(query.complexion);
  if (complexion.length) f['general.complexion'] = { $in: complexion };
  const occupation = list(query.occupation);
  if (occupation.length) f['occupation.type'] = { $in: occupation };
  const economic = list(query.economic);
  if (economic.length) f['family.economicStatus'] = { $in: economic };
  const district = list(query.district);
  if (district.length) f['address.permanentDistrict'] = { $in: district };
  if (query.division) f['address.permanentDivision'] = query.division;
  const present = list(query.presentDistrict);
  if (present.length) f['address.presentDistrict'] = { $in: present };
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
    const n = parseInt(String(query.q).replace(/\D/g, ''), 10);
    if (n) f.biodataNo = n;
  }
  return f;
}

const SORTS = {
  newest: { approvedAt: -1 },
  age_asc: { 'general.dateOfBirth': -1 },
  age_desc: { 'general.dateOfBirth': 1 },
};

// GET /api/biodatas — public search
r.get(
  '/',
  optionalAuth,
  ah(async (req, res) => {
    const { page, limit, skip } = paging(req.query, 12, 48);
    const filter = buildSearch(req.query);
    if (req.user && req.query.hideDisliked !== '0') {
      const disliked = await Favorite.find({ user: req.user._id, kind: 'dislike' }).distinct('biodata');
      if (disliked.length) filter._id = { $nin: disliked };
    }
    const sort = SORTS[req.query.sort] || SORTS.newest;
    const [items, total] = await Promise.all([
      Biodata.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Biodata.countDocuments(filter),
    ]);
    let favSet = new Set();
    if (req.user && items.length) {
      const favs = await Favorite.find({ user: req.user._id, kind: 'like', biodata: { $in: items.map((i) => i._id) } }).distinct('biodata');
      favSet = new Set(favs.map(String));
    }
    res.json({ items: items.map((b) => ({ ...toCard(b), isFavorite: favSet.has(String(b._id)) })), ...pageMeta(total, page, limit) });
  })
);

// GET /api/biodatas/stats — numbers for the home page
r.get(
  '/stats',
  ah(async (_req, res) => {
    const [total, grooms, brides, marriages] = await Promise.all([
      Biodata.countDocuments(PUBLIC_FILTER),
      Biodata.countDocuments({ ...PUBLIC_FILTER, type: 'groom' }),
      Biodata.countDocuments({ ...PUBLIC_FILTER, type: 'bride' }),
      Biodata.countDocuments({ deletedAt: { $ne: null }, deleteReason: 'married_here' }),
    ]);
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ total, grooms, brides, marriages });
  })
);

// GET /api/biodatas/recent — latest approved for the home page
r.get(
  '/recent',
  ah(async (req, res) => {
    const limit = Math.min(12, parseInt(req.query.limit, 10) || 8);
    const items = await Biodata.find(PUBLIC_FILTER).sort({ approvedAt: -1 }).limit(limit).lean();
    res.json({ items: items.map(toCard) });
  })
);

async function findPublicByNo(no) {
  const n = parseInt(String(no).replace(/\D/g, ''), 10);
  if (!n) throw notFound('Biodata not found');
  const b = await Biodata.findOne({ biodataNo: n, deletedAt: null });
  if (!b) throw notFound('Biodata not found');
  return b;
}

function dhakaDay() {
  return new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 10);
}

async function recordView(b, req) {
  if (req.user && String(req.user._id) === String(b.owner)) return;
  const who = req.user ? `u:${req.user._id}` : `ip:${req.ip}|${req.headers['user-agent'] || ''}`;
  const viewerKey = crypto.createHash('sha256').update(who).digest('hex').slice(0, 32);
  try {
    await ProfileView.create({ biodata: b._id, day: dhakaDay(), viewerKey });
    await Biodata.updateOne({ _id: b._id }, { $inc: { 'stats.views': 1 } });
  } catch (e) {
    if (e.code !== 11000) throw e; // same viewer, same day
  }
}

const contactOf = (b) => ({
  candidateName: b.contact?.candidateName,
  guardianName: b.contact?.guardianName,
  guardianRelation: b.contact?.guardianRelation,
  guardianPhone: b.contact?.guardianPhone,
  guardianPhone2: b.contact?.guardianPhone2,
  email: b.contact?.email,
});

// GET /api/biodatas/:no — public detail (+ viewer state when logged in)
r.get(
  '/:no',
  optionalAuth,
  ah(async (req, res) => {
    const b = await findPublicByNo(req.params.no);
    const isOwner = req.user && String(req.user._id) === String(b.owner);
    const isStaff = req.user && req.user.role !== 'user';
    if (!b.isPublic() && !isOwner && !isStaff) throw notFound('This biodata is not available');

    const viewer = { isOwner: Boolean(isOwner), loggedIn: Boolean(req.user) };
    if (req.user && !isOwner) {
      const [fav, unlock, proposal] = await Promise.all([
        Favorite.findOne({ user: req.user._id, biodata: b._id }).lean(),
        Unlock.findOne({ user: req.user._id, biodata: b._id }).lean(),
        Proposal.findOne({ from: req.user._id, toBiodata: b._id }).lean(),
      ]);
      viewer.favorite = fav?.kind || null;
      viewer.unlocked = Boolean(unlock);
      viewer.proposal = proposal ? { id: proposal._id, status: proposal.status } : null;
      viewer.connections = req.user.connections;
      if (unlock) viewer.contact = contactOf(b);
    }
    if (isOwner) viewer.contact = contactOf(b);
    res.json({ biodata: toPublic(b), viewer });
  })
);

// POST /api/biodatas/:no/view — called by the visitor's browser, so each
// visitor (not the Next.js server) is counted once per day.
r.post(
  '/:no/view',
  optionalAuth,
  ah(async (req, res) => {
    const b = await findPublicByNo(req.params.no);
    if (b.isPublic()) await recordView(b, req);
    res.status(204).end();
  })
);

// POST /api/biodatas/:no/unlock — spend 1 connection to see guardian contact
r.post(
  '/:no/unlock',
  requireAuth,
  ah(async (req, res) => {
    const b = await findPublicByNo(req.params.no);
    if (!b.isPublic()) throw notFound('This biodata is not available');
    if (String(b.owner) === String(req.user._id)) throw badRequest('This is your own biodata');

    let unlock;
    try {
      unlock = await Unlock.create({ user: req.user._id, biodata: b._id, cost: 1, source: 'connection' });
    } catch (e) {
      if (e.code === 11000) return res.json({ contact: contactOf(b), connections: req.user.connections, alreadyUnlocked: true });
      throw e;
    }
    try {
      const balance = await adjustConnections(req.user._id, -1, 'unlock', { ref: b._id, refModel: 'Biodata', note: `Unlocked GH-${b.biodataNo}` });
      res.json({ contact: contactOf(b), connections: balance });
    } catch (e) {
      await Unlock.deleteOne({ _id: unlock._id });
      throw e;
    }
  })
);

// Favorites / dislikes
r.post(
  '/:no/favorite',
  requireAuth,
  ah(async (req, res) => {
    const { kind } = parse(z.object({ kind: z.enum(['like', 'dislike']) }), req.body);
    const b = await findPublicByNo(req.params.no);
    if (String(b.owner) === String(req.user._id)) throw badRequest('This is your own biodata');
    const prev = await Favorite.findOneAndUpdate({ user: req.user._id, biodata: b._id }, { kind }, { upsert: true, new: false });
    const wasLike = prev?.kind === 'like';
    if (kind === 'like' && !wasLike) await Biodata.updateOne({ _id: b._id }, { $inc: { 'stats.favorites': 1 } });
    if (kind === 'dislike' && wasLike) await Biodata.updateOne({ _id: b._id }, { $inc: { 'stats.favorites': -1 } });
    res.json({ favorite: kind });
  })
);

r.delete(
  '/:no/favorite',
  requireAuth,
  ah(async (req, res) => {
    const b = await findPublicByNo(req.params.no);
    const prev = await Favorite.findOneAndDelete({ user: req.user._id, biodata: b._id });
    if (prev?.kind === 'like') await Biodata.updateOne({ _id: b._id }, { $inc: { 'stats.favorites': -1 } });
    res.json({ favorite: null });
  })
);

// Report a biodata (optionally asking for the connection back)
r.post(
  '/:no/report',
  requireAuth,
  ah(async (req, res) => {
    const d = parse(
      z.object({ reason: z.enum(values(REPORT_REASONS)), details: z.string().trim().max(2000).optional(), requestRefund: z.boolean().optional() }),
      req.body
    );
    const b = await findPublicByNo(req.params.no);
    if (String(b.owner) === String(req.user._id)) throw badRequest('You cannot report your own biodata');
    const open = await Report.exists({ reporter: req.user._id, biodata: b._id, status: { $in: ['open', 'reviewing'] } });
    if (open) throw conflict('You already have an open report for this biodata');
    const report = await Report.create({ reporter: req.user._id, biodata: b._id, ...d });
    if (d.requestRefund) {
      const unlock = await Unlock.findOne({ user: req.user._id, biodata: b._id, refunded: false, source: 'connection' });
      if (unlock && !(await RefundRequest.exists({ unlock: unlock._id, status: 'pending' }))) {
        await RefundRequest.create({ user: req.user._id, unlock: unlock._id, biodata: b._id, report: report._id, reason: d.reason, details: d.details });
      }
    }
    res.status(201).json({ report: { id: report._id, status: report.status } });
  })
);

// Send a proposal. Requires the sender's own biodata to be approved.
r.post(
  '/:no/proposal',
  requireAuth,
  ah(async (req, res) => {
    const { message } = parse(z.object({ message: z.string().trim().max(500).optional() }), req.body);
    const b = await findPublicByNo(req.params.no);
    if (!b.isPublic()) throw notFound('This biodata is not available');
    if (String(b.owner) === String(req.user._id)) throw badRequest('This is your own biodata');
    const mine = await Biodata.findOne({ owner: req.user._id, deletedAt: null });
    if (!mine || mine.status !== 'approved') {
      const err = badRequest('Your own biodata must be approved before you can send proposals');
      err.code = 'OWN_BIODATA_REQUIRED';
      throw err;
    }
    if (mine.type === b.type) throw badRequest('You can only send proposals to the opposite biodata type');
    const existing = await Proposal.findOne({ from: req.user._id, toBiodata: b._id });
    if (existing && existing.status !== 'withdrawn') throw conflict('You already sent a proposal to this biodata');
    const p = existing
      ? Object.assign(existing, { status: 'pending', message, respondedAt: undefined, fromBiodata: mine._id })
      : new Proposal({ from: req.user._id, fromBiodata: mine._id, to: b.owner, toBiodata: b._id, message });
    await p.save();
    await notify(b.owner, 'proposal_received', '/dashboard/proposals?box=received');
    res.status(201).json({ proposal: { id: p._id, status: p.status } });
  })
);

export default r;

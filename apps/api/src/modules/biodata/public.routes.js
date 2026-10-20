import { z } from 'zod';
import { values, REPORT_REASONS } from '@ghotok/shared';
import { createRouter } from '../../core/router.js';
import { paging, pageMeta, notFound, badRequest, conflict } from '../../core/http.js';
import { Biodata, PUBLIC_FILTER, toPublic, toCard, contactOf } from './biodata.model.js';
import { findByCode, findOwn, buildSearch, SORTS, recordView, locationCounts } from './biodata.service.js';
import { Favorite, Proposal } from '../interactions/interaction.models.js';
import { Unlock, RefundRequest } from '../billing/billing.models.js';
import { Report } from '../support/support.models.js';
import { adjustConnections } from '../billing/connections.service.js';
import { notify } from '../support/notify.service.js';

const r = createRouter({ prefix: '/biodatas', tag: 'Biodatas (public)' });

const searchQuery = z
  .object({
    type: z.string().optional(),
    q: z.string().optional(),
    marital: z.string().optional(),
    religion: z.string().optional(),
    ageMin: z.string().optional(),
    ageMax: z.string().optional(),
    heightMin: z.string().optional(),
    heightMax: z.string().optional(),
    division: z.string().optional(),
    district: z.string().optional(),
    upazila: z.string().optional(),
    presentDivision: z.string().optional(),
    presentDistrict: z.string().optional(),
    presentUpazila: z.string().optional(),
    country: z.string().optional(),
    abroad: z.string().optional(),
    education: z.string().optional(),
    medium: z.string().optional(),
    occupation: z.string().optional(),
    complexion: z.string().optional(),
    economic: z.string().optional(),
    category: z.string().optional(),
    verified: z.string().optional(),
    sort: z.enum(['newest', 'age_asc', 'age_desc']).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  })
  .passthrough();

r.get(
  '/',
  {
    summary: 'Search approved biodatas (comma-separated values for multi filters)',
    auth: 'optional',
    query: searchQuery,
  },
  async (req, res) => {
    const { page, limit, skip } = paging(req.query, 12, 48);
    const filter = buildSearch(req.query);
    if (req.user && req.query.hideIgnored !== '0') {
      const ignored = await Favorite.find({ user: req.user._id, kind: 'dislike' }).distinct('biodata');
      if (ignored.length) filter._id = { $nin: ignored };
    }
    const [items, total] = await Promise.all([
      Biodata.find(filter)
        .sort(SORTS[req.query.sort] || SORTS.newest)
        .skip(skip)
        .limit(limit)
        .lean(),
      Biodata.countDocuments(filter),
    ]);
    let shortlisted = new Set();
    if (req.user && items.length) {
      const ids = await Favorite.find({
        user: req.user._id,
        kind: 'like',
        biodata: { $in: items.map((i) => i._id) },
      }).distinct('biodata');
      shortlisted = new Set(ids.map(String));
    }
    res.json({
      items: items.map((b) => ({ ...toCard(b), isFavorite: shortlisted.has(String(b._id)) })),
      ...pageMeta(total, page, limit),
    });
  }
);

r.get('/stats', { summary: 'Totals for the home page' }, async (_req, res) => {
  const [total, grooms, brides, marriages] = await Promise.all([
    Biodata.countDocuments(PUBLIC_FILTER),
    Biodata.countDocuments({ ...PUBLIC_FILTER, type: 'groom' }),
    Biodata.countDocuments({ ...PUBLIC_FILTER, type: 'bride' }),
    Biodata.countDocuments({ deletedAt: { $ne: null }, deleteReason: 'married_here' }),
  ]);
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ total, grooms, brides, marriages });
});

r.get(
  '/recent',
  {
    summary: 'Latest approved biodatas',
    query: z.object({ limit: z.coerce.number().int().min(1).max(12).optional() }),
  },
  async (req, res) => {
    const items = await Biodata.find(PUBLIC_FILTER)
      .sort({ approvedAt: -1 })
      .limit(req.valid.query.limit || 8)
      .lean();
    res.json({ items: items.map(toCard) });
  }
);

r.get(
  '/location-counts',
  {
    summary: 'Number of public biodatas per location, for the location picker',
    query: searchQuery.extend({
      level: z.enum(['country', 'division', 'district', 'upazila']),
      which: z.enum(['permanent', 'present']).optional(),
      parent: z.string().optional(),
    }),
  },
  async (req, res) => {
    const { level, which, parent } = req.valid.query;
    res.set('Cache-Control', 'public, max-age=120');
    res.json({ counts: await locationCounts({ level, which, parent, query: req.query }) });
  }
);

r.get(
  '/:code',
  { summary: 'Public biodata with the viewer’s state (shortlist, unlocked contact, proposal)', auth: 'optional' },
  async (req, res) => {
    const b = await findByCode(req.params.code);
    const isOwner = Boolean(req.user) && String(req.user._id) === String(b.owner);
    const isStaff = Boolean(req.user) && req.user.role !== 'user';
    if (!b.isPublic() && !isOwner && !isStaff) throw notFound('BIODATA_NOT_FOUND');
    const viewer = { isOwner, loggedIn: Boolean(req.user) };
    if (req.user && !isOwner) {
      const [fav, unlock, proposal] = await Promise.all([
        Favorite.findOne({ user: req.user._id, biodata: b._id }).lean(),
        Unlock.findOne({ user: req.user._id, biodata: b._id }).lean(),
        Proposal.findOne({ from: req.user._id, toBiodata: b._id }).lean(),
      ]);
      Object.assign(viewer, {
        favorite: fav?.kind || null,
        unlocked: Boolean(unlock),
        unlockId: unlock?._id,
        proposal: proposal ? { id: proposal._id, status: proposal.status } : null,
        connections: req.user.connections,
      });
      if (unlock) viewer.contact = contactOf(b);
    }
    if (isOwner) viewer.contact = contactOf(b);
    res.json({ biodata: toPublic(b), viewer });
  }
);

r.post(
  '/:code/view',
  { summary: 'Count a visit (called by the visitor’s browser)', auth: 'optional' },
  async (req, res) => {
    const b = await findByCode(req.params.code);
    if (b.isPublic()) await recordView(b, req);
    res.status(204).end();
  }
);

r.post(
  '/:code/unlock',
  { summary: 'Spend one connection to see the guardian contact', auth: 'required' },
  async (req, res) => {
    const b = await findByCode(req.params.code);
    if (!b.isPublic()) throw notFound('BIODATA_NOT_FOUND');
    if (String(b.owner) === String(req.user._id)) throw badRequest('OWN_BIODATA');
    let unlock;
    try {
      unlock = await Unlock.create({ user: req.user._id, biodata: b._id, cost: 1, source: 'connection' });
    } catch (e) {
      if (e.code === 11000)
        return res.json({ contact: contactOf(b), connections: req.user.connections, alreadyUnlocked: true });
      throw e;
    }
    try {
      const balance = await adjustConnections(req.user._id, -1, 'unlock', {
        ref: b._id,
        refModel: 'Biodata',
        note: `GH-${b.biodataNo}`,
      });
      res.json({ contact: contactOf(b), connections: balance, unlockId: unlock._id });
    } catch (e) {
      await Unlock.deleteOne({ _id: unlock._id }); // keep the two writes consistent
      throw e;
    }
  }
);

r.post(
  '/:code/favorite',
  {
    summary: 'Add to shortlist (like) or ignore list (dislike)',
    auth: 'required',
    body: z.object({ kind: z.enum(['like', 'dislike']) }),
  },
  async (req, res) => {
    const b = await findByCode(req.params.code);
    if (String(b.owner) === String(req.user._id)) throw badRequest('OWN_BIODATA');
    const { kind } = req.valid.body;
    const prev = await Favorite.findOneAndUpdate(
      { user: req.user._id, biodata: b._id },
      { kind },
      { upsert: true, new: false }
    );
    const wasLike = prev?.kind === 'like';
    if (kind === 'like' && !wasLike) await Biodata.updateOne({ _id: b._id }, { $inc: { 'stats.favorites': 1 } });
    if (kind === 'dislike' && wasLike) await Biodata.updateOne({ _id: b._id }, { $inc: { 'stats.favorites': -1 } });
    res.json({ favorite: kind });
  }
);

r.delete('/:code/favorite', { summary: 'Remove from shortlist / ignore list', auth: 'required' }, async (req, res) => {
  const b = await findByCode(req.params.code);
  const prev = await Favorite.findOneAndDelete({ user: req.user._id, biodata: b._id });
  if (prev?.kind === 'like') await Biodata.updateOne({ _id: b._id }, { $inc: { 'stats.favorites': -1 } });
  res.json({ favorite: null });
});

r.post(
  '/:code/report',
  {
    summary: 'Report a biodata, optionally asking for the connection back',
    auth: 'required',
    body: z.object({
      reason: z.enum(values(REPORT_REASONS)),
      details: z.string().trim().max(2000).optional(),
      requestRefund: z.boolean().optional(),
    }),
  },
  async (req, res) => {
    const d = req.valid.body;
    const b = await findByCode(req.params.code);
    if (String(b.owner) === String(req.user._id)) throw badRequest('OWN_BIODATA');
    if (await Report.exists({ reporter: req.user._id, biodata: b._id, status: { $in: ['open', 'reviewing'] } }))
      throw conflict('REPORT_EXISTS');
    const report = await Report.create({
      reporter: req.user._id,
      biodata: b._id,
      ...d,
      priority: d.reason === 'minor' ? 'urgent' : 'normal',
    });
    if (d.reason === 'minor') await Biodata.updateOne({ _id: b._id }, { hidden: true, hiddenReason: 'minor_report' }); // safety first
    if (d.requestRefund) {
      const unlock = await Unlock.findOne({
        user: req.user._id,
        biodata: b._id,
        refunded: false,
        source: 'connection',
      });
      if (unlock && !(await RefundRequest.exists({ unlock: unlock._id, status: 'pending' }))) {
        await RefundRequest.create({
          user: req.user._id,
          unlock: unlock._id,
          biodata: b._id,
          report: report._id,
          reason: d.reason,
          details: d.details,
        });
      }
    }
    res.status(201).json({ report: { id: report._id, status: report.status } });
  }
);

r.post(
  '/:code/proposal',
  {
    summary: 'Send a free proposal (your own biodata must be approved)',
    auth: 'required',
    body: z.object({ message: z.string().trim().max(500).optional() }),
  },
  async (req, res) => {
    const b = await findByCode(req.params.code);
    if (!b.isPublic()) throw notFound('BIODATA_NOT_FOUND');
    if (String(b.owner) === String(req.user._id)) throw badRequest('OWN_BIODATA');
    const mine = await findOwn(req.user._id);
    if (!mine || mine.status !== 'approved') throw badRequest('OWN_BIODATA_REQUIRED');
    if (mine.type === b.type) throw badRequest('SAME_TYPE_PROPOSAL');
    const existing = await Proposal.findOne({ from: req.user._id, toBiodata: b._id });
    if (existing && existing.status !== 'withdrawn') throw conflict('PROPOSAL_EXISTS');
    const message = req.valid.body.message;
    const p = existing
      ? Object.assign(existing, { status: 'pending', message, respondedAt: undefined, fromBiodata: mine._id })
      : new Proposal({ from: req.user._id, fromBiodata: mine._id, to: b.owner, toBiodata: b._id, message });
    await p.save();
    await notify(b.owner, 'proposal_received', '/dashboard/proposals?box=received');
    res.status(201).json({ proposal: { id: p._id, status: p.status } });
  }
);

export default r.router;

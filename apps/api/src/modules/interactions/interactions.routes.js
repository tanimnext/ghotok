/**
 * Dashboard lists and proposals: shortlist, ignore list, who shortlisted me,
 * unlocked contacts, sent/received proposals and the overview widget data.
 */
import { z } from 'zod';
import { createRouter } from '../../core/router.js';
import { paging, pageMeta, notFound, badRequest, dhakaDay } from '../../core/http.js';
import { Biodata, PUBLIC_FILTER, toCard, contactOf } from '../biodata/biodata.model.js';
import { findOwn } from '../biodata/biodata.service.js';
import { Favorite, Proposal, ProfileView, PROPOSAL_STATUS } from './interaction.models.js';
import { Unlock, Ledger, Payment } from '../billing/billing.models.js';
import { Notification } from '../support/support.models.js';
import { notify } from '../support/notify.service.js';
import { biodataCode } from '@ghotok/shared';

const r = createRouter({ prefix: '/me', tag: 'Dashboard', defaults: { auth: 'required' } });

const byId = (docs) => new Map(docs.map((d) => [String(d._id), d]));

r.get('/overview', { summary: 'Everything the dashboard home needs in one call' }, async (req, res) => {
  const uid = req.user._id;
  const b = await findOwn(uid);
  const deleted = b
    ? null
    : await Biodata.findOne({ owner: uid, deletedAt: { $ne: null } })
        .select('deletedAt recovery biodataNo')
        .lean();
  let views = { today: 0, week: 0, month: 0, total: 0 };
  let favoritedBy = 0;
  if (b) {
    const [today, week, month, favs] = await Promise.all([
      ProfileView.countDocuments({ biodata: b._id, day: dhakaDay(0) }),
      ProfileView.countDocuments({ biodata: b._id, day: { $gte: dhakaDay(6) } }),
      ProfileView.countDocuments({ biodata: b._id, day: { $gte: dhakaDay(29) } }),
      Favorite.countDocuments({ biodata: b._id, kind: 'like' }),
    ]);
    views = { today, week, month, total: b.stats?.views || 0 };
    favoritedBy = favs;
  }
  const [favorites, dislikes, unlocked, sentPending, receivedPending, unread, used, pendingPayments, lastPurchase] =
    await Promise.all([
      Favorite.countDocuments({ user: uid, kind: 'like' }),
      Favorite.countDocuments({ user: uid, kind: 'dislike' }),
      Unlock.countDocuments({ user: uid }),
      Proposal.countDocuments({ from: uid, status: 'pending' }),
      Proposal.countDocuments({ to: uid, status: 'pending' }),
      Notification.countDocuments({ user: uid, read: false }),
      Ledger.countDocuments({ user: uid, type: 'unlock' }),
      Payment.countDocuments({ user: uid, status: 'pending' }),
      Ledger.findOne({ user: uid, type: 'purchase' }).sort({ createdAt: -1 }).select('createdAt').lean(),
    ]);
  res.json({
    user: req.user.toSafe(),
    biodata: b
      ? {
          id: b._id,
          code: biodataCode(b.biodataNo),
          type: b.type,
          status: b.status,
          hidden: b.hidden,
          hiddenReason: b.hiddenReason,
          reviewNote: b.reviewNote,
          nidStatus: b.nid?.status || 'none',
          hasPhoto: Boolean(b.photoKey),
          updatedAt: b.updatedAt,
        }
      : null,
    deletedBiodata: deleted
      ? { code: biodataCode(deleted.biodataNo), deletedAt: deleted.deletedAt, recovery: deleted.recovery }
      : null,
    connections: {
      balance: req.user.connections,
      used,
      pendingPayments,
      lastPurchaseAt: lastPurchase?.createdAt || null,
    },
    views,
    lists: { favorites, dislikes, unlocked, favoritedBy },
    proposals: { sentPending, receivedPending },
    unreadNotifications: unread,
  });
});

r.get(
  '/favorites',
  {
    summary: 'My shortlist (kind=like) or ignore list (kind=dislike)',
    query: z.object({
      kind: z.enum(['like', 'dislike']).optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
    }),
  },
  async (req, res) => {
    const kind = req.valid.query.kind || 'like';
    const { page, limit, skip } = paging(req.query, 24);
    const filter = { user: req.user._id, kind };
    const [favs, total] = await Promise.all([
      Favorite.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Favorite.countDocuments(filter),
    ]);
    const map = byId(await Biodata.find({ _id: { $in: favs.map((f) => f.biodata) }, deletedAt: null }).lean());
    const items = favs
      .map((f) => map.get(String(f.biodata)))
      .filter(Boolean)
      .map((b) => ({ ...toCard(b), available: b.status === 'approved' && !b.hidden }));
    res.json({ items, ...pageMeta(total, page, limit) });
  }
);

r.get('/favorited-me', { summary: 'Public biodatas of people who shortlisted mine' }, async (req, res) => {
  const b = await findOwn(req.user._id);
  const { page, limit, skip } = paging(req.query, 24);
  if (!b) return res.json({ items: [], anonymous: 0, ...pageMeta(0, page, limit) });
  const filter = { biodata: b._id, kind: 'like' };
  const [favs, total] = await Promise.all([
    Favorite.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Favorite.countDocuments(filter),
  ]);
  const theirs = await Biodata.find({ ...PUBLIC_FILTER, owner: { $in: favs.map((f) => f.user) } }).lean();
  res.json({ items: theirs.map(toCard), anonymous: favs.length - theirs.length, ...pageMeta(total, page, limit) });
});

r.get('/unlocked', { summary: 'Biodatas whose guardian contact I can see, with the contact' }, async (req, res) => {
  const { page, limit, skip } = paging(req.query, 24);
  const filter = { user: req.user._id };
  const [unlocks, total] = await Promise.all([
    Unlock.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Unlock.countDocuments(filter),
  ]);
  const map = byId(await Biodata.find({ _id: { $in: unlocks.map((u) => u.biodata) } }).lean());
  const items = unlocks
    .map((u) => {
      const b = map.get(String(u.biodata));
      if (!b) return null;
      return {
        unlockId: u._id,
        unlockedAt: u.createdAt,
        source: u.source,
        refunded: u.refunded,
        biodata: toCard(b),
        available: !b.deletedAt,
        contact: b.deletedAt ? null : contactOf(b),
      };
    })
    .filter(Boolean);
  res.json({ items, ...pageMeta(total, page, limit) });
});

r.get(
  '/proposals',
  {
    summary: 'Proposals I sent (box=sent) or received (box=received)',
    query: z.object({ box: z.enum(['sent', 'received']).optional(), status: z.enum(PROPOSAL_STATUS).optional() }),
  },
  async (req, res) => {
    const received = req.valid.query.box === 'received';
    const filter = received ? { to: req.user._id } : { from: req.user._id };
    if (req.valid.query.status) filter.status = req.valid.query.status;
    const { page, limit, skip } = paging(req.query, 24);
    const [ps, total] = await Promise.all([
      Proposal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Proposal.countDocuments(filter),
    ]);
    const map = byId(
      await Biodata.find({ _id: { $in: ps.map((p) => (received ? p.fromBiodata : p.toBiodata)) } }).lean()
    );
    const items = ps.map((p) => {
      const b = map.get(String(received ? p.fromBiodata : p.toBiodata));
      return {
        id: p._id,
        status: p.status,
        message: p.message,
        createdAt: p.createdAt,
        respondedAt: p.respondedAt,
        biodata: b ? toCard(b) : null,
      };
    });
    res.json({ items, ...pageMeta(total, page, limit) });
  }
);

r.post(
  '/proposals/:id/respond',
  {
    summary: 'Accept or decline a received proposal. Accepting unlocks both contacts for free.',
    body: z.object({ action: z.enum(['accept', 'decline']) }),
  },
  async (req, res) => {
    const p = await Proposal.findOne({ _id: req.params.id, to: req.user._id });
    if (!p) throw notFound();
    if (p.status !== 'pending') throw badRequest('PROPOSAL_ANSWERED');
    p.status = req.valid.body.action === 'accept' ? 'accepted' : 'declined';
    p.respondedAt = new Date();
    await p.save();
    if (p.status === 'accepted') {
      // Mutual consent: each side can see the other's guardian contact without spending a connection.
      for (const [user, biodata] of [
        [p.from, p.toBiodata],
        [p.to, p.fromBiodata],
      ]) {
        await Unlock.updateOne({ user, biodata }, { $setOnInsert: { cost: 0, source: 'proposal' } }, { upsert: true });
      }
      await notify(p.from, 'proposal_accepted', '/dashboard/unlocked');
    } else {
      await notify(p.from, 'proposal_declined', '/dashboard/proposals');
    }
    res.json({ id: p._id, status: p.status });
  }
);

r.post('/proposals/:id/withdraw', { summary: 'Withdraw a pending proposal I sent' }, async (req, res) => {
  const p = await Proposal.findOne({ _id: req.params.id, from: req.user._id });
  if (!p) throw notFound();
  if (p.status !== 'pending') throw badRequest('PROPOSAL_ANSWERED');
  p.status = 'withdrawn';
  await p.save();
  res.json({ id: p._id, status: p.status });
});

export default r.router;

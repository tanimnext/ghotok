import { Router } from 'express';
import { z } from 'zod';
import { Biodata, toCard } from '../models/Biodata.js';
import { Favorite, Proposal, ProfileView } from '../models/social.js';
import { Unlock, Ledger, Payment, RefundRequest } from '../models/commerce.js';
import { Notification, Report, Ticket, nextSeq } from '../models/support.js';
import { requireAuth } from '../middleware/auth.js';
import { upload, sniffOk } from '../middleware/upload.js';
import { putFile, deleteFile, newKey } from '../services/storage.js';
import { notify } from '../services/notify.js';
import { buildBiodataUpdate, submissionProblems } from '../utils/biodataFields.js';
import { ah, parse, paging, pageMeta, notFound, badRequest, conflict } from '../utils/http.js';
import { values, HIDE_REASONS, DELETE_REASONS } from '../constants.js';

const r = Router();
r.use(requireAuth);

const myBiodata = (userId) => Biodata.findOne({ owner: userId, deletedAt: null });

function ownView(b) {
  const o = b.toObject({ virtuals: true });
  o.code = b.biodataNo ? `GH-${b.biodataNo}` : null;
  o.hasPhoto = Boolean(b.photoKey);
  delete o.photoKey;
  if (o.nid) o.nid = { status: o.nid.status, note: o.nid.note, uploaded: Boolean(b.nid?.fileKey) };
  delete o.__v;
  return o;
}

// ---------- Overview ----------
function dayStr(offsetDays) {
  return new Date(Date.now() + 6 * 3600 * 1000 - offsetDays * 86400000).toISOString().slice(0, 10);
}

r.get(
  '/overview',
  ah(async (req, res) => {
    const uid = req.user._id;
    const b = await myBiodata(uid);
    const deleted = b ? null : await Biodata.findOne({ owner: uid, deletedAt: { $ne: null } }).select('deletedAt recovery biodataNo').lean();
    let views = { today: 0, week: 0, month: 0, total: 0 };
    let favoritedBy = 0;
    if (b) {
      const [today, week, month, favs] = await Promise.all([
        ProfileView.countDocuments({ biodata: b._id, day: dayStr(0) }),
        ProfileView.countDocuments({ biodata: b._id, day: { $gte: dayStr(6) } }),
        ProfileView.countDocuments({ biodata: b._id, day: { $gte: dayStr(29) } }),
        Favorite.countDocuments({ biodata: b._id, kind: 'like' }),
      ]);
      views = { today, week, month, total: b.stats?.views || 0 };
      favoritedBy = favs;
    }
    const [favorites, dislikes, unlocked, sentPending, receivedPending, unread, used] = await Promise.all([
      Favorite.countDocuments({ user: uid, kind: 'like' }),
      Favorite.countDocuments({ user: uid, kind: 'dislike' }),
      Unlock.countDocuments({ user: uid }),
      Proposal.countDocuments({ from: uid, status: 'pending' }),
      Proposal.countDocuments({ to: uid, status: 'pending' }),
      Notification.countDocuments({ user: uid, read: false }),
      Ledger.countDocuments({ user: uid, type: 'unlock' }),
    ]);
    const lastPurchase = await Ledger.findOne({ user: uid, type: 'purchase' }).sort({ createdAt: -1 }).select('createdAt').lean();
    res.json({
      user: req.user.toSafe(),
      biodata: b
        ? { id: b._id, code: b.biodataNo ? `GH-${b.biodataNo}` : null, type: b.type, status: b.status, hidden: b.hidden, reviewNote: b.reviewNote, nidStatus: b.nid?.status || 'none', district: b.address?.permanentDistrict }
        : null,
      deletedBiodata: deleted ? { code: deleted.biodataNo ? `GH-${deleted.biodataNo}` : null, deletedAt: deleted.deletedAt, recovery: deleted.recovery } : null,
      connections: { balance: req.user.connections, used, lastPurchaseAt: lastPurchase?.createdAt || null },
      views,
      favoritedBy,
      lists: { favorites, dislikes, unlocked, favoritedBy },
      proposals: { sentPending, receivedPending },
      unreadNotifications: unread,
    });
  })
);

// ---------- My biodata ----------
r.get(
  '/biodata',
  ah(async (req, res) => {
    const b = await myBiodata(req.user._id);
    res.json({ biodata: b ? ownView(b) : null });
  })
);

r.put(
  '/biodata',
  ah(async (req, res) => {
    let b = await myBiodata(req.user._id);
    if (!b) {
      if (await Biodata.exists({ owner: req.user._id })) throw conflict('Your previous biodata was deleted. Ask for it to be restored instead.');
      if (!['groom', 'bride'].includes(req.body.type)) throw badRequest('Please check the highlighted fields', { type: 'Choose groom or bride' });
      b = await Biodata.create({ owner: req.user._id, type: req.body.type, status: 'draft' });
    }
    const update = buildBiodataUpdate(req.body);
    // Drop no-op changes so re-saving an unchanged form does not trigger a review.
    const current = b.toObject();
    const at = (p) => p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), current);
    const same = (a, c) => JSON.stringify(a instanceof Date ? a.toISOString() : a) === JSON.stringify(c instanceof Date ? c.toISOString() : c);
    for (const [k, v] of Object.entries(update.$set || {})) {
      const cur = at(k);
      const next = v instanceof Date ? v.toISOString() : v;
      if (same(next, cur)) delete update.$set[k];
    }
    for (const k of Object.keys(update.$unset || {})) if (at(k) === undefined || at(k) === null) delete update.$unset[k];
    if (update.$set && !Object.keys(update.$set).length) delete update.$set;
    if (update.$unset && !Object.keys(update.$unset).length) delete update.$unset;
    // Editing an approved biodata sends it back for review.
    if (b.status === 'approved' && Object.keys(update).length) {
      update.$set = { ...(update.$set || {}), status: 'pending', submittedAt: new Date() };
    }
    if (Object.keys(update).length) {
      b = await Biodata.findOneAndUpdate({ _id: b._id }, update, { new: true, runValidators: true });
    }
    res.json({ biodata: ownView(b), problems: submissionProblems(b, req.user.phone) });
  })
);

r.post(
  '/biodata/submit',
  ah(async (req, res) => {
    const b = await myBiodata(req.user._id);
    if (!b) throw notFound('Create your biodata first');
    if (b.status === 'pending') return res.json({ biodata: ownView(b) });
    if (b.status === 'approved') throw badRequest('Your biodata is already approved');
    const problems = submissionProblems(b, req.user.phone);
    if (problems.length) {
      const err = badRequest('Some required information is missing', Object.fromEntries(problems.map((p) => [p.split(':')[0], p.split(':')[1] || 'required'])));
      err.code = 'INCOMPLETE';
      throw err;
    }
    if (!b.biodataNo) b.biodataNo = await nextSeq('biodataNo', 1000);
    b.status = 'pending';
    b.submittedAt = new Date();
    await b.save();
    res.json({ biodata: ownView(b) });
  })
);

r.post(
  '/biodata/visibility',
  ah(async (req, res) => {
    const d = parse(z.object({ hidden: z.boolean(), reason: z.enum(values(HIDE_REASONS)).optional() }), req.body);
    const b = await myBiodata(req.user._id);
    if (!b) throw notFound('Create your biodata first');
    if (d.hidden && !d.reason) throw badRequest('Please check the highlighted fields', { reason: 'Choose a reason' });
    b.hidden = d.hidden;
    b.hiddenReason = d.hidden ? d.reason : undefined;
    await b.save();
    res.json({ biodata: ownView(b) });
  })
);

r.post(
  '/biodata/delete',
  ah(async (req, res) => {
    const d = parse(z.object({ reason: z.enum(values(DELETE_REASONS)), note: z.string().trim().max(500).optional() }), req.body);
    const b = await myBiodata(req.user._id);
    if (!b) throw notFound('No biodata to delete');
    b.deletedAt = new Date();
    b.deleteReason = d.reason;
    b.deleteNote = d.note;
    b.recovery = { status: 'none' };
    await b.save();
    await Proposal.updateMany({ $or: [{ fromBiodata: b._id }, { toBiodata: b._id }], status: 'pending' }, { status: 'withdrawn' });
    res.json({ ok: true });
  })
);

r.post(
  '/biodata/recovery',
  ah(async (req, res) => {
    const d = parse(z.object({ note: z.string().trim().max(500).optional() }), req.body);
    const b = await Biodata.findOne({ owner: req.user._id, deletedAt: { $ne: null } });
    if (!b) throw notFound('No deleted biodata found');
    if (b.recovery?.status === 'pending') throw conflict('A restore request is already waiting for review');
    b.recovery = { status: 'pending', note: d.note, requestedAt: new Date() };
    await b.save();
    res.json({ recovery: b.recovery });
  })
);

async function saveUpload(req, folder) {
  if (!req.file) throw badRequest('Choose a file to upload');
  if (!sniffOk(req.file.buffer, req.file.mimetype)) throw badRequest('This file does not look like a valid image or PDF');
  const key = newKey(folder, req.file.mimetype);
  await putFile(key, req.file.buffer, req.file.mimetype);
  return key;
}

r.post(
  '/biodata/photo',
  upload.single('file'),
  ah(async (req, res) => {
    const b = await myBiodata(req.user._id);
    if (!b) throw notFound('Create your biodata first');
    if (req.file?.mimetype === 'application/pdf') throw badRequest('Photo must be JPG, PNG or WEBP');
    const key = await saveUpload(req, 'photos');
    const old = b.photoKey;
    b.photoKey = key;
    await b.save();
    await deleteFile(old);
    res.json({ hasPhoto: true });
  })
);

r.delete(
  '/biodata/photo',
  ah(async (req, res) => {
    const b = await myBiodata(req.user._id);
    if (!b) throw notFound();
    await deleteFile(b.photoKey);
    b.photoKey = undefined;
    await b.save();
    res.json({ hasPhoto: false });
  })
);

r.post(
  '/biodata/nid',
  upload.single('file'),
  ah(async (req, res) => {
    const b = await myBiodata(req.user._id);
    if (!b) throw notFound('Create your biodata first');
    if (b.nid?.status === 'verified') throw badRequest('Your NID is already verified');
    const key = await saveUpload(req, 'nid');
    const old = b.nid?.fileKey;
    b.nid = { fileKey: key, status: 'submitted' };
    await b.save();
    await deleteFile(old);
    res.json({ nid: { status: 'submitted', uploaded: true } });
  })
);

// ---------- Lists ----------
async function cardsFor(biodataIds) {
  const items = await Biodata.find({ _id: { $in: biodataIds }, deletedAt: null }).lean();
  const map = new Map(items.map((b) => [String(b._id), b]));
  return biodataIds.map((id) => map.get(String(id))).filter(Boolean);
}

r.get(
  '/favorites',
  ah(async (req, res) => {
    const kind = req.query.kind === 'dislike' ? 'dislike' : 'like';
    const { page, limit, skip } = paging(req.query, 24);
    const filter = { user: req.user._id, kind };
    const [favs, total] = await Promise.all([Favorite.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), Favorite.countDocuments(filter)]);
    const cards = await cardsFor(favs.map((f) => f.biodata));
    res.json({ items: cards.map((b) => ({ ...toCard(b), available: b.status === 'approved' && !b.hidden })), ...pageMeta(total, page, limit) });
  })
);

r.get(
  '/favorited-me',
  ah(async (req, res) => {
    const b = await myBiodata(req.user._id);
    if (!b) return res.json({ items: [], total: 0, page: 1, limit: 24, pages: 1 });
    const { page, limit, skip } = paging(req.query, 24);
    const filter = { biodata: b._id, kind: 'like' };
    const [favs, total] = await Promise.all([Favorite.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), Favorite.countDocuments(filter)]);
    // Show the likers' own public biodatas when they have one.
    const theirs = await Biodata.find({ owner: { $in: favs.map((f) => f.user) }, status: 'approved', hidden: false, deletedAt: null }).lean();
    res.json({ items: theirs.map(toCard), anonymous: favs.length - theirs.length, ...pageMeta(total, page, limit) });
  })
);

r.get(
  '/unlocked',
  ah(async (req, res) => {
    const unlocks = await Unlock.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(200).lean();
    const items = await Biodata.find({ _id: { $in: unlocks.map((u) => u.biodata) } }).lean();
    const map = new Map(items.map((b) => [String(b._id), b]));
    res.json({
      items: unlocks
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
            contact: b.deletedAt ? null : { guardianName: b.contact?.guardianName, guardianRelation: b.contact?.guardianRelation, guardianPhone: b.contact?.guardianPhone, guardianPhone2: b.contact?.guardianPhone2, email: b.contact?.email, candidateName: b.contact?.candidateName },
          };
        })
        .filter(Boolean),
    });
  })
);

// ---------- Proposals ----------
r.get(
  '/proposals',
  ah(async (req, res) => {
    const received = req.query.box === 'received';
    const filter = received ? { to: req.user._id } : { from: req.user._id };
    if (req.query.status) filter.status = req.query.status;
    const ps = await Proposal.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    const ids = ps.map((p) => (received ? p.fromBiodata : p.toBiodata));
    const bs = await Biodata.find({ _id: { $in: ids } }).lean();
    const map = new Map(bs.map((b) => [String(b._id), b]));
    res.json({
      items: ps.map((p) => {
        const b = map.get(String(received ? p.fromBiodata : p.toBiodata));
        return { id: p._id, status: p.status, message: p.message, createdAt: p.createdAt, respondedAt: p.respondedAt, biodata: b ? toCard(b) : null };
      }),
    });
  })
);

r.post(
  '/proposals/:id/respond',
  ah(async (req, res) => {
    const { action } = parse(z.object({ action: z.enum(['accept', 'decline']) }), req.body);
    const p = await Proposal.findOne({ _id: req.params.id, to: req.user._id });
    if (!p) throw notFound('Proposal not found');
    if (p.status !== 'pending') throw badRequest('This proposal was already answered');
    p.status = action === 'accept' ? 'accepted' : 'declined';
    p.respondedAt = new Date();
    await p.save();
    if (p.status === 'accepted') {
      // Mutual consent: both sides can see each other's guardian contact for free.
      for (const [user, biodata] of [[p.from, p.toBiodata], [p.to, p.fromBiodata]]) {
        await Unlock.updateOne({ user, biodata }, { $setOnInsert: { cost: 0, source: 'proposal' } }, { upsert: true });
      }
      await notify(p.from, 'proposal_accepted', '/dashboard/unlocked');
    } else {
      await notify(p.from, 'proposal_declined', '/dashboard/proposals');
    }
    res.json({ id: p._id, status: p.status });
  })
);

r.post(
  '/proposals/:id/withdraw',
  ah(async (req, res) => {
    const p = await Proposal.findOne({ _id: req.params.id, from: req.user._id });
    if (!p) throw notFound('Proposal not found');
    if (p.status !== 'pending') throw badRequest('Only pending proposals can be withdrawn');
    p.status = 'withdrawn';
    await p.save();
    res.json({ id: p._id, status: p.status });
  })
);

// ---------- Money ----------
r.get(
  '/ledger',
  ah(async (req, res) => {
    const { page, limit, skip } = paging(req.query, 20);
    const [items, total] = await Promise.all([
      Ledger.find({ user: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Ledger.countDocuments({ user: req.user._id }),
    ]);
    res.json({ items, ...pageMeta(total, page, limit) });
  })
);

r.get(
  '/payments',
  ah(async (req, res) => {
    const items = await Payment.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100).populate('package', 'name connections').lean();
    res.json({ items });
  })
);

r.get(
  '/refunds',
  ah(async (req, res) => {
    const items = await RefundRequest.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100).populate('biodata', 'biodataNo').lean();
    res.json({ items });
  })
);

r.post(
  '/refunds',
  ah(async (req, res) => {
    const d = parse(z.object({ unlockId: z.string(), reason: z.string().trim().min(3).max(200), details: z.string().trim().max(2000).optional() }), req.body);
    const unlock = await Unlock.findOne({ _id: d.unlockId, user: req.user._id });
    if (!unlock) throw notFound('Unlocked contact not found');
    if (unlock.source !== 'connection' || unlock.refunded) throw badRequest('This contact is not eligible for a refund');
    if (await RefundRequest.exists({ unlock: unlock._id, status: 'pending' })) throw conflict('A refund request is already waiting for review');
    const rr = await RefundRequest.create({ user: req.user._id, unlock: unlock._id, biodata: unlock.biodata, reason: d.reason, details: d.details });
    res.status(201).json({ refund: rr });
  })
);

r.get(
  '/reports',
  ah(async (req, res) => {
    const items = await Report.find({ reporter: req.user._id }).sort({ createdAt: -1 }).limit(100).populate('biodata', 'biodataNo').lean();
    res.json({ items });
  })
);

// ---------- Notifications ----------
r.get(
  '/notifications',
  ah(async (req, res) => {
    const items = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ items, unread: items.filter((n) => !n.read).length });
  })
);

r.post(
  '/notifications/read-all',
  ah(async (req, res) => {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ ok: true });
  })
);

// ---------- Support tickets ----------
r.get(
  '/tickets',
  ah(async (req, res) => {
    const items = await Ticket.find({ user: req.user._id }).sort({ lastActivityAt: -1 }).select('-messages').limit(100).lean();
    res.json({ items });
  })
);

r.post(
  '/tickets',
  ah(async (req, res) => {
    const d = parse(
      z.object({
        subject: z.string().trim().min(3, 'Write a short subject').max(160),
        category: z.enum(['account', 'biodata', 'payment', 'report', 'other']).default('other'),
        body: z.string().trim().min(5, 'Describe the problem').max(4000),
      }),
      req.body
    );
    const open = await Ticket.countDocuments({ user: req.user._id, status: { $ne: 'closed' } });
    if (open >= 5) throw badRequest('You have too many open tickets. Please wait for a reply.');
    const t = await Ticket.create({ user: req.user._id, subject: d.subject, category: d.category, messages: [{ author: req.user._id, body: d.body }] });
    res.status(201).json({ ticket: t });
  })
);

r.get(
  '/tickets/:id',
  ah(async (req, res) => {
    const t = await Ticket.findOne({ _id: req.params.id, user: req.user._id }).lean();
    if (!t) throw notFound('Ticket not found');
    res.json({ ticket: t });
  })
);

r.post(
  '/tickets/:id/messages',
  ah(async (req, res) => {
    const { body } = parse(z.object({ body: z.string().trim().min(1).max(4000) }), req.body);
    const t = await Ticket.findOne({ _id: req.params.id, user: req.user._id });
    if (!t) throw notFound('Ticket not found');
    if (t.status === 'closed') throw badRequest('This ticket is closed. Open a new one.');
    t.messages.push({ author: req.user._id, body });
    t.status = 'open';
    t.lastActivityAt = new Date();
    await t.save();
    res.json({ ticket: t });
  })
);

export default r;

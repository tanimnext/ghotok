import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Biodata, toCard } from '../models/Biodata.js';
import { Package, Payment, Ledger, Unlock, RefundRequest } from '../models/commerce.js';
import { Report, Ticket, AuditLog, nextSeq } from '../models/support.js';
import { Proposal } from '../models/social.js';
import { requireAuth, requireRole, hasRole } from '../middleware/auth.js';
import { adjustConnections } from '../services/connections.js';
import { notify, audit } from '../services/notify.js';
import { approvePayment } from './payments.js';
import { ah, parse, paging, pageMeta, notFound, badRequest, forbidden, escapeRegex } from '../utils/http.js';
import { normalizeBdPhone } from '../utils/phone.js';
import { ROLES } from '../constants.js';

const r = Router();
r.use(requireAuth, requireRole('support'));

const support = requireRole('support');
const admin = requireRole('admin');
const superadmin = requireRole('superadmin');

const userBrief = 'name email phone role status connections createdAt';

// ================= Overview & analytics =================
r.get(
  '/overview',
  ah(async (_req, res) => {
    const since30 = new Date(Date.now() - 30 * 86400000);
    const since14 = new Date(Date.now() - 13 * 86400000);
    since14.setHours(0, 0, 0, 0);
    const [
      paymentsPending, biodatasPending, nidPending, reportsOpen, recoveryPending, refundsPending, ticketsOpen,
      usersTotal, biodatasApproved, revenueAgg, signupSeries, revenueSeries, statusAgg,
    ] = await Promise.all([
      Payment.countDocuments({ status: 'pending' }),
      Biodata.countDocuments({ status: 'pending', deletedAt: null }),
      Biodata.countDocuments({ 'nid.status': 'submitted', deletedAt: null }),
      Report.countDocuments({ status: { $in: ['open', 'reviewing'] } }),
      Biodata.countDocuments({ 'recovery.status': 'pending' }),
      RefundRequest.countDocuments({ status: 'pending' }),
      Ticket.countDocuments({ status: 'open' }),
      User.countDocuments({ role: 'user' }),
      Biodata.countDocuments({ status: 'approved', deletedAt: null }),
      Payment.aggregate([{ $match: { status: 'approved', reviewedAt: { $gte: since30 } } }, { $group: { _id: null, sum: { $sum: '$amount' }, n: { $sum: 1 } } }]),
      User.aggregate([
        { $match: { createdAt: { $gte: since14 }, role: 'user' } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Dhaka' } }, n: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { status: 'approved', reviewedAt: { $gte: since14 } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$reviewedAt', timezone: 'Asia/Dhaka' } }, sum: { $sum: '$amount' } } },
      ]),
      Biodata.aggregate([{ $match: { deletedAt: null } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    ]);
    const days = [];
    for (let i = 13; i >= 0; i -= 1) days.push(new Date(Date.now() + 6 * 3600000 - i * 86400000).toISOString().slice(0, 10));
    const sMap = Object.fromEntries(signupSeries.map((x) => [x._id, x.n]));
    const rMap = Object.fromEntries(revenueSeries.map((x) => [x._id, x.sum]));
    res.json({
      queues: { paymentsPending, biodatasPending, nidPending, reportsOpen, recoveryPending, refundsPending, ticketsOpen },
      totals: { usersTotal, biodatasApproved, revenue30: revenueAgg[0]?.sum || 0, payments30: revenueAgg[0]?.n || 0 },
      biodataByStatus: Object.fromEntries(statusAgg.map((x) => [x._id, x.n])),
      series: days.map((d) => ({ day: d, signups: sMap[d] || 0, revenue: rMap[d] || 0 })),
    });
  })
);

// ================= Biodatas =================
r.get(
  '/biodatas',
  support,
  ah(async (req, res) => {
    const { page, limit, skip } = paging(req.query, 20);
    const f = {};
    if (req.query.deleted === '1') f.deletedAt = { $ne: null };
    else f.deletedAt = null;
    if (req.query.status) f.status = req.query.status;
    if (req.query.nid) f['nid.status'] = req.query.nid;
    if (req.query.type) f.type = req.query.type;
    if (req.query.q) {
      const n = parseInt(String(req.query.q).replace(/\D/g, ''), 10);
      const rx = new RegExp(escapeRegex(req.query.q), 'i');
      f.$or = [{ 'contact.candidateName': rx }, { 'contact.guardianPhone': rx }, ...(n ? [{ biodataNo: n }] : [])];
    }
    const sort = req.query.status === 'pending' ? { submittedAt: 1 } : { updatedAt: -1 };
    const [items, total] = await Promise.all([
      Biodata.find(f).sort(sort).skip(skip).limit(limit).populate('owner', userBrief).lean(),
      Biodata.countDocuments(f),
    ]);
    res.json({
      items: items.map((b) => ({
        ...toCard(b), status: b.status, hidden: b.hidden, nidStatus: b.nid?.status || 'none', submittedAt: b.submittedAt,
        updatedAt: b.updatedAt, deletedAt: b.deletedAt, owner: b.owner, candidateName: b.contact?.candidateName,
      })),
      ...pageMeta(total, page, limit),
    });
  })
);

r.get(
  '/biodatas/:id',
  support,
  ah(async (req, res) => {
    const b = await Biodata.findById(req.params.id).populate('owner', userBrief).populate('reviewedBy', 'name').lean({ virtuals: true });
    if (!b) throw notFound('Biodata not found');
    const [reports, unlocks, proposals] = await Promise.all([
      Report.find({ biodata: b._id }).sort({ createdAt: -1 }).limit(20).populate('reporter', 'name').lean(),
      Unlock.countDocuments({ biodata: b._id }),
      Proposal.countDocuments({ toBiodata: b._id }),
    ]);
    const hasNid = Boolean(b.nid?.fileKey);
    const hasPhoto = Boolean(b.photoKey);
    delete b.photoKey;
    if (b.nid) delete b.nid.fileKey;
    res.json({ biodata: { ...b, code: b.biodataNo ? `GH-${b.biodataNo}` : null, hasNid, hasPhoto }, reports, counts: { unlocks, proposals } });
  })
);

r.post(
  '/biodatas/:id/review',
  support,
  ah(async (req, res) => {
    const d = parse(z.object({ decision: z.enum(['approved', 'rejected', 'changes_requested']), note: z.string().trim().max(1000).optional() }), req.body);
    if (d.decision !== 'approved' && !d.note) throw badRequest('Please check the highlighted fields', { note: 'Tell the user what to fix' });
    const b = await Biodata.findOne({ _id: req.params.id, deletedAt: null });
    if (!b) throw notFound('Biodata not found');
    b.status = d.decision;
    b.reviewNote = d.note;
    b.reviewedBy = req.user._id;
    b.reviewedAt = new Date();
    if (d.decision === 'approved') {
      b.approvedAt = b.approvedAt || new Date();
      if (!b.biodataNo) b.biodataNo = await nextSeq('biodataNo', 1000);
    }
    await b.save();
    await notify(b.owner, `biodata_${d.decision}`, '/dashboard/biodata');
    await audit(req.user._id, `biodata.${d.decision}`, 'Biodata', b._id, { note: d.note });
    res.json({ status: b.status });
  })
);

r.post(
  '/biodatas/:id/nid',
  support,
  ah(async (req, res) => {
    const d = parse(z.object({ decision: z.enum(['verified', 'rejected']), note: z.string().trim().max(500).optional() }), req.body);
    const b = await Biodata.findById(req.params.id);
    if (!b?.nid?.fileKey) throw notFound('No NID uploaded');
    b.nid.status = d.decision;
    b.nid.note = d.note;
    b.nid.verifiedBy = req.user._id;
    b.nid.verifiedAt = new Date();
    await b.save();
    await notify(b.owner, `nid_${d.decision}`, '/dashboard/biodata');
    await audit(req.user._id, `nid.${d.decision}`, 'Biodata', b._id, { note: d.note });
    res.json({ nid: { status: b.nid.status } });
  })
);

// Staff can hide a biodata from search (e.g. while a report is investigated).
r.post(
  '/biodatas/:id/hide',
  support,
  ah(async (req, res) => {
    const d = parse(z.object({ hidden: z.boolean(), reason: z.string().trim().max(200).optional() }), req.body);
    const b = await Biodata.findById(req.params.id);
    if (!b) throw notFound();
    b.hidden = d.hidden;
    b.hiddenReason = d.hidden ? d.reason || 'staff' : undefined;
    await b.save();
    await audit(req.user._id, d.hidden ? 'biodata.hide' : 'biodata.unhide', 'Biodata', b._id, { reason: d.reason });
    res.json({ hidden: b.hidden });
  })
);

// ================= Soft-delete recovery queue =================
r.get(
  '/recovery',
  admin,
  ah(async (req, res) => {
    const status = req.query.status || 'pending';
    const items = await Biodata.find({ deletedAt: { $ne: null }, 'recovery.status': status })
      .sort({ 'recovery.requestedAt': 1 }).limit(100).populate('owner', userBrief).lean();
    res.json({
      items: items.map((b) => ({
        _id: b._id, code: b.biodataNo ? `GH-${b.biodataNo}` : null, type: b.type, owner: b.owner, deletedAt: b.deletedAt,
        deleteReason: b.deleteReason, deleteNote: b.deleteNote, recovery: b.recovery, candidateName: b.contact?.candidateName,
      })),
    });
  })
);

r.post(
  '/recovery/:id',
  admin,
  ah(async (req, res) => {
    const d = parse(z.object({ decision: z.enum(['approve', 'decline']), note: z.string().trim().max(500).optional() }), req.body);
    const b = await Biodata.findOne({ _id: req.params.id, deletedAt: { $ne: null }, 'recovery.status': 'pending' });
    if (!b) throw notFound('No pending restore request');
    b.recovery.decidedAt = new Date();
    b.recovery.decidedBy = req.user._id;
    if (d.decision === 'approve') {
      b.recovery.status = 'approved';
      b.deletedAt = null;
      b.status = 'pending'; // re-review after restore
      b.submittedAt = new Date();
    } else {
      b.recovery.status = 'declined';
      b.recovery.note = d.note || b.recovery.note;
    }
    await b.save();
    await notify(b.owner, d.decision === 'approve' ? 'recovery_approved' : 'recovery_declined', '/dashboard');
    await audit(req.user._id, `recovery.${d.decision}`, 'Biodata', b._id, { note: d.note });
    res.json({ recovery: b.recovery, deletedAt: b.deletedAt });
  })
);

// ================= Payments =================
r.get(
  '/payments',
  admin,
  ah(async (req, res) => {
    const { page, limit, skip } = paging(req.query, 25);
    const f = {};
    if (req.query.status) f.status = req.query.status;
    if (req.query.method) f.method = req.query.method;
    if (req.query.q) {
      const q = String(req.query.q).trim();
      const phone = normalizeBdPhone(q);
      f.$or = [{ trxId: q.toUpperCase() }, ...(phone ? [{ senderNumber: phone }] : [])];
    }
    const [items, total] = await Promise.all([
      Payment.find(f).sort({ createdAt: req.query.status === 'pending' ? 1 : -1 }).skip(skip).limit(limit)
        .populate('user', userBrief).populate('package', 'name').populate('reviewedBy', 'name').lean(),
      Payment.countDocuments(f),
    ]);
    res.json({ items, ...pageMeta(total, page, limit) });
  })
);

r.post(
  '/payments/:id/approve',
  admin,
  ah(async (req, res) => {
    const { note } = parse(z.object({ note: z.string().trim().max(300).optional() }), req.body);
    const p = await approvePayment(req.params.id, req.user._id, note);
    if (!p) throw badRequest('This payment is not waiting for review');
    await audit(req.user._id, 'payment.approve', 'Payment', p._id, { amount: p.amount, trxId: p.trxId });
    res.json({ status: p.status });
  })
);

r.post(
  '/payments/:id/reject',
  admin,
  ah(async (req, res) => {
    const { note } = parse(z.object({ note: z.string().trim().min(3, 'Give a reason').max(300) }), req.body);
    const p = await Payment.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ['pending', 'initiated'] } },
      { status: 'rejected', note, reviewedBy: req.user._id, reviewedAt: new Date() },
      { new: true }
    );
    if (!p) throw badRequest('This payment is not waiting for review');
    await notify(p.user, 'payment_rejected', '/dashboard/connections');
    await audit(req.user._id, 'payment.reject', 'Payment', p._id, { note, trxId: p.trxId });
    res.json({ status: p.status });
  })
);

// ================= Refunds =================
r.get(
  '/refunds',
  admin,
  ah(async (req, res) => {
    const f = { status: req.query.status || 'pending' };
    const items = await RefundRequest.find(f).sort({ createdAt: 1 }).limit(100)
      .populate('user', userBrief).populate('biodata', 'biodataNo type').populate('report', 'reason details status').lean();
    res.json({ items });
  })
);

r.post(
  '/refunds/:id',
  admin,
  ah(async (req, res) => {
    const d = parse(z.object({ decision: z.enum(['approved', 'rejected']), resolution: z.string().trim().max(500).optional() }), req.body);
    const rr = await RefundRequest.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { status: d.decision, resolution: d.resolution, reviewedBy: req.user._id, reviewedAt: new Date() },
      { new: true }
    );
    if (!rr) throw badRequest('This refund request is not pending');
    if (d.decision === 'approved') {
      await adjustConnections(rr.user, rr.connections || 1, 'refund', { ref: rr._id, refModel: 'RefundRequest', note: d.resolution, actor: req.user._id });
      if (rr.unlock) await Unlock.updateOne({ _id: rr.unlock }, { refunded: true });
    }
    await notify(rr.user, d.decision === 'approved' ? 'refund_approved' : 'refund_rejected', '/dashboard/connections');
    await audit(req.user._id, `refund.${d.decision}`, 'RefundRequest', rr._id, { resolution: d.resolution });
    res.json({ status: rr.status });
  })
);

// ================= Connection adjustments =================
r.post(
  '/users/:id/connections',
  admin,
  ah(async (req, res) => {
    const d = parse(
      z.object({
        action: z.enum(['grant', 'revoke', 'refund']),
        amount: z.coerce.number().int().min(1).max(100),
        reason: z.string().trim().min(3, 'Write a reason for the audit log').max(300),
      }),
      req.body
    );
    const delta = d.action === 'revoke' ? -d.amount : d.amount;
    const type = { grant: 'admin_grant', revoke: 'admin_revoke', refund: 'refund' }[d.action];
    const balance = await adjustConnections(req.params.id, delta, type, { note: d.reason, actor: req.user._id });
    await notify(req.params.id, 'connections_adjusted', '/dashboard/connections');
    await audit(req.user._id, `connections.${d.action}`, 'User', req.params.id, { amount: d.amount, reason: d.reason, balance });
    res.json({ connections: balance });
  })
);

r.get(
  '/users/:id/ledger',
  support,
  ah(async (req, res) => {
    const items = await Ledger.find({ user: req.params.id }).sort({ createdAt: -1 }).limit(200).populate('actor', 'name').lean();
    res.json({ items });
  })
);

// ================= Reports =================
r.get(
  '/reports',
  support,
  ah(async (req, res) => {
    const { page, limit, skip } = paging(req.query, 25);
    const f = {};
    if (req.query.status) f.status = req.query.status === 'active' ? { $in: ['open', 'reviewing'] } : req.query.status;
    const [items, total] = await Promise.all([
      Report.find(f).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('reporter', userBrief).populate('biodata', 'biodataNo type status hidden owner').populate('resolvedBy', 'name').lean(),
      Report.countDocuments(f),
    ]);
    res.json({ items, ...pageMeta(total, page, limit) });
  })
);

r.post(
  '/reports/:id',
  support,
  ah(async (req, res) => {
    const d = parse(
      z.object({
        status: z.enum(['reviewing', 'resolved', 'dismissed']),
        action: z.string().trim().max(500).optional(),
        hideBiodata: z.boolean().optional(),
      }),
      req.body
    );
    const rep = await Report.findById(req.params.id);
    if (!rep) throw notFound('Report not found');
    rep.status = d.status;
    if (d.action) rep.action = d.action;
    if (d.status !== 'reviewing') {
      rep.resolvedBy = req.user._id;
      rep.resolvedAt = new Date();
    }
    await rep.save();
    if (d.hideBiodata) await Biodata.updateOne({ _id: rep.biodata }, { hidden: true, hiddenReason: 'report' });
    if (d.status === 'resolved' || d.status === 'dismissed') await notify(rep.reporter, 'report_resolved', '/dashboard/support');
    await audit(req.user._id, `report.${d.status}`, 'Report', rep._id, { action: d.action, hideBiodata: d.hideBiodata });
    res.json({ status: rep.status });
  })
);

// ================= Support tickets =================
r.get(
  '/tickets',
  support,
  ah(async (req, res) => {
    const { page, limit, skip } = paging(req.query, 25);
    const f = {};
    if (req.query.status) f.status = req.query.status;
    const [items, total] = await Promise.all([
      Ticket.find(f).sort({ lastActivityAt: -1 }).skip(skip).limit(limit).select('-messages').populate('user', userBrief).lean(),
      Ticket.countDocuments(f),
    ]);
    res.json({ items, ...pageMeta(total, page, limit) });
  })
);

r.get(
  '/tickets/:id',
  support,
  ah(async (req, res) => {
    const t = await Ticket.findById(req.params.id).populate('user', userBrief).populate('messages.author', 'name role').lean();
    if (!t) throw notFound('Ticket not found');
    res.json({ ticket: t });
  })
);

r.post(
  '/tickets/:id/messages',
  support,
  ah(async (req, res) => {
    const d = parse(z.object({ body: z.string().trim().min(1).max(4000), close: z.boolean().optional() }), req.body);
    const t = await Ticket.findById(req.params.id);
    if (!t) throw notFound('Ticket not found');
    t.messages.push({ author: req.user._id, staff: true, body: d.body });
    t.status = d.close ? 'closed' : 'answered';
    t.lastActivityAt = new Date();
    await t.save();
    await notify(t.user, 'ticket_replied', `/dashboard/support/${t._id}`);
    res.json({ status: t.status });
  })
);

r.post(
  '/tickets/:id/status',
  support,
  ah(async (req, res) => {
    const { status } = parse(z.object({ status: z.enum(['open', 'answered', 'closed']) }), req.body);
    const t = await Ticket.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!t) throw notFound('Ticket not found');
    res.json({ status: t.status });
  })
);

// ================= Users & roles =================
r.get(
  '/users',
  support,
  ah(async (req, res) => {
    const { page, limit, skip } = paging(req.query, 25);
    const f = {};
    if (req.query.role) f.role = req.query.role;
    if (req.query.status) f.status = req.query.status;
    if (req.query.q) {
      const q = String(req.query.q).trim();
      const rx = new RegExp(escapeRegex(q), 'i');
      const phone = normalizeBdPhone(q);
      f.$or = [{ name: rx }, { email: rx }, ...(phone ? [{ phone }] : [{ phone: rx }])];
    }
    const [items, total] = await Promise.all([User.find(f).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), User.countDocuments(f)]);
    res.json({ items: items.map(({ passwordHash, resetTokenHash, ...u }) => u), ...pageMeta(total, page, limit) });
  })
);

r.get(
  '/users/:id',
  support,
  ah(async (req, res) => {
    const u = await User.findById(req.params.id).lean();
    if (!u) throw notFound('User not found');
    const [biodata, payments, unlocks, reportsAgainst] = await Promise.all([
      Biodata.findOne({ owner: u._id }).select('biodataNo type status hidden deletedAt nid.status').lean(),
      Payment.find({ user: u._id }).sort({ createdAt: -1 }).limit(20).populate('package', 'name').lean(),
      Unlock.countDocuments({ user: u._id }),
      Report.countDocuments({ reporter: u._id }),
    ]);
    res.json({ user: u, biodata, payments, counts: { unlocks, reportsFiled: reportsAgainst } });
  })
);

r.post(
  '/users/:id/role',
  superadmin,
  ah(async (req, res) => {
    const { role } = parse(z.object({ role: z.enum(ROLES) }), req.body);
    if (String(req.params.id) === String(req.user._id)) throw badRequest('You cannot change your own role');
    const u = await User.findById(req.params.id);
    if (!u) throw notFound('User not found');
    const before = u.role;
    u.role = role;
    u.tokenVersion = (u.tokenVersion || 0) + 1; // force re-login with the new role
    await u.save();
    await audit(req.user._id, 'user.role', 'User', u._id, { from: before, to: role });
    res.json({ role: u.role });
  })
);

r.post(
  '/users/:id/status',
  admin,
  ah(async (req, res) => {
    const d = parse(z.object({ status: z.enum(['active', 'suspended']), reason: z.string().trim().max(300).optional() }), req.body);
    if (String(req.params.id) === String(req.user._id)) throw badRequest('You cannot suspend yourself');
    const u = await User.findById(req.params.id);
    if (!u) throw notFound('User not found');
    if (u.role !== 'user' && !hasRole(req.user, 'superadmin')) throw forbidden('Only a super admin can suspend staff');
    u.status = d.status;
    u.suspendReason = d.status === 'suspended' ? d.reason : undefined;
    if (d.status === 'suspended') {
      u.tokenVersion = (u.tokenVersion || 0) + 1;
      await Biodata.updateOne({ owner: u._id }, { hidden: true, hiddenReason: 'suspended' });
    }
    await u.save();
    await audit(req.user._id, `user.${d.status}`, 'User', u._id, { reason: d.reason });
    res.json({ status: u.status });
  })
);

// ================= Packages =================
const packageSchema = z.object({
  nameEn: z.string().trim().min(2).max(60),
  nameBn: z.string().trim().min(2).max(60),
  connections: z.coerce.number().int().min(1).max(100),
  price: z.coerce.number().int().min(0).max(100000),
  active: z.boolean().default(true),
  highlight: z.boolean().default(false),
  sort: z.coerce.number().int().default(0),
});

r.get('/packages', admin, ah(async (_req, res) => res.json({ items: await Package.find().sort({ sort: 1, price: 1 }).lean() })));

r.post(
  '/packages',
  superadmin,
  ah(async (req, res) => {
    const d = parse(packageSchema, req.body);
    const p = await Package.create({ name: { en: d.nameEn, bn: d.nameBn }, connections: d.connections, price: d.price, active: d.active, highlight: d.highlight, sort: d.sort });
    await audit(req.user._id, 'package.create', 'Package', p._id, d);
    res.status(201).json({ package: p });
  })
);

r.put(
  '/packages/:id',
  superadmin,
  ah(async (req, res) => {
    const d = parse(packageSchema, req.body);
    const p = await Package.findByIdAndUpdate(
      req.params.id,
      { name: { en: d.nameEn, bn: d.nameBn }, connections: d.connections, price: d.price, active: d.active, highlight: d.highlight, sort: d.sort },
      { new: true, runValidators: true }
    );
    if (!p) throw notFound('Package not found');
    await audit(req.user._id, 'package.update', 'Package', p._id, d);
    res.json({ package: p });
  })
);

// ================= Audit log =================
r.get(
  '/audit',
  admin,
  ah(async (req, res) => {
    const { page, limit, skip } = paging(req.query, 50);
    const f = {};
    if (req.query.action) f.action = new RegExp(`^${escapeRegex(req.query.action)}`);
    const [items, total] = await Promise.all([
      AuditLog.find(f).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('actor', 'name role').lean(),
      AuditLog.countDocuments(f),
    ]);
    res.json({ items, ...pageMeta(total, page, limit) });
  })
);

export default r;

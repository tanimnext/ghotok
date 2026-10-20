/** Staff money tools: payment verification and CSV export, refunds, manual connection changes, packages. */
import { z } from 'zod';
import { values, PAYMENT_METHODS, normalizeBdPhone } from '@ghotok/shared';
import { createRouter } from '../../core/router.js';
import { paging, pageMeta, notFound, badRequest } from '../../core/http.js';
import { Package, Payment, Ledger, RefundRequest, PAYMENT_STATUS } from '../billing/billing.models.js';
import { approvePayment, rejectPayment, decideRefund } from '../billing/payments.service.js';
import { adjustConnections } from '../billing/connections.service.js';
import { notify } from '../support/notify.service.js';
import { audit } from '../audit/audit.js';
import { USER_BRIEF, toCsv } from './common.js';

const r = createRouter({ prefix: '/admin', tag: 'Admin · money', defaults: { role: 'admin' } });

const paymentQuery = z
  .object({
    status: z.enum(PAYMENT_STATUS).optional(),
    method: z.enum(values(PAYMENT_METHODS)).optional(),
    q: z.string().trim().max(40).optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .passthrough();

function paymentFilter(q) {
  const f = {};
  if (q.status) f.status = q.status;
  if (q.method) f.method = q.method;
  if (q.q) {
    const phone = normalizeBdPhone(q.q);
    f.$or = [{ trxId: q.q.toUpperCase() }, ...(phone ? [{ senderNumber: phone }] : [])];
  }
  if (q.from || q.to) {
    f.createdAt = {};
    if (q.from) f.createdAt.$gte = new Date(`${q.from}T00:00:00+06:00`);
    if (q.to) f.createdAt.$lte = new Date(`${q.to}T23:59:59.999+06:00`);
  }
  return f;
}

r.get(
  '/payments',
  { summary: 'Payments (filter by status, method, TrxID/sender, date range)', query: paymentQuery },
  async (req, res) => {
    const { page, limit, skip } = paging(req.query, 25);
    const f = paymentFilter(req.valid.query);
    const [items, total] = await Promise.all([
      Payment.find(f)
        .sort({ createdAt: req.valid.query.status === 'pending' ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', USER_BRIEF)
        .populate('package', 'name')
        .populate('reviewedBy', 'name')
        .lean(),
      Payment.countDocuments(f),
    ]);
    res.json({ items, ...pageMeta(total, page, limit) });
  }
);

r.get(
  '/payments/export',
  { summary: 'Download payments as CSV (same filters, max 10,000 rows)', query: paymentQuery },
  async (req, res) => {
    const rows = await Payment.find(paymentFilter(req.valid.query))
      .sort({ createdAt: -1 })
      .limit(10000)
      .populate('user', 'name phone email')
      .populate('reviewedBy', 'name')
      .lean();
    const csv = toCsv(
      [
        { label: 'Date', value: (p) => p.createdAt },
        { label: 'User', value: (p) => p.user?.name },
        { label: 'User phone', value: (p) => p.user?.phone },
        { label: 'User email', value: (p) => p.user?.email },
        { label: 'Method', value: (p) => p.method },
        { label: 'Gateway', value: (p) => p.gateway },
        { label: 'Sender', value: (p) => p.senderNumber },
        { label: 'TrxID', value: (p) => p.trxId },
        { label: 'Amount (BDT)', value: (p) => p.amount },
        { label: 'Connections', value: (p) => p.connections },
        { label: 'Status', value: (p) => p.status },
        { label: 'Reviewed by', value: (p) => p.reviewedBy?.name },
        { label: 'Reviewed at', value: (p) => p.reviewedAt },
        { label: 'Note', value: (p) => p.note },
      ],
      rows
    );
    await audit(req.user._id, 'payment.export', 'Payment', undefined, { rows: rows.length, filter: req.valid.query });
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set(
      'Content-Disposition',
      `attachment; filename="ghotok-payments-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(csv);
  }
);

r.post(
  '/payments/:id/approve',
  {
    summary: 'Approve a payment and credit its connections',
    body: z.object({ note: z.string().trim().max(300).optional() }),
  },
  async (req, res) => {
    const p = await approvePayment(req.params.id, req.user._id, req.valid.body.note);
    if (!p) throw badRequest('PAYMENT_NOT_PENDING');
    await audit(req.user._id, 'payment.approve', 'Payment', p._id, { amount: p.amount, trxId: p.trxId });
    res.json({ status: p.status });
  }
);

r.post(
  '/payments/:id/reject',
  { summary: 'Reject a payment (reason required)', body: z.object({ note: z.string().trim().min(3).max(300) }) },
  async (req, res) => {
    const p = await rejectPayment(req.params.id, req.user._id, req.valid.body.note);
    if (!p) throw badRequest('PAYMENT_NOT_PENDING');
    await audit(req.user._id, 'payment.reject', 'Payment', p._id, { note: p.note, trxId: p.trxId });
    res.json({ status: p.status });
  }
);

// ---------- Refunds ----------
r.get(
  '/refunds',
  { summary: 'Refund requests', query: z.object({ status: z.enum(['pending', 'approved', 'rejected']).optional() }) },
  async (req, res) => {
    const items = await RefundRequest.find({ status: req.valid.query.status || 'pending' })
      .sort({ createdAt: 1 })
      .limit(100)
      .populate('user', USER_BRIEF)
      .populate('biodata', 'biodataNo type')
      .populate('report', 'reason details status')
      .lean();
    res.json({ items });
  }
);

r.post(
  '/refunds/:id',
  {
    summary: 'Approve (returns the connection) or reject a refund request',
    body: z.object({ decision: z.enum(['approved', 'rejected']), resolution: z.string().trim().max(500).optional() }),
  },
  async (req, res) => {
    const { decision, resolution } = req.valid.body;
    const rr = await decideRefund(req.params.id, req.user._id, { approve: decision === 'approved', resolution });
    await audit(req.user._id, `refund.${decision}`, 'RefundRequest', rr._id, { resolution });
    res.json({ status: rr.status });
  }
);

// ---------- Manual connection changes ----------
r.post(
  '/users/:id/connections',
  {
    summary: 'Grant, revoke or refund connections by hand (reason is audited)',
    body: z.object({
      action: z.enum(['grant', 'revoke', 'refund']),
      amount: z.coerce.number().int().min(1).max(100),
      reason: z.string().trim().min(3).max(300),
    }),
  },
  async (req, res) => {
    const { action, amount, reason } = req.valid.body;
    const delta = action === 'revoke' ? -amount : amount;
    const type = { grant: 'admin_grant', revoke: 'admin_revoke', refund: 'refund' }[action];
    const balance = await adjustConnections(req.params.id, delta, type, { note: reason, actor: req.user._id });
    await notify(req.params.id, 'connections_adjusted', '/dashboard/connections');
    await audit(req.user._id, `connections.${action}`, 'User', req.params.id, { amount, reason, balance });
    res.json({ connections: balance });
  }
);

r.get('/users/:id/ledger', { summary: 'A user’s connection ledger', role: 'support' }, async (req, res) => {
  const items = await Ledger.find({ user: req.params.id })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('actor', 'name')
    .lean();
  res.json({ items });
});

// ---------- Packages ----------
const packageBody = z.object({
  nameEn: z.string().trim().min(2).max(60),
  nameBn: z.string().trim().min(2).max(60),
  connections: z.coerce.number().int().min(1).max(100),
  price: z.coerce.number().int().min(0).max(100000),
  active: z.boolean().default(true),
  highlight: z.boolean().default(false),
  sort: z.coerce.number().int().default(0),
});
const packageDoc = (d) => ({
  name: { en: d.nameEn, bn: d.nameBn },
  connections: d.connections,
  price: d.price,
  active: d.active,
  highlight: d.highlight,
  sort: d.sort,
});

r.get('/packages', { summary: 'All packages, including inactive' }, async (_req, res) => {
  res.json({ items: await Package.find().sort({ sort: 1, price: 1 }).lean() });
});

r.post('/packages', { summary: 'Create a package', role: 'superadmin', body: packageBody }, async (req, res) => {
  const p = await Package.create(packageDoc(req.valid.body));
  await audit(req.user._id, 'package.create', 'Package', p._id, req.valid.body);
  res.status(201).json({ package: p });
});

r.put('/packages/:id', { summary: 'Update a package', role: 'superadmin', body: packageBody }, async (req, res) => {
  const p = await Package.findByIdAndUpdate(req.params.id, packageDoc(req.valid.body), {
    new: true,
    runValidators: true,
  });
  if (!p) throw notFound();
  await audit(req.user._id, 'package.update', 'Package', p._id, req.valid.body);
  res.json({ package: p });
});

export default r.router;

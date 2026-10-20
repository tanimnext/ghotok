/**
 * Buying connections (manual TrxID or bKash checkout) and the user's money history.
 * See docs/adr/0003-connection-ledger.md.
 */
import { z } from 'zod';
import { values, PAYMENT_METHODS, normalizeWalletNumber } from '@ghotok/shared';
import { createRouter } from '../../core/router.js';
import { paging, pageMeta, notFound, badRequest, conflict, validationError } from '../../core/http.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { Package, Payment, Ledger, Unlock, RefundRequest } from './billing.models.js';
import { approvePayment } from './payments.service.js';
import { bkashEnabled, createPayment, executePayment } from './bkash.service.js';
import { getSettings } from '../content/settings.service.js';

const r = createRouter({ tag: 'Connections & payments' });

const MAX_PENDING_PAYMENTS = 3;
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'invalid');

r.get('/packages', { summary: 'Active connection packages and how to pay' }, async (_req, res) => {
  const [items, settings] = await Promise.all([
    Package.find({ active: true }).sort({ sort: 1, price: 1 }).lean(),
    getSettings(),
  ]);
  res.json({
    items,
    payment: {
      manual: values(PAYMENT_METHODS)
        .map((method) => ({ method, number: settings.paymentNumbers[method] || null }))
        .filter((m) => m.number),
      bkashApi: bkashEnabled(),
    },
  });
});

r.post(
  '/payments/manual',
  {
    summary: 'Submit a manual payment (send money, then the transaction ID) for verification',
    auth: 'required',
    body: z.object({
      packageId: objectId,
      method: z.enum(values(PAYMENT_METHODS)),
      senderNumber: z.string().trim().min(1),
      trxId: z
        .string()
        .trim()
        .min(6)
        .max(40)
        .regex(/^[A-Za-z0-9]+$/),
    }),
  },
  async (req, res) => {
    const d = req.valid.body;
    const senderNumber = normalizeWalletNumber(d.method, d.senderNumber);
    if (!senderNumber) throw validationError({ senderNumber: 'invalid_phone' });
    const pkg = await Package.findOne({ _id: d.packageId, active: true });
    if (!pkg) throw notFound();
    const trxId = d.trxId.toUpperCase();
    if (await Payment.exists({ method: d.method, trxId })) throw conflict('TRX_USED', { trxId: 'invalid' });
    if ((await Payment.countDocuments({ user: req.user._id, status: 'pending' })) >= MAX_PENDING_PAYMENTS)
      throw badRequest('TOO_MANY_PENDING');
    const p = await Payment.create({
      user: req.user._id,
      package: pkg._id,
      connections: pkg.connections,
      amount: pkg.price,
      method: d.method,
      gateway: 'manual',
      senderNumber,
      trxId,
      status: 'pending',
    });
    res.status(201).json({ payment: p });
  }
);

r.post(
  '/payments/bkash/create',
  {
    summary: 'Start a bKash checkout (when the bKash API is enabled)',
    auth: 'required',
    body: z.object({ packageId: objectId }),
  },
  async (req, res) => {
    if (!bkashEnabled()) throw badRequest('BKASH_DISABLED');
    const pkg = await Package.findOne({ _id: req.valid.body.packageId, active: true });
    if (!pkg) throw notFound();
    const p = await Payment.create({
      user: req.user._id,
      package: pkg._id,
      connections: pkg.connections,
      amount: pkg.price,
      method: 'bkash',
      gateway: 'bkash_api',
      status: 'initiated',
    });
    const out = await createPayment({
      amount: pkg.price,
      invoice: String(p._id),
      payerReference: req.user.phone || String(req.user._id).slice(-8),
      callbackURL: `${env.apiPublicUrl}/api/payments/bkash/callback`,
    });
    p.gatewayPaymentId = out.paymentID;
    await p.save();
    res.json({ bkashURL: out.bkashURL });
  }
);

r.get(
  '/payments/bkash/callback',
  {
    summary: 'bKash redirects the browser here after checkout',
    query: z.object({ paymentID: z.string().optional(), status: z.string().optional() }).passthrough(),
  },
  async (req, res) => {
    const { paymentID, status } = req.valid.query;
    const back = (s) => res.redirect(`${env.webUrl}/dashboard/connections?payment=${s}`);
    const p = paymentID ? await Payment.findOne({ gatewayPaymentId: paymentID, gateway: 'bkash_api' }) : null;
    if (!p) return back('failed');
    if (p.status === 'approved') return back('success');
    if (status !== 'success') {
      p.status = status === 'cancel' ? 'cancelled' : 'failed';
      await p.save();
      return back(p.status);
    }
    try {
      const out = await executePayment(paymentID);
      p.gatewayRaw = out.raw;
      if (out.completed && out.amount >= p.amount) {
        p.trxId = out.trxID;
        await p.save();
        await approvePayment(p._id, undefined, 'Paid via bKash checkout');
        return back('success');
      }
      p.status = 'failed';
      await p.save();
      return back('failed');
    } catch (err) {
      logger.error({ err, paymentId: p._id }, 'bKash execute failed');
      p.status = 'failed';
      await p.save();
      return back('failed');
    }
  }
);

// ---------- The user's history ----------
r.get('/me/ledger', { summary: 'My connection usage and purchase history', auth: 'required' }, async (req, res) => {
  const { page, limit, skip } = paging(req.query, 20);
  const filter = { user: req.user._id };
  const [items, total] = await Promise.all([
    Ledger.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Ledger.countDocuments(filter),
  ]);
  res.json({ items, balance: req.user.connections, ...pageMeta(total, page, limit) });
});

r.get('/me/payments', { summary: 'My payments', auth: 'required' }, async (req, res) => {
  const { page, limit, skip } = paging(req.query, 20);
  const filter = { user: req.user._id };
  const [items, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('package', 'name connections').lean(),
    Payment.countDocuments(filter),
  ]);
  res.json({ items, ...pageMeta(total, page, limit) });
});

r.get('/me/refunds', { summary: 'My refund requests', auth: 'required' }, async (req, res) => {
  const items = await RefundRequest.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('biodata', 'biodataNo')
    .lean();
  res.json({ items });
});

r.post(
  '/me/refunds',
  {
    summary: 'Ask for a spent connection back (e.g. wrong number)',
    auth: 'required',
    body: z.object({
      unlockId: objectId,
      reason: z.string().trim().min(3).max(200),
      details: z.string().trim().max(2000).optional(),
    }),
  },
  async (req, res) => {
    const d = req.valid.body;
    const unlock = await Unlock.findOne({ _id: d.unlockId, user: req.user._id });
    if (!unlock) throw notFound();
    if (unlock.source !== 'connection' || unlock.refunded) throw badRequest('REFUND_NOT_ELIGIBLE');
    if (await RefundRequest.exists({ unlock: unlock._id, status: 'pending' })) throw conflict('REFUND_PENDING');
    const refund = await RefundRequest.create({
      user: req.user._id,
      unlock: unlock._id,
      biodata: unlock.biodata,
      reason: d.reason,
      details: d.details,
    });
    res.status(201).json({ refund });
  }
);

export default r.router;

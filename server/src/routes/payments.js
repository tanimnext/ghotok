import { Router } from 'express';
import { z } from 'zod';
import { Package, Payment } from '../models/commerce.js';
import { requireAuth } from '../middleware/auth.js';
import { adjustConnections } from '../services/connections.js';
import { notify } from '../services/notify.js';
import { bkashEnabled, createPayment, executePayment } from '../services/bkash.js';
import { ah, parse, notFound, badRequest, conflict } from '../utils/http.js';
import { normalizeBdPhone } from '../utils/phone.js';
import { env } from '../config/env.js';
import { values, PAYMENT_METHODS } from '../constants.js';

const r = Router();

// GET /api/packages — active packages + how to pay
r.get(
  '/packages',
  ah(async (_req, res) => {
    const items = await Package.find({ active: true }).sort({ sort: 1, price: 1 }).lean();
    res.json({
      items,
      payment: {
        manual: PAYMENT_METHODS.map((m) => ({ method: m.value, number: env.manualPaymentNumbers[m.value] || null })).filter((m) => m.number),
        bkashApi: Boolean(bkashEnabled()),
      },
    });
  })
);

/** Credit a payment exactly once (status flips pending/initiated → approved). */
export async function approvePayment(paymentId, actorId, note) {
  const p = await Payment.findOneAndUpdate(
    { _id: paymentId, status: { $in: ['pending', 'initiated'] } },
    { status: 'approved', reviewedBy: actorId, reviewedAt: new Date(), note },
    { new: true }
  );
  if (!p) return null;
  await adjustConnections(p.user, p.connections, 'purchase', { ref: p._id, refModel: 'Payment', note: `${p.connections} connections · ৳${p.amount}`, actor: actorId });
  await notify(p.user, 'payment_approved', '/dashboard/connections');
  return p;
}

const manualSchema = z.object({
  packageId: z.string(),
  method: z.enum(values(PAYMENT_METHODS)),
  senderNumber: z.string().trim(),
  trxId: z.string().trim().min(6, 'Enter the transaction ID').max(40).regex(/^[A-Za-z0-9]+$/, 'Letters and numbers only'),
});

// POST /api/payments/manual — user sent money and submits the TrxID for review
r.post(
  '/payments/manual',
  requireAuth,
  ah(async (req, res) => {
    const d = parse(manualSchema, req.body);
    const sender = normalizeBdPhone(d.senderNumber);
    if (!sender) throw badRequest('Please check the highlighted fields', { senderNumber: 'Enter the mobile number you paid from' });
    const pkg = await Package.findOne({ _id: d.packageId, active: true });
    if (!pkg) throw notFound('Package not found');
    const trxId = d.trxId.toUpperCase();
    if (await Payment.exists({ method: d.method, trxId })) throw conflict('This transaction ID has already been submitted');
    const pending = await Payment.countDocuments({ user: req.user._id, status: 'pending' });
    if (pending >= 3) throw badRequest('You already have payments waiting for verification');
    const p = await Payment.create({
      user: req.user._id, package: pkg._id, connections: pkg.connections, amount: pkg.price,
      method: d.method, gateway: 'manual', senderNumber: sender, trxId, status: 'pending',
    });
    res.status(201).json({ payment: p });
  })
);

// POST /api/payments/bkash/create — start a bKash checkout (when API is enabled)
r.post(
  '/payments/bkash/create',
  requireAuth,
  ah(async (req, res) => {
    if (!bkashEnabled()) throw badRequest('Online bKash payment is not available right now');
    const { packageId } = parse(z.object({ packageId: z.string() }), req.body);
    const pkg = await Package.findOne({ _id: packageId, active: true });
    if (!pkg) throw notFound('Package not found');
    const p = await Payment.create({
      user: req.user._id, package: pkg._id, connections: pkg.connections, amount: pkg.price,
      method: 'bkash', gateway: 'bkash_api', status: 'initiated',
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
  })
);

// GET /api/payments/bkash/callback — bKash redirects the browser here
r.get(
  '/payments/bkash/callback',
  ah(async (req, res) => {
    const { paymentID, status } = req.query;
    const back = (s) => res.redirect(`${env.webUrl}/dashboard/connections?payment=${s}`);
    const p = paymentID ? await Payment.findOne({ gatewayPaymentId: String(paymentID), gateway: 'bkash_api' }) : null;
    if (!p) return back('failed');
    if (p.status === 'approved') return back('success');
    if (status !== 'success') {
      p.status = status === 'cancel' ? 'cancelled' : 'failed';
      await p.save();
      return back(p.status);
    }
    try {
      const out = await executePayment(String(paymentID));
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
    } catch (e) {
      console.error('bKash execute failed', e);
      p.status = 'failed';
      await p.save();
      return back('failed');
    }
  })
);

export default r;

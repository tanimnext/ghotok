import { Payment, RefundRequest, Unlock } from './billing.models.js';
import { adjustConnections } from './connections.service.js';
import { notify } from '../support/notify.service.js';
import { badRequest, notFound } from '../../core/http.js';

/**
 * Approve a payment and credit its connections exactly once. The status flip is
 * atomic, so approving twice (two admins, or a bKash retry) credits only once.
 * @returns the approved payment, or null if it was not pending.
 */
export async function approvePayment(paymentId, actorId, note) {
  const p = await Payment.findOneAndUpdate(
    { _id: paymentId, status: { $in: ['pending', 'initiated'] } },
    { status: 'approved', reviewedBy: actorId, reviewedAt: new Date(), note },
    { new: true }
  );
  if (!p) return null;
  await adjustConnections(p.user, p.connections, 'purchase', {
    ref: p._id,
    refModel: 'Payment',
    note: `${p.connections} × connection · ৳${p.amount}`,
    actor: actorId,
  });
  await notify(p.user, 'payment_approved', '/dashboard/connections');
  return p;
}

export async function rejectPayment(paymentId, actorId, note) {
  const p = await Payment.findOneAndUpdate(
    { _id: paymentId, status: { $in: ['pending', 'initiated'] } },
    { status: 'rejected', reviewedBy: actorId, reviewedAt: new Date(), note },
    { new: true }
  );
  if (!p) return null;
  await notify(p.user, 'payment_rejected', '/dashboard/connections');
  return p;
}

/** Approve or reject a pending refund request. Approval returns the connection to the user. */
export async function decideRefund(refundId, actorId, { approve, resolution }) {
  const rr = await RefundRequest.findById(refundId);
  if (!rr) throw notFound();
  if (rr.status !== 'pending') throw badRequest('REFUND_NOT_PENDING');
  const flipped = await RefundRequest.findOneAndUpdate(
    { _id: rr._id, status: 'pending' },
    { status: approve ? 'approved' : 'rejected', resolution, reviewedBy: actorId, reviewedAt: new Date() },
    { new: true }
  );
  if (!flipped) throw badRequest('REFUND_NOT_PENDING');
  if (approve) {
    if (flipped.unlock) await Unlock.updateOne({ _id: flipped.unlock }, { refunded: true });
    await adjustConnections(flipped.user, flipped.connections || 1, 'refund', {
      ref: flipped._id,
      refModel: 'RefundRequest',
      note: resolution,
      actor: actorId,
    });
  }
  await notify(flipped.user, approve ? 'refund_approved' : 'refund_rejected', '/dashboard/connections');
  return flipped;
}

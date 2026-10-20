import mongoose from 'mongoose';
import { values, PAYMENT_METHODS } from '../constants.js';

const { Schema } = mongoose;
const ref = (model, required = false) => ({ type: Schema.Types.ObjectId, ref: model, required });

const packageSchema = new Schema(
  {
    name: { en: { type: String, required: true }, bn: { type: String, required: true } },
    connections: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true },
    highlight: { type: Boolean, default: false },
    sort: { type: Number, default: 0 },
  },
  { timestamps: true }
);
export const Package = mongoose.model('Package', packageSchema);

export const PAYMENT_STATUS = ['initiated', 'pending', 'approved', 'rejected', 'failed', 'cancelled'];
const paymentSchema = new Schema(
  {
    user: ref('User', true),
    package: ref('Package', true),
    connections: { type: Number, required: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: values(PAYMENT_METHODS), required: true },
    gateway: { type: String, enum: ['manual', 'bkash_api'], default: 'manual' },
    senderNumber: String,
    trxId: { type: String, uppercase: true, trim: true },
    status: { type: String, enum: PAYMENT_STATUS, default: 'pending', index: true },
    note: String,
    reviewedBy: ref('User'),
    reviewedAt: Date,
    gatewayPaymentId: String,
    gatewayRaw: { type: Schema.Types.Mixed, select: false },
  },
  { timestamps: true }
);
paymentSchema.index({ method: 1, trxId: 1 }, { unique: true, partialFilterExpression: { trxId: { $type: 'string' } } });
paymentSchema.index({ user: 1, createdAt: -1 });
export const Payment = mongoose.model('Payment', paymentSchema);

export const LEDGER_TYPES = ['purchase', 'unlock', 'admin_grant', 'admin_revoke', 'refund', 'signup_bonus'];
const ledgerSchema = new Schema(
  {
    user: ref('User', true),
    delta: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    type: { type: String, enum: LEDGER_TYPES, required: true },
    refModel: String,
    ref: Schema.Types.ObjectId,
    note: String,
    actor: ref('User'),
  },
  { timestamps: true }
);
ledgerSchema.index({ user: 1, createdAt: -1 });
export const Ledger = mongoose.model('Ledger', ledgerSchema);

const unlockSchema = new Schema(
  {
    user: ref('User', true),
    biodata: ref('Biodata', true),
    cost: { type: Number, default: 1 },
    source: { type: String, enum: ['connection', 'proposal', 'admin'], default: 'connection' },
    refunded: { type: Boolean, default: false },
  },
  { timestamps: true }
);
unlockSchema.index({ user: 1, biodata: 1 }, { unique: true });
export const Unlock = mongoose.model('Unlock', unlockSchema);

const refundSchema = new Schema(
  {
    user: ref('User', true),
    unlock: ref('Unlock'),
    biodata: ref('Biodata'),
    report: ref('Report'),
    reason: { type: String, required: true },
    details: String,
    connections: { type: Number, default: 1 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    resolution: String,
    reviewedBy: ref('User'),
    reviewedAt: Date,
  },
  { timestamps: true }
);
export const RefundRequest = mongoose.model('RefundRequest', refundSchema);

import mongoose from 'mongoose';
import { values, REPORT_REASONS } from '../constants.js';

const { Schema } = mongoose;
const ref = (model, required = false) => ({ type: Schema.Types.ObjectId, ref: model, required });

const reportSchema = new Schema(
  {
    reporter: ref('User', true),
    biodata: ref('Biodata', true),
    reason: { type: String, enum: values(REPORT_REASONS), required: true },
    details: { type: String, maxlength: 2000 },
    requestRefund: { type: Boolean, default: false },
    status: { type: String, enum: ['open', 'reviewing', 'resolved', 'dismissed'], default: 'open', index: true },
    action: String,
    resolvedBy: ref('User'),
    resolvedAt: Date,
  },
  { timestamps: true }
);
export const Report = mongoose.model('Report', reportSchema);

const ticketMessage = new Schema(
  { author: ref('User', true), staff: { type: Boolean, default: false }, body: { type: String, required: true, maxlength: 4000 } },
  { timestamps: true }
);
const ticketSchema = new Schema(
  {
    user: ref('User', true),
    subject: { type: String, required: true, maxlength: 160 },
    category: { type: String, enum: ['account', 'biodata', 'payment', 'report', 'other'], default: 'other' },
    status: { type: String, enum: ['open', 'answered', 'closed'], default: 'open', index: true },
    messages: { type: [ticketMessage], default: [] },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
export const Ticket = mongoose.model('Ticket', ticketSchema);

const notificationSchema = new Schema(
  {
    user: ref('User', true),
    type: String,
    title: { en: String, bn: String },
    body: { en: String, bn: String },
    link: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);
notificationSchema.index({ user: 1, createdAt: -1 });
export const Notification = mongoose.model('Notification', notificationSchema);

const auditSchema = new Schema(
  {
    actor: ref('User', true),
    action: { type: String, required: true },
    targetType: String,
    targetId: Schema.Types.ObjectId,
    meta: Schema.Types.Mixed,
  },
  { timestamps: true }
);
auditSchema.index({ createdAt: -1 });
export const AuditLog = mongoose.model('AuditLog', auditSchema);

const counterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });
export const Counter = mongoose.model('Counter', counterSchema);

export async function nextSeq(name, start = 1000) {
  const c = await Counter.findOneAndUpdate({ _id: name }, [{ $set: { seq: { $add: [{ $ifNull: ['$seq', start] }, 1] } } }], {
    new: true,
    upsert: true,
  });
  return c.seq;
}

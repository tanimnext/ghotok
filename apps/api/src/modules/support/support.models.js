import mongoose from 'mongoose';
import { values, REPORT_REASONS, TICKET_CATEGORIES } from '@ghotok/shared';

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
    priority: { type: String, enum: ['normal', 'urgent'], default: 'normal' },
    action: String,
    resolvedBy: ref('User'),
    resolvedAt: Date,
  },
  { timestamps: true }
);
export const Report = mongoose.model('Report', reportSchema);

const ticketMessage = new Schema(
  {
    author: ref('User', true),
    staff: { type: Boolean, default: false },
    body: { type: String, required: true, maxlength: 4000 },
  },
  { timestamps: true }
);
const ticketSchema = new Schema(
  {
    user: ref('User', true),
    subject: { type: String, required: true, maxlength: 160 },
    category: { type: String, enum: values(TICKET_CATEGORIES), default: 'other' },
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

/** Messages from the public contact form (no account needed). */
const contactSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 80 },
    email: { type: String, required: true, maxlength: 120 },
    phone: { type: String, maxlength: 20 },
    subject: { type: String, required: true, maxlength: 160 },
    message: { type: String, required: true, maxlength: 4000 },
    user: ref('User'),
    status: { type: String, enum: ['new', 'replied', 'closed'], default: 'new', index: true },
    reply: String,
    repliedBy: ref('User'),
    repliedAt: Date,
    ip: String,
  },
  { timestamps: true }
);
export const ContactMessage = mongoose.model('ContactMessage', contactSchema);

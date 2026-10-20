import mongoose from 'mongoose';

const { Schema } = mongoose;
const L = { en: String, bn: String };

/**
 * Site settings edited by a super admin. A single document with _id "site".
 * Payment numbers fall back to environment variables when empty.
 */
const settingSchema = new Schema(
  {
    _id: { type: String, default: 'site' },
    paymentNumbers: { bkash: String, nagad: String, rocket: String },
    supportEmail: String,
    supportPhone: String,
    officeAddress: L,
    tradeLicense: String,
    social: { facebook: String, youtube: String, instagram: String, whatsapp: String, messenger: String },
    chatLink: String,
    announcement: { en: String, bn: String, active: { type: Boolean, default: false } },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
export const Setting = mongoose.model('Setting', settingSchema);

/** Downloadable files shown on the public Resources page (e.g. printable wedding banners). */
const resourceSchema = new Schema(
  {
    title: { en: { type: String, required: true }, bn: { type: String, required: true } },
    description: L,
    fileKey: { type: String, required: true },
    fileName: String,
    mime: String,
    size: Number,
    previewKey: String,
    published: { type: Boolean, default: true },
    sort: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
  },
  { timestamps: true }
);
export const Resource = mongoose.model('Resource', resourceSchema);

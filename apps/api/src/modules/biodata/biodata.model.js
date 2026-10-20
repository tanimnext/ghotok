/**
 * Biodata model. The data sections are generated from the shared schema
 * (@ghotok/shared SECTIONS), so adding a field there adds it here.
 */
import mongoose from 'mongoose';
import { SECTIONS, LISTS, values, ageFromDob, biodataCode, publicFields, isActive } from '@ghotok/shared';

const { Schema } = mongoose;

function fieldDef(f) {
  switch (f.type) {
    case 'text':
    case 'textarea':
    case 'email':
    case 'phone':
      return { type: String, maxlength: f.max || 200 };
    case 'number':
    case 'height':
      return { type: Number, min: f.min, max: f.max };
    case 'yesno':
    case 'check':
      return Boolean;
    case 'date':
      return Date;
    case 'select':
      return { type: String, enum: values(LISTS[f.options]) };
    case 'multiselect':
      return { type: [{ type: String, enum: values(LISTS[f.options]) }], default: undefined };
    case 'entries':
      return {
        type: [new Schema(Object.fromEntries(f.itemFields.map((x) => [x.key, fieldDef(x)])), { _id: false })],
        default: undefined,
      };
    default:
      throw new Error(`Unknown field type ${f.type}`);
  }
}

const dataSections = Object.fromEntries(
  SECTIONS.map((s) => [
    s.key,
    new Schema(Object.fromEntries(s.fields.map((f) => [f.key, fieldDef(f)])), { _id: false }),
  ])
);

export const BIODATA_STATUS = ['draft', 'pending', 'approved', 'rejected', 'changes_requested'];

const biodataSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    biodataNo: { type: Number, unique: true, sparse: true },
    type: { type: String, enum: ['groom', 'bride'], required: true },

    status: { type: String, enum: BIODATA_STATUS, default: 'draft', index: true },
    reviewNote: String,
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    submittedAt: Date,
    approvedAt: Date,
    termsAcceptedAt: Date,

    hidden: { type: Boolean, default: false },
    hiddenReason: String,

    deletedAt: { type: Date, default: null, index: true },
    deleteReason: String,
    deleteNote: String,
    recovery: {
      status: { type: String, enum: ['none', 'pending', 'approved', 'declined'], default: 'none' },
      note: String,
      requestedAt: Date,
      decidedAt: Date,
      decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },

    nid: {
      fileKey: String,
      status: { type: String, enum: ['none', 'submitted', 'verified', 'rejected'], default: 'none' },
      note: String,
      verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      verifiedAt: Date,
    },
    photoKey: String,

    // Denormalised from the owner so search can filter and badges render without a join.
    verification: { phone: { type: Boolean, default: false }, email: { type: Boolean, default: false } },

    ...dataSections,

    stats: { views: { type: Number, default: 0 }, favorites: { type: Number, default: 0 } },
  },
  { timestamps: true }
);

biodataSchema.index({ status: 1, hidden: 1, deletedAt: 1, type: 1, approvedAt: -1 });
biodataSchema.index({ 'general.dateOfBirth': 1 });
biodataSchema.index({ 'general.religion': 1 });
biodataSchema.index({ 'address.permanentDistrict': 1, 'address.permanentUpazila': 1 });
biodataSchema.index({ 'address.presentDistrict': 1 });

biodataSchema.methods.isPublic = function isPublic() {
  return this.status === 'approved' && !this.hidden && !this.deletedAt;
};

export const Biodata = mongoose.model('Biodata', biodataSchema);

/** Filter for biodatas anyone may see. */
export const PUBLIC_FILTER = { status: 'approved', hidden: false, deletedAt: null };

const plain = (b) => (typeof b?.toObject === 'function' ? b.toObject() : { ...b });

/** Public shape: only public, active fields; age and birth month instead of the date of birth. */
export function toPublic(doc) {
  const b = plain(doc);
  const out = {
    _id: b._id,
    code: biodataCode(b.biodataNo),
    biodataNo: b.biodataNo,
    type: b.type,
    approvedAt: b.approvedAt,
    nidVerified: b.nid?.status === 'verified',
    phoneVerified: Boolean(b.verification?.phone),
    emailVerified: Boolean(b.verification?.email),
    hasPhoto: Boolean(b.photoKey),
    stats: { views: b.stats?.views || 0 },
  };
  for (const s of publicFields(b)) {
    const src = b[s.key] || {};
    const sec = {};
    for (const f of s.fields) if (src[f.key] !== undefined && src[f.key] !== null) sec[f.key] = src[f.key];
    out[s.key] = sec;
  }
  const dob = b.general?.dateOfBirth;
  out.general.age = ageFromDob(dob);
  out.general.birthMonth = dob ? new Date(dob).toISOString().slice(0, 7) : null;
  return out;
}

/** Owner / staff shape: everything except internal storage keys. */
export function toOwner(doc) {
  const b = plain(doc);
  const { photoKey, __v, ...rest } = b;
  return {
    ...rest,
    code: biodataCode(b.biodataNo),
    hasPhoto: Boolean(photoKey),
    nid: { status: b.nid?.status || 'none', note: b.nid?.note, uploaded: Boolean(b.nid?.fileKey) },
  };
}

/** Compact card for result lists. */
export function toCard(doc) {
  const b = plain(doc);
  return {
    _id: b._id,
    code: biodataCode(b.biodataNo),
    biodataNo: b.biodataNo,
    type: b.type,
    age: ageFromDob(b.general?.dateOfBirth),
    maritalStatus: b.general?.maritalStatus,
    religion: b.general?.religion,
    heightInches: b.general?.heightInches,
    complexion: b.general?.complexion,
    permanentDistrict: b.address?.permanentDistrict,
    permanentUpazila: b.address?.permanentUpazila,
    presentDistrict: b.address?.presentDistrict,
    livesAbroad: Boolean(b.address?.livesAbroad),
    presentCountry: b.address?.presentCountry,
    highestLevel: b.education?.highestLevel,
    occupation: b.occupation?.type,
    occupationTitle: b.occupation?.title,
    nidVerified: b.nid?.status === 'verified',
    approvedAt: b.approvedAt,
  };
}

/** The private contact block (only for owner, staff and unlocked viewers). */
export const contactOf = (b) => {
  const c = b?.contact || {};
  return {
    candidateName: c.candidateName,
    guardianName: c.guardianName,
    guardianRelation: c.guardianRelation,
    guardianPhone: c.guardianPhone,
    guardianPhone2: c.guardianPhone2,
    email: c.email,
  };
};

export { isActive };
